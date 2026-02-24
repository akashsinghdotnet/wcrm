import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
    imports: [LeadsModule], // Uses LeadsService for creating leads + round-robin
    controllers: [WebhooksController, PaymentWebhooksController],
})
export class WebhooksModule { }
