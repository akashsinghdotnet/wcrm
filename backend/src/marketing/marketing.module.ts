import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingSettings } from './marketing-settings.entity';
import { EmailLog } from '../email/email-log.entity';
import { UsersModule } from '../users/users.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MarketingSettings, EmailLog]),
        UsersModule,
        LeadsModule,
    ],
    controllers: [MarketingController],
    providers: [MarketingService],
    exports: [MarketingService],
})
export class MarketingModule { }
