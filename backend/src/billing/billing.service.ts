import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InvoiceSettings } from './invoice-settings.entity';
import { Company } from '../companies/company.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class BillingService {
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepo: Repository<Invoice>,
        @InjectRepository(InvoiceSettings)
        private invoiceSettingsRepo: Repository<InvoiceSettings>,
        @InjectRepository(Company)
        private companyRepo: Repository<Company>,
    ) { }

    async create(dto: CreateInvoiceDto): Promise<Invoice> {
        let invoiceNumber = dto.invoiceNumber;

        // Auto-generate invoice number if missing
        if (!invoiceNumber) {
            const settings = await this.getSettings(dto.companyId);
            const prefix = settings?.prefix || 'INV-';
            const count = await this.invoiceRepo.count({
                where: { companyId: dto.companyId, isSystem: false }
            });
            // Example: INV-0001
            invoiceNumber = `${prefix}${(count + 1).toString().padStart(4, '0')}`;
        }

        const invoice = this.invoiceRepo.create({ ...dto, invoiceNumber });
        return this.invoiceRepo.save(invoice);
    }

    async createSystemInvoice(data: any) {
        // Generate invoice number if not provided
        let invoiceNumber = data.invoiceNumber;
        if (!invoiceNumber) {
            const count = await this.invoiceRepo.count({
                where: { isSystem: true }
            });
            invoiceNumber = `SYS-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
        }

        return this.invoiceRepo.save({
            ...data,
            invoiceNumber,
            isSystem: true,
            status: data.status || 'pending',
            items: data.items || [],
        });
    }

    findAll(companyId?: string, status?: string, clientId?: string): Promise<Invoice[]> {
        const qb = this.invoiceRepo.createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.client', 'client')
            .orderBy('invoice.createdAt', 'DESC');

        if (companyId) {
            qb.andWhere('invoice.companyId = :companyId', { companyId });
        }
        if (status) {
            qb.andWhere('invoice.status = :status', { status });
        }
        if (clientId) {
            qb.andWhere('invoice.clientId = :clientId', { clientId });
        }

        return qb.getMany();
    }

    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id },
            relations: ['client', 'targetCompany'],
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    async update(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
        const invoice = await this.findOne(id);
        Object.assign(invoice, dto);
        return this.invoiceRepo.save(invoice);
    }

    async markPaid(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);
        invoice.status = InvoiceStatus.PAID;
        invoice.paidDate = new Date();
        return this.invoiceRepo.save(invoice);
    }

    async remove(id: string): Promise<void> {
        // Check if ID is a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            // If not a UUID (e.g. 'sub-xxx'), we can't delete it from DB anyway
            throw new NotFoundException('Invalid invoice ID');
        }

        const invoice = await this.invoiceRepo.findOne({ where: { id } });
        if (!invoice) throw new NotFoundException('Invoice not found');

        await this.invoiceRepo.remove(invoice);
    }

    async revenueByMonth(companyId: string): Promise<{ month: string; total: number }[]> {
        const result = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .select('invoice.month', 'month')
            .addSelect('SUM(invoice.amount)', 'total')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
            .groupBy('invoice.month')
            .getRawMany();

        return result.map((r) => ({ month: r.month, total: Number(r.total) }));
    }

    async totalPending(companyId: string): Promise<number> {
        const result = await this.invoiceRepo
            .createQueryBuilder('invoice')
            .select('SUM(invoice.amount)', 'total')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.status = :status', { status: InvoiceStatus.PENDING })
            .getRawOne();

        return Number(result?.total || 0);
    }

    async billingStats(companyId: string): Promise<{ totalPaid: number; totalPending: number }> {
        const [paid, pending] = await Promise.all([
            this.invoiceRepo
                .createQueryBuilder('invoice')
                .select('SUM(invoice.amount)', 'total')
                .where('invoice.companyId = :companyId', { companyId })
                .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
                .getRawOne(),
            this.invoiceRepo
                .createQueryBuilder('invoice')
                .select('SUM(invoice.amount)', 'total')
                .where('invoice.companyId = :companyId', { companyId })
                .andWhere('invoice.status = :status', { status: InvoiceStatus.PENDING })
                .getRawOne(),
        ]);
        return {
            totalPaid: Number(paid?.total || 0),
            totalPending: Number(pending?.total || 0),
        };
    }

    async getSubscriptionHistory(companyId: string): Promise<any[]> {
        const globalHistory = await this.getGlobalBillingHistory();
        return globalHistory.filter(inv => inv.companyId === companyId);
    }

    async getGlobalBillingHistory(): Promise<any[]> {
        // 1. Get virtual subscription invoices
        const companies = await this.companyRepo.find({
            relations: ['plan'],
            order: { createdAt: 'ASC' }
        });

        // Fetch super admin invoice settings for branding and prefix
        const superAdminSettings = await this.invoiceSettingsRepo.findOne({ where: { companyId: null as any } });
        const brandName = superAdminSettings?.accountHolderName || 'CRM Subscription';
        const rawPrefix = superAdminSettings?.prefix || 'INV-0000';
        const trailingZeros = rawPrefix.match(/0+$/);
        const padLength = trailingZeros ? trailingZeros[0].length + 1 : 4;
        const basePrefix = trailingZeros ? rawPrefix.replace(/0+$/, '') : rawPrefix;

        let allInvoices: any[] = [];
        const now = new Date();
        let globalCounter = 0;

        for (const company of companies) {
            if (!company.plan) continue;

            const startDate = new Date(company.createdAt);
            const price = company.subscriptionPeriod === 'yearly' ? company.plan.priceYearly : company.plan.priceMonthly;
            let currentDate = new Date(startDate);
            let counter = 1;
            const isPending = company.subscriptionStatus === 'pending_payment';

            while (currentDate <= now || counter === 1) {
                const invoiceStatus = (counter === 1 && isPending) ? 'pending' : 'paid';
                globalCounter++;

                allInvoices.push({
                    id: `sub-${company.id}-${counter}`,
                    companyId: company.id,
                    companyName: company.companyName,
                    planName: company.plan.name,
                    date: new Date(currentDate),
                    amount: price,
                    description: `MagnetCRM ${company.plan.name} (${company.subscriptionPeriod})`,
                    period: company.subscriptionPeriod === 'yearly'
                        ? `${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`
                        : currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                    status: invoiceStatus,
                    invoiceNumber: `${basePrefix}${globalCounter.toString().padStart(padLength, '0')}`,
                });

                if (company.subscriptionPeriod === 'yearly') {
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                } else {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                if (currentDate > now && counter >= 1) break;
                counter++;
            }
        }

        // 2. Get real system invoices
        const systemInvoices = await this.invoiceRepo.find({
            where: { isSystem: true },
            relations: ['targetCompany'],
            order: { invoiceDate: 'DESC' }
        });

        const realInvoices = systemInvoices.map(inv => ({
            id: inv.id,
            companyId: inv.targetCompanyId,
            companyName: inv.targetCompany?.companyName || 'Unknown',
            planName: 'Manual Invoice',
            date: inv.invoiceDate || inv.createdAt,
            amount: inv.amount,
            description: Array.isArray(inv.items) && inv.items.length > 0 ? inv.items[0].description : 'System Invoice',
            period: inv.month || 'N/A',
            status: inv.status,
            invoiceNumber: inv.invoiceNumber,
            isManual: true,
            original: inv,
            items: inv.items,
            subtotal: inv.subtotal,
            tax: inv.tax
        }));

        // 3. Merge and Sort
        const all = [...allInvoices, ...realInvoices];
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    async getSettings(companyId: string): Promise<InvoiceSettings> {
        const where = companyId === 'super-admin' ? { companyId: null as any } : { companyId };
        let settings = await this.invoiceSettingsRepo.findOne({ where });
        if (!settings) {
            settings = this.invoiceSettingsRepo.create({ companyId: companyId === 'super-admin' ? undefined : companyId });
            await this.invoiceSettingsRepo.save(settings);
        }
        return settings;
    }

    async upsertSettings(companyId: string, data: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
        const where = companyId === 'super-admin' ? { companyId: null as any } : { companyId };
        let settings = await this.invoiceSettingsRepo.findOne({ where });
        if (settings) {
            Object.assign(settings, data);
        } else {
            settings = this.invoiceSettingsRepo.create({ ...data, companyId: companyId === 'super-admin' ? undefined : companyId });
        }
        return this.invoiceSettingsRepo.save(settings);
    }
}
