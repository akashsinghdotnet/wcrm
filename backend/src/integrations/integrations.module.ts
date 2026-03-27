import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConfig } from './integration-config.entity';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { EmailParserService } from './email-parser.service';
import { LeadsModule } from '../leads/leads.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([IntegrationConfig]),
        forwardRef(() => LeadsModule),
        forwardRef(() => NotificationsModule),
    ],
    controllers: [IntegrationsController],
    providers: [IntegrationsService, EmailParserService],
    exports: [IntegrationsService, EmailParserService],
})
export class IntegrationsModule { }
