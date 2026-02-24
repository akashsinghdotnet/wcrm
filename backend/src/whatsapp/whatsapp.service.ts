import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppConfig } from './whatsapp-config.entity';
import { WhatsAppMessage, MessageDirection, MessageStatus } from './whatsapp-message.entity';
import { SaveWhatsAppConfigDto } from './dto/save-config.dto';
import { Lead } from '../leads/lead.entity';
import { Activity, ActivityType } from '../leads/activity.entity';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);

    constructor(
        @InjectRepository(WhatsAppConfig)
        private configRepo: Repository<WhatsAppConfig>,
        @InjectRepository(WhatsAppMessage)
        private messageRepo: Repository<WhatsAppMessage>,
        @InjectRepository(Lead)
        private leadRepo: Repository<Lead>,
        @InjectRepository(Activity)
        private activityRepo: Repository<Activity>,
    ) {}

    async getConfig(companyId: string): Promise<WhatsAppConfig | null> {
        return this.configRepo.findOne({ where: { companyId } });
    }

    async saveConfig(dto: SaveWhatsAppConfigDto): Promise<WhatsAppConfig> {
        let config = await this.configRepo.findOne({ where: { companyId: dto.companyId } });

        if (config) {
            config.phoneNumberId = dto.phoneNumberId;
            config.accessToken = dto.accessToken;
            if (dto.businessAccountId !== undefined) config.businessAccountId = dto.businessAccountId;
        } else {
            config = this.configRepo.create(dto);
        }

        return this.configRepo.save(config);
    }

    async sendMessage(
        companyId: string,
        leadId: string,
        to: string,
        message: string,
        userId?: string,
    ): Promise<WhatsAppMessage> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            throw new BadRequestException('WhatsApp Business API is not configured for this company');
        }

        // Format phone number - ensure it has country code
        const phone = this.formatPhone(to);

        // Send via WhatsApp Cloud API
        let whatsappMessageId: string | null = null;
        let status = MessageStatus.SENT;

        try {
            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to: phone,
                        type: 'text',
                        text: { body: message },
                    }),
                },
            );

            const data = await response.json();

            if (!response.ok) {
                this.logger.error(`WhatsApp API error: ${JSON.stringify(data)}`);
                status = MessageStatus.FAILED;
            } else {
                whatsappMessageId = data.messages?.[0]?.id || null;
            }
        } catch (error) {
            this.logger.error(`WhatsApp API request failed: ${error.message}`);
            status = MessageStatus.FAILED;
        }

        // Save message to DB regardless of status
        const msg = this.messageRepo.create({
            companyId,
            leadId,
            direction: MessageDirection.OUTBOUND,
            content: message,
            status,
            whatsappMessageId: whatsappMessageId || undefined,
            sentBy: userId,
        });
        await this.messageRepo.save(msg);

        // Log activity on lead
        try {
            const activity = this.activityRepo.create({
                leadId,
                userId,
                type: ActivityType.WHATSAPP,
                content: status === MessageStatus.FAILED
                    ? `WhatsApp message failed to send: "${message}"`
                    : `WhatsApp message sent: "${message}"`,
            });
            await this.activityRepo.save(activity);
        } catch (err) {
            this.logger.warn(`Failed to log WhatsApp activity: ${err.message}`);
        }

        return msg;
    }

    async getMessages(companyId: string, leadId: string): Promise<WhatsAppMessage[]> {
        return this.messageRepo.find({
            where: { companyId, leadId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
        });
    }

    async getConversations(companyId: string) {
        // Get all leads that have WhatsApp messages, with last message info
        const conversations = await this.messageRepo
            .createQueryBuilder('msg')
            .select('msg.leadId', 'leadId')
            .addSelect('MAX(msg.createdAt)', 'lastMessageAt')
            .addSelect('COUNT(msg.id)', 'messageCount')
            .where('msg.companyId = :companyId', { companyId })
            .groupBy('msg.leadId')
            .orderBy('"lastMessageAt"', 'DESC')
            .getRawMany();

        // Fetch lead details and last message for each
        const result: any[] = [];
        for (const conv of conversations) {
            const lead = await this.leadRepo.findOne({ where: { id: conv.leadId } });
            if (!lead) continue;

            const lastMessage = await this.messageRepo.findOne({
                where: { companyId, leadId: conv.leadId },
                order: { createdAt: 'DESC' },
            });

            const unreadCount = await this.messageRepo.count({
                where: { companyId, leadId: conv.leadId, direction: MessageDirection.INBOUND, status: MessageStatus.DELIVERED },
            });

            result.push({
                lead: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, status: lead.status },
                lastMessage: lastMessage ? { content: lastMessage.content, direction: lastMessage.direction, createdAt: lastMessage.createdAt } : null,
                messageCount: parseInt(conv.messageCount),
                unreadCount,
            });
        }

        return result;
    }

    async handleIncomingWebhook(body: any): Promise<void> {
        // Handle Meta webhook verification and incoming messages
        const entry = body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.length) return;

        for (const msg of value.messages) {
            const fromPhone = msg.from;
            const text = msg.text?.body || '';
            const waMessageId = msg.id;

            // Find lead by phone number
            const lead = await this.leadRepo
                .createQueryBuilder('lead')
                .where("REPLACE(REPLACE(REPLACE(lead.phone, '+', ''), '-', ''), ' ', '') LIKE :phone", {
                    phone: `%${fromPhone.slice(-10)}`,
                })
                .getOne();

            if (!lead) {
                this.logger.warn(`Incoming WhatsApp from ${fromPhone} — no matching lead found`);
                continue;
            }

            const message = this.messageRepo.create({
                companyId: lead.companyId,
                leadId: lead.id,
                direction: MessageDirection.INBOUND,
                content: text,
                status: MessageStatus.DELIVERED,
                whatsappMessageId: waMessageId,
            });
            await this.messageRepo.save(message);

            // Log activity
            const activity = this.activityRepo.create({
                leadId: lead.id,
                type: ActivityType.WHATSAPP,
                content: `Incoming WhatsApp message: "${text}"`,
            });
            await this.activityRepo.save(activity);
        }
    }

    private formatPhone(phone: string): string {
        const digits = phone.replace(/[^0-9]/g, '');
        // If 10 digits, assume Indian number
        if (digits.length === 10) return `91${digits}`;
        return digits;
    }
}
