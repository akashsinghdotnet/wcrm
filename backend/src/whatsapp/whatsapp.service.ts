import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppConfig } from './whatsapp-config.entity';
import { WhatsAppMessage, MessageDirection, MessageStatus } from './whatsapp-message.entity';
import { SaveWhatsAppConfigDto } from './dto/save-config.dto';
import { Lead, LeadSource, LeadStatus } from '../leads/lead.entity';
import { Activity, ActivityType } from '../leads/activity.entity';
import { LeadsService } from '../leads/leads.service';

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
        @Inject(forwardRef(() => LeadsService))
        private leadsService: LeadsService,
    ) { }

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
        message: string | undefined,
        type: string = 'text',
        mediaId?: string,
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
            const payload: any = {
                messaging_product: 'whatsapp',
                to: phone,
                type: type,
            };

            if (type === 'text') {
                payload.text = { body: message || '' };
            } else if (type === 'image') {
                payload.image = { id: mediaId, caption: message || '' };
            } else if (type === 'document') {
                payload.document = { id: mediaId, caption: message || '' };
            }

            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
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
                    ? `WhatsApp message failed to send${message ? `: "${message}"` : ' (Media)'}`
                    : `WhatsApp message sent${message ? `: "${message}"` : ' (Media)'}`,
            });
            await this.activityRepo.save(activity);
        } catch (err) {
            this.logger.warn(`Failed to log WhatsApp activity: ${err.message}`);
        }

        return msg;
    }

    async uploadMedia(companyId: string, file: any): Promise<any> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            throw new BadRequestException('WhatsApp Business API is not configured');
        }

        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('file', blob, file.originalname);
        formData.append('messaging_product', 'whatsapp');

        try {
            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.phoneNumberId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                    },
                    body: formData,
                },
            );

            const data = await response.json();
            if (!response.ok) {
                this.logger.error(`Media upload error: ${JSON.stringify(data)}`);
                throw new BadRequestException('Failed to upload media to WhatsApp');
            }
            return { mediaId: data.id };
        } catch (error) {
            this.logger.error(`Media upload failed: ${error.message}`);
            throw new BadRequestException('Failed to upload media');
        }
    }

    async getGlobalUnreadCount(companyId: string): Promise<{ count: number }> {
        const count = await this.messageRepo.count({
            where: {
                companyId,
                direction: MessageDirection.INBOUND,
                status: MessageStatus.DELIVERED,
            },
        });
        return { count };
    }

    async getMessages(companyId: string, leadId: string): Promise<WhatsAppMessage[]> {
        return this.messageRepo.find({
            where: { companyId, leadId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
        });
    }

    async markMessagesAsRead(companyId: string, leadId: string): Promise<{ updated: number }> {
        const result = await this.messageRepo.update(
            { companyId, leadId, direction: MessageDirection.INBOUND, status: MessageStatus.DELIVERED },
            { status: MessageStatus.READ },
        );
        return { updated: result.affected || 0 };
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

        // Extract contact info from webhook payload
        const contacts = value.contacts || [];
        const phoneNumberId = value.metadata?.phone_number_id;

        for (const msg of value.messages) {
            const fromPhone = msg.from;
            const text = msg.text?.body || '';
            const waMessageId = msg.id;

            // Check if this message came from a WhatsApp Ad (Click-to-WhatsApp ad)
            const referral = msg.referral;
            const isFromAd = !!referral;

            // Find lead by phone number
            let lead = await this.leadRepo
                .createQueryBuilder('lead')
                .where("REPLACE(REPLACE(REPLACE(lead.phone, '+', ''), '-', ''), ' ', '') LIKE :phone", {
                    phone: `%${fromPhone.slice(-10)}`,
                })
                .getOne();

            // If no lead found and message came from a WhatsApp Ad, auto-create a lead
            if (!lead && isFromAd) {
                // Find which company this WhatsApp number belongs to
                const whatsappConfig = await this.configRepo.findOne({
                    where: { phoneNumberId },
                });

                if (whatsappConfig) {
                    const contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name || 'Unknown (WhatsApp Ad)';
                    const assignedTo = await this.leadsService.getNextAssignee(whatsappConfig.companyId, 'meta_ads');

                    const adNotes = [
                        referral.source_url ? `Ad URL: ${referral.source_url}` : null,
                        referral.headline ? `Ad Headline: ${referral.headline}` : null,
                        referral.body ? `Ad Body: ${referral.body}` : null,
                        referral.source_type ? `Source: ${referral.source_type}` : null,
                        text ? `First Message: ${text}` : null,
                    ].filter(Boolean).join(', ');

                    lead = await this.leadsService.create({
                        companyId: whatsappConfig.companyId,
                        name: contactName,
                        phone: `+${fromPhone}`,
                        source: LeadSource.META_ADS,
                        status: LeadStatus.NEW,
                        assignedTo: assignedTo || undefined,
                        notes: adNotes || undefined,
                    });

                    this.logger.log(`Auto-created lead from WhatsApp Ad: ${contactName} (${fromPhone}) for company ${whatsappConfig.companyId}`);
                } else {
                    this.logger.warn(`Incoming WhatsApp Ad message from ${fromPhone} — no matching WhatsApp config for phoneNumberId ${phoneNumberId}`);
                    continue;
                }
            }

            // If no lead found and NOT from ad, also try to auto-create if we can identify the company
            if (!lead && !isFromAd) {
                const whatsappConfig = await this.configRepo.findOne({
                    where: { phoneNumberId },
                });

                if (whatsappConfig) {
                    const contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name || 'Unknown (WhatsApp)';
                    const assignedTo = await this.leadsService.getNextAssignee(whatsappConfig.companyId, 'whatsapp');

                    lead = await this.leadsService.create({
                        companyId: whatsappConfig.companyId,
                        name: contactName,
                        phone: `+${fromPhone}`,
                        source: LeadSource.MANUAL,
                        status: LeadStatus.NEW,
                        assignedTo: assignedTo || undefined,
                        notes: text ? `First Message: ${text}` : undefined,
                    });

                    this.logger.log(`Auto-created lead from WhatsApp message: ${contactName} (${fromPhone}) for company ${whatsappConfig.companyId}`);
                } else {
                    this.logger.warn(`Incoming WhatsApp from ${fromPhone} — no matching lead or config found`);
                    continue;
                }
            }

            if (!lead) continue;

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
                content: isFromAd
                    ? `New lead from WhatsApp Ad: "${text}"`
                    : `Incoming WhatsApp message: "${text}"`,
            });
            await this.activityRepo.save(activity);
        }
    }

    /**
     * Send a WhatsApp template message to a phone number.
     * Templates are pre-approved message formats in Meta Business.
     */
    async sendTemplate(
        companyId: string,
        leadId: string,
        to: string,
        templateName: string,
        languageCode: string,
        variables?: string[],
    ): Promise<WhatsAppMessage> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            throw new BadRequestException('WhatsApp Business API is not configured for this company');
        }

        const phone = this.formatPhone(to);

        const payload: any = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
            },
        };

        // Add variable parameters if provided
        if (variables && variables.length > 0) {
            payload.template.components = [
                {
                    type: 'body',
                    parameters: variables.map(v => ({ type: 'text', text: v })),
                },
            ];
        }

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
                    body: JSON.stringify(payload),
                },
            );

            const data = await response.json();

            if (!response.ok) {
                this.logger.error(`WhatsApp template send error: ${JSON.stringify(data)}`);
                status = MessageStatus.FAILED;
            } else {
                whatsappMessageId = data.messages?.[0]?.id || null;
                this.logger.log(`Template "${templateName}" sent to ${phone} for lead ${leadId}`);
            }
        } catch (error) {
            this.logger.error(`WhatsApp template send failed: ${error.message}`);
            status = MessageStatus.FAILED;
        }

        // Save message record
        const msg = this.messageRepo.create({
            companyId,
            leadId,
            direction: MessageDirection.OUTBOUND,
            content: `[Template: ${templateName}]${variables?.length ? ' Variables: ' + variables.join(', ') : ''}`,
            status,
            whatsappMessageId: whatsappMessageId || undefined,
        });
        await this.messageRepo.save(msg);

        // Log activity
        try {
            const activity = this.activityRepo.create({
                leadId,
                type: ActivityType.WHATSAPP,
                content: status === MessageStatus.FAILED
                    ? `Auto-reply template "${templateName}" failed to send`
                    : `Auto-reply template "${templateName}" sent`,
            });
            await this.activityRepo.save(activity);
        } catch { }

        return msg;
    }

    /**
     * Fetch approved message templates from Meta Business API.
     */
    async fetchTemplates(companyId: string): Promise<any[]> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            throw new BadRequestException('WhatsApp Business API is not configured');
        }
        if (!config.businessAccountId) {
            throw new BadRequestException('Business Account ID is required to fetch templates. Please add it in WhatsApp settings.');
        }

        try {
            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.businessAccountId}/message_templates?status=APPROVED&limit=100`,
                {
                    headers: { 'Authorization': `Bearer ${config.accessToken}` },
                },
            );

            const data = await response.json();

            if (!response.ok) {
                this.logger.error(`Meta templates API error: ${JSON.stringify(data)}`);
                throw new BadRequestException(data.error?.message || 'Failed to fetch templates from Meta');
            }

            // Return simplified template data
            return (data.data || []).map((t: any) => ({
                name: t.name,
                language: t.language,
                status: t.status,
                category: t.category,
                components: t.components,
            }));
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(`Failed to fetch templates: ${error.message}`);
            throw new BadRequestException('Failed to fetch templates from Meta');
        }
    }

    /**
     * Save auto-reply settings for a company.
     */
    async saveAutoReplySettings(companyId: string, settings: {
        autoReplyEnabled: boolean;
        autoReplyTemplateName?: string;
        autoReplyTemplateLanguage?: string;
        autoReplyVariableMapping?: Record<string, string>;
        autoReplyDelaySec?: number;
    }): Promise<WhatsAppConfig> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            throw new BadRequestException('WhatsApp Business API is not configured');
        }

        config.autoReplyEnabled = settings.autoReplyEnabled;
        if (settings.autoReplyTemplateName !== undefined) config.autoReplyTemplateName = settings.autoReplyTemplateName;
        if (settings.autoReplyTemplateLanguage !== undefined) config.autoReplyTemplateLanguage = settings.autoReplyTemplateLanguage;
        if (settings.autoReplyVariableMapping !== undefined) config.autoReplyVariableMapping = settings.autoReplyVariableMapping;
        if (settings.autoReplyDelaySec !== undefined) config.autoReplyDelaySec = settings.autoReplyDelaySec;

        return this.configRepo.save(config);
    }

    /**
     * Trigger auto-reply for a newly created lead (called from LeadsService).
     */
    async triggerAutoReply(companyId: string, leadId: string, leadPhone: string, leadName: string) {
        try {
            const config = await this.configRepo.findOne({ where: { companyId } });
            if (!config || !config.autoReplyEnabled || !config.autoReplyTemplateName) {
                return;
            }

            if (!leadPhone) {
                this.logger.warn(`Auto-reply skipped for lead ${leadId}: no phone number`);
                return;
            }

            const delaySec = config.autoReplyDelaySec || 0;

            const sendFn = async () => {
                // Build variables from mapping
                const variables: string[] = [];
                if (config.autoReplyVariableMapping) {
                    const mapping = config.autoReplyVariableMapping;
                    // Sort by key (1, 2, 3...) to maintain order
                    const sortedKeys = Object.keys(mapping).sort((a, b) => Number(a) - Number(b));
                    for (const key of sortedKeys) {
                        const field = mapping[key];
                        if (field === 'lead_name') variables.push(leadName || 'there');
                        else if (field === 'company_name') variables.push('our team');
                        else variables.push(field); // static text
                    }
                }

                await this.sendTemplate(
                    companyId,
                    leadId,
                    leadPhone,
                    config.autoReplyTemplateName,
                    config.autoReplyTemplateLanguage || 'en',
                    variables.length > 0 ? variables : undefined,
                );
            };

            if (delaySec > 0) {
                setTimeout(sendFn, delaySec * 1000);
            } else {
                // Fire and forget
                sendFn().catch(err => this.logger.error(`Auto-reply failed for lead ${leadId}: ${err.message}`));
            }
        } catch (err) {
            this.logger.error(`Auto-reply trigger error for lead ${leadId}: ${err.message}`);
        }
    }

    private formatPhone(phone: string): string {
        const digits = phone.replace(/[^0-9]/g, '');
        // If 10 digits, assume Indian number
        if (digits.length === 10) return `91${digits}`;
        return digits;
    }
}
