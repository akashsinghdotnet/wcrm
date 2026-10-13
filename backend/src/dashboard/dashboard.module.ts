import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { LeadsModule } from '../leads/leads.module';
import { ClientsModule } from '../clients/clients.module';
import { BillingModule } from '../billing/billing.module';

import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [LeadsModule, ClientsModule, BillingModule, CompaniesModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
