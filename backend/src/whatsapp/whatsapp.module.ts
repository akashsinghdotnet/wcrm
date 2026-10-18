import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppConfig } from './whatsapp-config.entity';
import { WhatsAppMessage } from './whatsapp-message.entity';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { Lead } from '../leads/lead.entity';
import { Activity } from '../leads/activity.entity';
import { LeadsModule } from '../leads/leads.module';
import { WhatsAppContact } from './entities/whatsapp-contact.entity';
import { WhatsAppList } from './entities/whatsapp-list.entity';
import { WhatsAppTag } from './entities/whatsapp-tag.entity';
import { WhatsAppTemplate } from './entities/whatsapp-template.entity';
import { WhatsAppBroadcast } from './entities/whatsapp-broadcast.entity';
import { WhatsAppBroadcastLog } from './entities/whatsapp-broadcast-log.entity';
import { WhatsAppCRMService } from './whatsapp-crm.service';
import { WhatsAppCRMController } from './whatsapp-crm.controller';
import { CompanySetting } from '../company-settings/company-setting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            WhatsAppConfig,
            WhatsAppMessage,
            Lead,
            Activity,
            WhatsAppContact,
            WhatsAppList,
            WhatsAppTag,
            WhatsAppTemplate,
            WhatsAppBroadcast,
            WhatsAppBroadcastLog,
            CompanySetting,
        ]),
        forwardRef(() => LeadsModule),
    ],
    controllers: [WhatsAppController, WhatsAppCRMController],
    providers: [WhatsAppService, WhatsAppCRMService],
    exports: [WhatsAppService, WhatsAppCRMService],
})
export class WhatsAppModule {}
