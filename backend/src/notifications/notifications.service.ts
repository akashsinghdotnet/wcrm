import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    /**
     * Send a WhatsApp message via Twilio.
     * If Twilio credentials are not configured, logs a message and skips.
     */
    async sendWhatsApp(message: string): Promise<void> {
        const sid = process.env.TWILIO_SID;
        const auth = process.env.TWILIO_AUTH;
        const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
        const to = process.env.ADMIN_WHATSAPP;         // e.g. "whatsapp:+919876543210"

        if (!sid || !auth || !from || !to) {
            this.logger.warn(
                '⚠️  Twilio not configured — skipping WhatsApp notification. ' +
                'Set TWILIO_SID, TWILIO_AUTH, TWILIO_WHATSAPP_FROM, ADMIN_WHATSAPP in .env',
            );
            this.logger.log(`📱 [WOULD SEND WhatsApp]: ${message}`);
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const twilio = require('twilio');
            const client = twilio(sid, auth);
            await client.messages.create({
                body: message,
                from,
                to,
            });
            this.logger.log(`✅ WhatsApp sent to ${to}`);
        } catch (error) {
            this.logger.error(`❌ WhatsApp failed: ${error.message}`);
        }
    }

    /**
     * Build a lead notification message
     */
    formatLeadMessage(lead: {
        name: string;
        phone?: string;
        email?: string;
        source: string;
    }): string {
        return (
            `🧲 *New Lead — MagnetCRM*\n\n` +
            `👤 Name: ${lead.name}\n` +
            `📞 Phone: ${lead.phone || 'N/A'}\n` +
            `📧 Email: ${lead.email || 'N/A'}\n` +
            `📍 Source: ${lead.source}\n` +
            `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
        );
    }
}
