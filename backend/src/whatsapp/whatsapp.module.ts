import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppConfig } from './whatsapp-config.entity';
import { WhatsAppMessage } from './whatsapp-message.entity';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { Lead } from '../leads/lead.entity';
import { Activity } from '../leads/activity.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([WhatsAppConfig, WhatsAppMessage, Lead, Activity]),
    ],
    controllers: [WhatsAppController],
    providers: [WhatsAppService],
    exports: [WhatsAppService],
})
export class WhatsAppModule {}
