import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InvoiceSettings } from './invoice-settings.entity';
import { Company } from '../companies/company.entity';

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

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkSubscriptionExpirations() {
        const now = new Date();
        const expiredCompanies = await this.companyRepo
            .createQueryBuilder('c')
            .where('c.subscriptionStatus = :status', { status: 'active' })
            .andWhere('c.renewalDate IS NOT NULL AND c.renewalDate < :now', { now })
            .getMany();

        for (const company of expiredCompanies) {
            company.subscriptionStatus = 'past_due';
            await this.companyRepo.save(company);
            console.log(`[BillingService] Company subscription expired: ${company.companyName} (${company.id}) -> set to past_due`);
        }
    }

    async createSystemInvoice(data: any) {
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
            status: data.status || 'paid',
            items: data.items || [],
        });
    }

    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id },
            relations: ['targetCompany'],
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        return invoice;
    }

    async remove(id: string): Promise<void> {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            throw new NotFoundException('Invalid invoice ID');
        }

        const invoice = await this.invoiceRepo.findOne({ where: { id } });
        if (!invoice) throw new NotFoundException('Invoice not found');

        await this.invoiceRepo.remove(invoice);
    }

    async revenueByMonth(companyId: string): Promise<{ month: string; total: number }[]> {
        return [];
    }

    async totalPending(companyId: string): Promise<number> {
        return 0;
    }

    async billingStats(companyId: string): Promise<{ totalPaid: number; totalPending: number }> {
        return { totalPaid: 0, totalPending: 0 };
    }

    async getSubscriptionHistory(companyId: string): Promise<any[]> {
        const globalHistory = await this.getGlobalBillingHistory();
        return globalHistory.filter(inv => inv.companyId === companyId);
    }

    async getGlobalBillingHistory(): Promise<any[]> {
        const systemInvoices = await this.invoiceRepo.find({
            where: { isSystem: true },
            relations: ['targetCompany'],
            order: { invoiceDate: 'DESC' }
        });

        const realInvoices = systemInvoices.map(inv => ({
            id: inv.id,
            companyId: inv.targetCompanyId,
            companyName: inv.targetCompany?.companyName || 'Unknown',
            planName: 'System Invoice',
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

        return realInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
