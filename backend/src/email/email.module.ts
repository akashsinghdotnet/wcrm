import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailConfig } from './email-config.entity';
import { EmailLog } from './email-log.entity';
import { MarketingSettings } from '../marketing/marketing-settings.entity';

import { EmailService } from './email.service';
import { EmailController } from './email.controller';

@Module({
    imports: [TypeOrmModule.forFeature([EmailConfig, EmailLog, MarketingSettings])],
    providers: [EmailService],
    controllers: [EmailController],
    exports: [EmailService],
})

export class EmailModule { }
