import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceSettings } from './invoice-settings.entity';
import { Company } from '../companies/company.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [TypeOrmModule.forFeature([Invoice, InvoiceSettings, Company]), UsersModule],
    controllers: [BillingController],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule { }
