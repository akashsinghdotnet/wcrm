import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Invoice } from './billing/invoice.entity';
import { Company } from './companies/company.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const invoiceRepo = app.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    const companyRepo = app.get<Repository<Company>>(getRepositoryToken(Company));

    // 1. Delete previous faulty migration invoices
    const allSystemInvoices = await invoiceRepo.find({ where: { isSystem: true } });
    let deletedCount = 0;
    for (const inv of allSystemInvoices) {
        // Just delete all 0 amount system invoices to be safe and clean the slate
        if (inv.amount === 0 || inv.subtotal === 0 || Number(inv.amount) === 0) {
            await invoiceRepo.remove(inv);
            deletedCount++;
        }
    }
    console.log(`Deleted ${deletedCount} 0-amount system invoices.`);
    
    // 2. Generate correct $0 invoices
    const companies = await companyRepo.find({ relations: ['plan'] });
    let generatedCount = 0;

    for (const company of companies) {
        if (!company.plan) continue;

        const existingInvoices = await invoiceRepo.find({ 
            where: { isSystem: true, targetCompanyId: company.id } 
        });

        if (existingInvoices.length === 0) {
            const startDate = new Date(company.createdAt || new Date());
            startDate.setHours(0,0,0,0);
            const endDate = company.renewalDate ? new Date(company.renewalDate) : new Date();
            endDate.setHours(0,0,0,0);
            
            const originalPrice = company.subscriptionPeriod === 'yearly' ? Number(company.plan.priceYearly) : Number(company.plan.priceMonthly);
            
            let currentDate = new Date(startDate);
            let counter = 1;

            while (currentDate < endDate) {
                const invoiceDate = new Date(currentDate);
                
                const count = await invoiceRepo.count({ where: { isSystem: true } });
                const invoiceNumber = `SYS-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

                await invoiceRepo.save({
                    targetCompanyId: company.id,
                    invoiceNumber,
                    isSystem: true,
                    amount: 0,
                    subtotal: 0,
                    tax: 0,
                    invoiceDate: invoiceDate,
                    dueDate: invoiceDate,
                    month: invoiceDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                    status: 'paid',
                    items: [
                        {
                            description: `Magnet CRM ${company.plan.name} Plan (${company.subscriptionPeriod})`,
                            quantity: 1,
                            rate: originalPrice,
                            amount: originalPrice,
                        },
                        {
                            description: '100% Discount Applied',
                            quantity: 1,
                            rate: -originalPrice,
                            amount: -originalPrice,
                        }
                    ],
                });
                generatedCount++;

                if (company.subscriptionPeriod === 'yearly') {
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                } else {
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }
                counter++;
                if (counter > 120) break; // safety limit
            }
        }
    }
    
    console.log(`Generated ${generatedCount} invoices.`);
    await app.close();
}

bootstrap();
