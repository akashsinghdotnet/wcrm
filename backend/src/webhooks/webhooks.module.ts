import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { LeadsModule } from '../leads/leads.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
    imports: [
        LeadsModule,
        forwardRef(() => IntegrationsModule),
    ],
    controllers: [WebhooksController],
})
export class WebhooksModule { }
