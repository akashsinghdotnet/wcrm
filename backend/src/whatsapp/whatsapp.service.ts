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
        this.logger.log(`[WhatsApp] Attempting to send message to ${to} for lead ${leadId} (company: ${companyId})`);

        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            this.logger.error(`[WhatsApp] No config found for company ${companyId}`);
            throw new BadRequestException('WhatsApp Business API is not configured for this company');
        }

        this.logger.log(`[WhatsApp] Found config - Phone Number ID: ${config.phoneNumberId.substring(0, 8)}...`);

        // Format phone number - ensure it has country code
        const phone = this.formatPhone(to);
        this.logger.log(`[WhatsApp] Formatted phone: ${phone} (original: ${to})`);

        // Send via WhatsApp Cloud API
        let whatsappMessageId: string | null = null;
        let status = MessageStatus.SENT;
        let errorDetail: string | null = null;

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

            this.logger.log(`[WhatsApp] Sending ${type} message. Payload: ${JSON.stringify(payload).substring(0, 200)}`);

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
            this.logger.log(`[WhatsApp] API Response Status: ${response.status}, Data: ${JSON.stringify(data)}`);

            if (!response.ok) {
                errorDetail = data.error?.message || JSON.stringify(data);
                this.logger.error(`[WhatsApp] API error (${response.status}): ${errorDetail}`);
                this.logger.error(`[WhatsApp] Full error response: ${JSON.stringify(data)}`);
                status = MessageStatus.FAILED;
            } else {
                whatsappMessageId = data.messages?.[0]?.id || null;
                this.logger.log(`[WhatsApp] Message sent successfully! WhatsApp Message ID: ${whatsappMessageId}`);
            }
        } catch (error) {
            errorDetail = error.message;
            this.logger.error(`[WhatsApp] API request failed with exception: ${error.message}`);
            this.logger.error(`[WhatsApp] Error stack: ${error.stack}`);
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
            errorDetail: errorDetail || undefined,
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
        this.logger.log(`[WhatsApp Webhook] Received webhook payload: ${JSON.stringify(body).substring(0, 500)}`);

        const entry = body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages?.length) {
            this.logger.log(`[WhatsApp Webhook] No messages in payload, skipping`);
            return;
        }

        const contacts = value.contacts || [];
        const phoneNumberId = value.metadata?.phone_number_id;

        this.logger.log(`[WhatsApp Webhook] Processing ${value.messages.length} message(s) from Phone Number ID: ${phoneNumberId}`);

        // ── Resolve company FIRST from phoneNumberId ──────────────────────────
        // This MUST happen before any lead lookup to ensure strict company isolation.
        // All lead searches are scoped to this company only.
        const whatsappConfig = await this.configRepo.findOne({ where: { phoneNumberId } });
        if (!whatsappConfig) {
            this.logger.error(`[WhatsApp Webhook] CRITICAL: No WhatsApp config found for phoneNumberId ${phoneNumberId}. Dropping all messages in this webhook.`);
            this.logger.error(`[WhatsApp Webhook] Please verify that phoneNumberId ${phoneNumberId} is configured in CRM Settings → Integrations → WhatsApp`);
            return;
        }
        const companyId = whatsappConfig.companyId;
        this.logger.log(`[WhatsApp Webhook] Resolved company: ${companyId} for phoneNumberId: ${phoneNumberId}`);
        // ──────────────────────────────────────────────────────────────────────

        for (const msg of value.messages) {
            const fromPhone = msg.from;
            const text = msg.text?.body || '';
            const waMessageId = msg.id;

            this.logger.log(`[WhatsApp Webhook] Processing message from ${fromPhone}: "${text.substring(0, 50)}"`);

            const referral = msg.referral;
            const isFromAd = !!referral;

            // ── Find lead by phone — SCOPED TO THIS COMPANY ONLY ──────────────
            let lead = await this.leadRepo
                .createQueryBuilder('lead')
                .where('lead.companyId = :companyId', { companyId })
                .andWhere("REPLACE(REPLACE(REPLACE(lead.phone, '+', ''), '-', ''), ' ', '') LIKE :phone", {
                    phone: `%${fromPhone.slice(-10)}`,
                })
                .getOne();
            // ──────────────────────────────────────────────────────────────────

            if (lead) {
                this.logger.log(`[WhatsApp Webhook] Found existing lead: ${lead.name} (ID: ${lead.id}) in company ${companyId}`);
            } else {
                this.logger.warn(`[WhatsApp Webhook] No existing lead found for phone ${fromPhone} in company ${companyId}`);
            }

            // Auto-create lead if not found
            if (!lead) {
                const contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name || 'Unknown';
                const source = isFromAd ? LeadSource.META_ADS : LeadSource.WHATSAPP;
                const assignedTo = await this.leadsService.getNextAssignee(companyId, isFromAd ? 'meta_ads' : 'whatsapp');

                let notes: string | undefined;
                if (isFromAd && referral) {
                    const adNotes = [
                        referral.source_url ? `Ad URL: ${referral.source_url}` : null,
                        referral.headline ? `Ad Headline: ${referral.headline}` : null,
                        referral.body ? `Ad Body: ${referral.body}` : null,
                        referral.source_type ? `Source: ${referral.source_type}` : null,
                        text ? `First Message: ${text}` : null,
                    ].filter(Boolean).join(', ');
                    notes = adNotes || undefined;
                } else {
                    notes = text ? `First WhatsApp message: ${text}` : undefined;
                }

                lead = await this.leadsService.create({
                    companyId,
                    name: contactName,
                    phone: `+${fromPhone}`,
                    source,
                    status: LeadStatus.NEW,
                    assignedTo: assignedTo || undefined,
                    notes,
                    skipAutoReply: true,
                });

                this.logger.log(`[WhatsApp Webhook] ✓ Auto-created lead: ${contactName} (${fromPhone}) - Lead ID: ${lead.id} | Source: ${source} | Company: ${companyId}`);
            }

            if (!lead) {
                this.logger.error(`[WhatsApp Webhook] Failed to find or create lead for phone ${fromPhone}. Skipping.`);
                continue;
            }

            // Save message — companyId is guaranteed to match the lead's company
            const message = this.messageRepo.create({
                companyId,
                leadId: lead.id,
                direction: MessageDirection.INBOUND,
                content: text || '[Non-text message]',
                status: MessageStatus.DELIVERED,
                whatsappMessageId: waMessageId,
            });
            await this.messageRepo.save(message);
            this.logger.log(`[WhatsApp Webhook] ✓ Saved incoming message (ID: ${message.id}) for lead ${lead.id} in company ${companyId}`);

            const activity = this.activityRepo.create({
                leadId: lead.id,
                type: ActivityType.WHATSAPP,
                content: isFromAd
                    ? `New lead from WhatsApp Ad: "${text}"`
                    : `Incoming WhatsApp message: "${text}"`,
            });
            await this.activityRepo.save(activity);
            this.logger.log(`[WhatsApp Webhook] ✓ Logged activity for lead ${lead.id}`);
        }

        this.logger.log(`[WhatsApp Webhook] ✓ Webhook processing complete`);
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
        let errorDetail: string | null = null;

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
                errorDetail = data.error?.message || JSON.stringify(data);
                this.logger.error(`WhatsApp template send error (${response.status}): ${JSON.stringify(data)}`);
                status = MessageStatus.FAILED;
            } else {
                whatsappMessageId = data.messages?.[0]?.id || null;
                this.logger.log(`Template "${templateName}" sent to ${phone} for lead ${leadId}`);
            }
        } catch (error) {
            errorDetail = error.message;
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
            errorDetail: errorDetail || undefined,
        });
        await this.messageRepo.save(msg);

        // Log activity
        try {
            const activityContent = status === MessageStatus.FAILED
                ? `Auto-reply template "${templateName}" failed to send${errorDetail ? ': ' + errorDetail : ''}`
                : `Auto-reply template "${templateName}" sent`;
            const activity = this.activityRepo.create({
                leadId,
                type: ActivityType.WHATSAPP,
                content: activityContent,
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
            this.logger.log(`[WhatsApp Auto-Reply] Checking auto-reply for lead ${leadId} (${leadName}) - Phone: ${leadPhone}`);

            const config = await this.configRepo.findOne({ where: { companyId } });
            if (!config) {
                this.logger.warn(`[WhatsApp Auto-Reply] No WhatsApp config found for company ${companyId}`);
                return;
            }

            if (!config.autoReplyEnabled) {
                this.logger.log(`[WhatsApp Auto-Reply] Auto-reply is DISABLED for company ${companyId}`);
                return;
            }

            if (!config.autoReplyTemplateName) {
                this.logger.warn(`[WhatsApp Auto-Reply] Auto-reply enabled but no template selected for company ${companyId}`);
                return;
            }

            if (!leadPhone) {
                this.logger.warn(`[WhatsApp Auto-Reply] Skipped for lead ${leadId}: no phone number`);
                return;
            }

            this.logger.log(`[WhatsApp Auto-Reply] ✓ Will send template "${config.autoReplyTemplateName}" to ${leadName} (${leadPhone})`);

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

    /**
     * Debug method to check WhatsApp configuration and test connectivity
     */
    async debugConfiguration(companyId: string): Promise<any> {
        const config = await this.configRepo.findOne({ where: { companyId } });

        if (!config) {
            return {
                configured: false,
                error: 'No WhatsApp configuration found for this company',
                companyId,
            };
        }

        const debug: any = {
            configured: true,
            companyId,
            phoneNumberId: config.phoneNumberId,
            hasAccessToken: !!config.accessToken,
            accessTokenLength: config.accessToken?.length || 0,
            accessTokenPrefix: config.accessToken?.substring(0, 15) + '...',
            businessAccountId: config.businessAccountId || 'Not set',
            autoReplyEnabled: config.autoReplyEnabled,
            autoReplyTemplateName: config.autoReplyTemplateName || 'Not set',
        };

        // Test API connectivity
        try {
            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.phoneNumberId}`,
                {
                    headers: { 'Authorization': `Bearer ${config.accessToken}` },
                }
            );
            const data = await response.json();

            if (response.ok) {
                debug.apiTest = {
                    status: 'success',
                    phoneNumber: data.display_phone_number || data.verified_name,
                    phoneNumberId: data.id,
                    qualityRating: data.quality_rating,
                };
            } else {
                debug.apiTest = {
                    status: 'failed',
                    error: data.error?.message || 'Unknown error',
                    errorCode: data.error?.code,
                };
            }
        } catch (error) {
            debug.apiTest = {
                status: 'error',
                error: error.message,
            };
        }

        // Get recent message statistics
        const messageStats = await this.messageRepo
            .createQueryBuilder('msg')
            .select('msg.direction', 'direction')
            .addSelect('msg.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('msg.companyId = :companyId', { companyId })
            .groupBy('msg.direction, msg.status')
            .getRawMany();

        debug.messageStats = messageStats;

        return debug;
    }
}
