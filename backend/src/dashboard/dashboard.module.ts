import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
    imports: [LeadsModule],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
