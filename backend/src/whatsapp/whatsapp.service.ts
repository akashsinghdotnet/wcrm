import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppConfig } from './whatsapp-config.entity';
import { WhatsAppMessage, MessageDirection, MessageStatus } from './whatsapp-message.entity';
import { WhatsAppTemplate, TemplateStatus, TemplateCategory } from './entities/whatsapp-template.entity';
import { WhatsAppContact } from './entities/whatsapp-contact.entity';
import { SaveWhatsAppConfigDto } from './dto/save-config.dto';
import { Lead, LeadSource, LeadStatus } from '../leads/lead.entity';
import { Activity, ActivityType } from '../leads/activity.entity';
import { LeadsService } from '../leads/leads.service';
import { CompanySetting } from '../company-settings/company-setting.entity';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);

    constructor(
        @InjectRepository(WhatsAppConfig)
        private configRepo: Repository<WhatsAppConfig>,
        @InjectRepository(WhatsAppMessage)
        private messageRepo: Repository<WhatsAppMessage>,
        @InjectRepository(WhatsAppTemplate)
        private templateRepo: Repository<WhatsAppTemplate>,
        @InjectRepository(WhatsAppContact)
        private contactRepo: Repository<WhatsAppContact>,
        @InjectRepository(Lead)
        private leadRepo: Repository<Lead>,
        @InjectRepository(Activity)
        private activityRepo: Repository<Activity>,
        @InjectRepository(CompanySetting)
        private companySettingRepo: Repository<CompanySetting>,
        @Inject(forwardRef(() => LeadsService))
        private leadsService: LeadsService,
    ) { }

    async getConfig(companyId: string): Promise<WhatsAppConfig | null> {
        return this.configRepo.findOne({ where: { companyId } });
    }

    async saveConfig(dto: SaveWhatsAppConfigDto): Promise<WhatsAppConfig> {
        let config = await this.configRepo.findOne({ where: { companyId: dto.companyId } });

        let displayPhoneNumber = '';
        let verifiedName = '';
        if (dto.phoneNumberId && dto.accessToken) {
            try {
                const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${dto.phoneNumberId}`, {
                    headers: { Authorization: `Bearer ${dto.accessToken}` }
                });
                const phoneData = await phoneRes.json();
                if (phoneData && phoneData.id) {
                    displayPhoneNumber = phoneData.display_phone_number || phoneData.id;
                    verifiedName = phoneData.verified_name || '';
                }
            } catch (e) {
                this.logger.warn(`Could not verify phone details in saveConfig: ${e.message}`);
            }
        }

        if (config) {
            config.phoneNumberId = dto.phoneNumberId;
            config.accessToken = dto.accessToken;
            if (dto.businessAccountId !== undefined) config.businessAccountId = dto.businessAccountId;
            if (displayPhoneNumber) config.metaPhoneNumber = displayPhoneNumber;
            if (verifiedName) config.metaWabaName = verifiedName;
            config.setupMethod = 'MANUAL';
        } else {
            config = this.configRepo.create({
                ...dto,
                metaPhoneNumber: displayPhoneNumber,
                metaWabaName: verifiedName,
                setupMethod: 'MANUAL',
            });
        }

        return this.configRepo.save(config);
    }

    async saveMetaAppCredentials(companyId: string, payload: any) {
        throw new BadRequestException('Custom Meta App credentials are only supported in Wcrm Cloud Edition.');
    }

    async fetchAvailablePhoneNumbers(companyId: string, queryToken?: string, queryWabaId?: string) {
        let config = await this.configRepo.findOne({ where: { companyId } });
        const token = queryToken || config?.accessToken;
        if (!token) {
            throw new BadRequestException('No WhatsApp Access Token provided or configured. Please enter a token first.');
        }

        let wabaId = queryWabaId || config?.businessAccountId;
        const appId = config?.metaAppId || process.env.META_APP_ID || '';
        const appSecret = config?.metaAppSecret || process.env.META_APP_SECRET || '';

        const discoveredNumbers: any[] = [];
        const discoveredWabas: string[] = [];

        if (wabaId && !discoveredWabas.includes(wabaId)) {
            discoveredWabas.push(wabaId);
        }

        // 1. Try debug_token to find granular scope target_ids (WABA IDs) if app credentials exist
        if (appId && appSecret) {
            try {
                const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;
                const debugRes = await fetch(debugUrl);
                const debugData = await debugRes.json();
                const scopes = debugData?.data?.granular_scopes || [];
                for (const s of scopes) {
                    if (s.scope === 'whatsapp_business_management' && Array.isArray(s.target_ids)) {
                        for (const tid of s.target_ids) {
                            if (!discoveredWabas.includes(tid)) discoveredWabas.push(tid);
                        }
                    }
                }
            } catch (err) {
                this.logger.warn(`debug_token failed: ${err.message}`);
            }
        }

        // 2. Try /me/businesses to discover WABAs
        try {
            const bizRes = await fetch(`https://graph.facebook.com/v21.0/me/businesses?access_token=${token}`);
            const bizData = await bizRes.json();
            if (bizData?.data && Array.isArray(bizData.data)) {
                for (const b of bizData.data) {
                    try {
                        const cwRes = await fetch(`https://graph.facebook.com/v21.0/${b.id}/client_whatsapp_business_accounts?access_token=${token}`);
                        const cwData = await cwRes.json();
                        if (cwData?.data && Array.isArray(cwData.data)) {
                            for (const w of cwData.data) {
                                if (!discoveredWabas.includes(w.id)) discoveredWabas.push(w.id);
                            }
                        }
                    } catch (e) {}

                    try {
                        const owRes = await fetch(`https://graph.facebook.com/v21.0/${b.id}/owned_whatsapp_business_accounts?access_token=${token}`);
                        const owData = await owRes.json();
                        if (owData?.data && Array.isArray(owData.data)) {
                            for (const w of owData.data) {
                                if (!discoveredWabas.includes(w.id)) discoveredWabas.push(w.id);
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (err) {
            this.logger.warn(`/me/businesses check failed: ${err.message}`);
        }

        // 3. For each discovered WABA, query phone_numbers
        for (const wid of discoveredWabas) {
            try {
                const pRes = await fetch(`https://graph.facebook.com/v21.0/${wid}/phone_numbers?access_token=${token}`);
                const pData = await pRes.json();
                if (pData?.data && Array.isArray(pData.data)) {
                    for (const item of pData.data) {
                        if (!discoveredNumbers.some(n => n.id === item.id)) {
                            discoveredNumbers.push({
                                id: item.id,
                                displayPhoneNumber: item.display_phone_number || item.id,
                                verifiedName: item.verified_name || '',
                                qualityRating: item.quality_rating || 'GREEN',
                                status: item.code_verification_status || 'VERIFIED',
                                wabaId: wid,
                            });
                        }
                    }
                }
            } catch (err) {
                this.logger.warn(`Error fetching phone numbers for WABA ${wid}: ${err.message}`);
            }
        }

        // 4. If current config has a specific phoneNumberId, also check it directly
        if (config?.phoneNumberId && !discoveredNumbers.some(n => n.id === config.phoneNumberId)) {
            try {
                const directRes = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const directData = await directRes.json();
                if (directData?.id) {
                    discoveredNumbers.push({
                        id: directData.id,
                        displayPhoneNumber: directData.display_phone_number || directData.id,
                        verifiedName: directData.verified_name || '',
                        qualityRating: directData.quality_rating || 'GREEN',
                        status: 'VERIFIED',
                        wabaId: wabaId || '',
                    });
                }
            } catch (e) {}
        }

        return {
            wabas: discoveredWabas,
            numbers: discoveredNumbers,
            activePhoneNumberId: config?.phoneNumberId || '',
            configured: !!(config && config.phoneNumberId && config.accessToken)
        };
    }

    async selectPhoneNumber(companyId: string, payload: { phoneNumberId: string; wabaId?: string; accessToken?: string }) {
        let config = await this.configRepo.findOne({ where: { companyId } });
        const token = payload.accessToken || config?.accessToken;
        if (!token) {
            throw new BadRequestException('Access token is required');
        }

        let displayPhoneNumber = '';
        let verifiedName = '';
        let qualityRating = 'GREEN';

        try {
            const pRes = await fetch(`https://graph.facebook.com/v21.0/${payload.phoneNumberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const pData = await pRes.json();
            if (pData && pData.id) {
                displayPhoneNumber = pData.display_phone_number || pData.id;
                verifiedName = pData.verified_name || '';
                qualityRating = pData.quality_rating || 'GREEN';
            }
        } catch (e) {
            this.logger.warn(`Could not fetch details for selected phone ${payload.phoneNumberId}: ${e.message}`);
        }

        if (!config) {
            config = this.configRepo.create({
                companyId,
                phoneNumberId: payload.phoneNumberId,
                accessToken: token,
                businessAccountId: payload.wabaId || '',
                metaPhoneNumber: displayPhoneNumber,
                metaWabaName: verifiedName,
                setupMethod: 'EMBEDDED',
                provider: 'META'
            });
        } else {
            config.phoneNumberId = payload.phoneNumberId;
            config.accessToken = token;
            if (payload.wabaId) config.businessAccountId = payload.wabaId;
            if (displayPhoneNumber) config.metaPhoneNumber = displayPhoneNumber;
            if (verifiedName) config.metaWabaName = verifiedName;
            config.setupMethod = 'EMBEDDED';
            config.provider = 'META';
        }

        const saved = await this.configRepo.save(config);

        // Auto-subscribe WABA if present
        if (saved.businessAccountId) {
            try {
                await fetch(`https://graph.facebook.com/v21.0/${saved.businessAccountId}/subscribed_apps`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) {}
        }

        // Auto-register phone number on Cloud API
        if (saved.phoneNumberId) {
            await this.registerPhoneNumber(saved.phoneNumberId, token);
        }

        return {
            success: true,
            message: 'WhatsApp phone number connected successfully!',
            config: saved,
            qualityRating
        };
    }

    async registerPhoneNumber(phoneNumberId: string, accessToken: string, pin: string = '123456'): Promise<boolean> {
        try {
            this.logger.log(`[WhatsApp] Registering phone number ${phoneNumberId} on Cloud API...`);
            const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    pin,
                }),
            });
            const data = await res.json();
            this.logger.log(`[WhatsApp Register] Response: ${JSON.stringify(data)}`);
            return data.success === true;
        } catch (err) {
            this.logger.warn(`[WhatsApp Register] Failed: ${err.message}`);
            return false;
        }
    }

    async handleEmbeddedSignup(companyId: string, payload: any) {
        throw new BadRequestException("1-Click Meta Embedded Signup is only supported in Wcrm Cloud Edition. Please configure direct credentials under Settings.");
    }

    async disconnectWhatsApp(companyId: string): Promise<boolean> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (config) {
            config.phoneNumberId = '';
            config.accessToken = '';
            config.businessAccountId = '';
            config.metaPhoneNumber = '';
            config.metaWabaName = '';
            await this.configRepo.save(config);
            return true;
        }
        return false;
    }

    async ensureWhatsAppContact(companyId: string, rawPhone: string, contactName?: string): Promise<WhatsAppContact> {
        const formattedPhone = this.formatPhone(rawPhone);
        const phoneWithPlus = `+${formattedPhone}`;
        const cleanDigits = formattedPhone.slice(-10);

        let contact = await this.contactRepo
            .createQueryBuilder('c')
            .where('c.companyId = :companyId', { companyId })
            .andWhere("REPLACE(REPLACE(REPLACE(c.phone, '+', ''), '-', ''), ' ', '') LIKE :digits", {
                digits: `%${cleanDigits}`
            })
            .getOne();

        if (!contact) {
            const displayName = contactName && contactName !== 'Unknown' ? contactName : `WhatsApp User (+${formattedPhone})`;
            contact = this.contactRepo.create({
                companyId,
                name: displayName,
                phone: phoneWithPlus,
                isOptedIn: true,
                optInDate: new Date(),
                optInSource: 'whatsapp',
                lastMessageDate: new Date(),
                lastMessageType: 'sent',
            });
            await this.contactRepo.save(contact);
            this.logger.log(`[WhatsApp] Auto-created WhatsAppContact for ${formattedPhone}: ${contact.id}`);
        } else {
            contact.lastMessageDate = new Date();
            if (contactName && contactName !== 'Unknown' && (contact.name.startsWith('WhatsApp User') || contact.name.startsWith('Contact'))) {
                contact.name = contactName;
            }
            await this.contactRepo.save(contact);
        }

        return contact;
    }

    async ensureLeadAndContact(
        companyId: string,
        rawPhone: string,
        contactName?: string,
    ): Promise<{ lead: Lead; contact: WhatsAppContact }> {
        const formattedPhone = this.formatPhone(rawPhone);
        const phoneWithPlus = `+${formattedPhone}`;
        const cleanDigits = formattedPhone.slice(-10);

        // 1. Find or create Lead (for CRM Leads & Inbox conversations)
        let lead = await this.leadRepo
            .createQueryBuilder('lead')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere("REPLACE(REPLACE(REPLACE(lead.phone, '+', ''), '-', ''), ' ', '') LIKE :digits", {
                digits: `%${cleanDigits}`
            })
            .getOne();

        if (!lead) {
            const displayName = contactName && contactName !== 'Unknown' ? contactName : `WhatsApp User (+${formattedPhone})`;
            lead = await this.leadsService.create({
                companyId,
                name: displayName,
                phone: phoneWithPlus,
                source: LeadSource.WHATSAPP,
                status: LeadStatus.NEW,
            }, { skipAutoReply: true });
            this.logger.log(`[WhatsApp] Auto-created Lead for ${formattedPhone}: ${lead.id}`);
        } else if (contactName && contactName !== 'Unknown' && (lead.name.startsWith('WhatsApp User') || lead.name.startsWith('Contact'))) {
            lead.name = contactName;
            await this.leadRepo.save(lead);
        }

        // 2. Find or create WhatsAppContact (for Contacts management & broadcasts)
        const contact = await this.ensureWhatsAppContact(companyId, rawPhone, contactName || lead.name);

        return { lead, contact };
    }

    async sendMessage(
        companyId: string,
        leadId: string | null,
        to: string,
        message: string | undefined,
        type: string = 'text',
        mediaId?: string,
        userId?: string,
        replyToMessageId?: string,
    ): Promise<WhatsAppMessage> {
        this.logger.log(`[WhatsApp] Attempting to send message to ${to} for lead ${leadId} (company: ${companyId})`);

        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            this.logger.error(`[WhatsApp] No config found for company ${companyId}`);
            throw new BadRequestException('WhatsApp Business API is not configured for this company');
        }


        this.logger.log(`[WhatsApp] Found config - Phone Number ID: ${config.phoneNumberId?.substring(0, 8)}...`);

        // Format phone number - ensure it has country code
        const phone = this.formatPhone(to);
        this.logger.log(`[WhatsApp] Formatted phone: ${phone} (original: ${to})`);

        // Auto-create/find lead and contact so this message appears in Inbox and Contacts
        let actualLeadId = leadId;
        if (!actualLeadId) {
            try {
                const { lead } = await this.ensureLeadAndContact(companyId, phone);
                actualLeadId = lead.id;
            } catch (err) {
                this.logger.warn(`Could not ensure lead/contact for ${phone}: ${err.message}`);
            }
        }

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

            if (replyToMessageId) {
                payload.context = { message_id: replyToMessageId };
            }

            if (type === 'text') {
                payload.text = { body: message || '', preview_url: true };
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
                // Auto-healing for Meta Error 133010: Account not registered on Cloud API
                if (data.error?.code === 133010 || data.error?.message?.includes('133010') || data.error?.message?.includes('Account not registered')) {
                    this.logger.log(`[WhatsApp] Encountered error 133010 (Account not registered). Auto-registering phone number ${config.phoneNumberId}...`);
                    const registered = await this.registerPhoneNumber(config.phoneNumberId, config.accessToken);
                    if (registered) {
                        this.logger.log(`[WhatsApp] Auto-registration succeeded! Retrying message send...`);
                        const retryResponse = await fetch(
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
                        const retryData = await retryResponse.json();
                        if (retryResponse.ok) {
                            whatsappMessageId = retryData.messages?.[0]?.id || null;
                            status = MessageStatus.SENT;
                            this.logger.log(`[WhatsApp] Message successfully sent after auto-registration! ID: ${whatsappMessageId}`);
                        } else {
                            errorDetail = retryData.error?.message || JSON.stringify(retryData);
                            this.logger.error(`[WhatsApp] Retry failed: ${errorDetail}`);
                            status = MessageStatus.FAILED;
                        }
                    } else {
                        errorDetail = data.error?.message || 'Phone number registration failed on Meta Cloud API';
                        status = MessageStatus.FAILED;
                    }
                } else {
                    errorDetail = data.error?.message || JSON.stringify(data);
                    this.logger.error(`[WhatsApp] API error (${response.status}): ${errorDetail}`);
                    this.logger.error(`[WhatsApp] Full error response: ${JSON.stringify(data)}`);
                    status = MessageStatus.FAILED;
                }
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
            leadId: actualLeadId || undefined,
            direction: MessageDirection.OUTBOUND,
            content: message,
            status,
            whatsappMessageId: whatsappMessageId || undefined,
            errorDetail: errorDetail || undefined,
            sentBy: userId,
            messageType: type,
            mediaId: mediaId || undefined,
        });
        await this.messageRepo.save(msg);

        // Log activity on lead
        if (actualLeadId) {
            try {
                const activity = this.activityRepo.create({
                    leadId: actualLeadId,
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

    async getGlobalUnreadCount(companyId: string, user?: any): Promise<{ count: number }> {
        const qb = this.messageRepo.createQueryBuilder('msg')
            .where('msg.companyId = :companyId', { companyId })
            .andWhere('msg.direction = :direction', { direction: MessageDirection.INBOUND })
            .andWhere('msg.status = :status', { status: MessageStatus.DELIVERED });

        if (user && user.role === 'staff') {
            qb.innerJoin(Lead, 'lead', 'msg.leadId = lead.id')
              .andWhere('lead.assignedTo = :userId', { userId: user.userId });
        }

        const count = await qb.getCount();
        return { count };
    }

    async getMessages(companyId: string, leadId: string, user?: any): Promise<WhatsAppMessage[]> {
        if (user && user.role === 'staff') {
            const lead = await this.leadRepo.findOne({ where: { id: leadId, companyId } });
            if (!lead || lead.assignedTo !== user.userId) {
                throw new ForbiddenException('You can only view chats for leads assigned to you');
            }
        }
        return this.messageRepo.find({
            where: { companyId, leadId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
        });
    }

    async markMessagesAsRead(companyId: string, leadId: string, user?: any): Promise<{ updated: number }> {
        if (user && user.role === 'staff') {
            const lead = await this.leadRepo.findOne({ where: { id: leadId, companyId } });
            if (!lead || lead.assignedTo !== user.userId) {
                throw new ForbiddenException('You can only modify chats for leads assigned to you');
            }
        }
        const result = await this.messageRepo.update(
            { companyId, leadId, direction: MessageDirection.INBOUND, status: MessageStatus.DELIVERED },
            { status: MessageStatus.READ },
        );
        return { updated: result.affected || 0 };
    }

    async getConversations(companyId: string, user?: any) {
        // Get all leads that have WhatsApp messages, with last message info
        const qb = this.messageRepo
            .createQueryBuilder('msg')
            .select('msg.leadId', 'leadId')
            .addSelect('MAX(msg.createdAt)', 'lastMessageAt')
            .addSelect('COUNT(msg.id)', 'messageCount')
            .where('msg.companyId = :companyId', { companyId })
            .andWhere('msg.leadId IS NOT NULL');

        if (user && user.role === 'staff') {
            qb.innerJoin(Lead, 'lead', 'msg.leadId = lead.id')
              .andWhere('lead.assignedTo = :userId', { userId: user.userId });
        }

        const conversations = await qb
            .groupBy('msg.leadId')
            .orderBy('MAX(msg.createdAt)', 'DESC')
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

        // Ensuring sorting is explicitly applied based on the fetched last message dates
        result.sort((a, b) => {
            const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return dateB - dateA; // Descending order
        });

        return result;
    }

    async deleteChatHistory(companyId: string, leadId: string): Promise<{ deleted: number }> {
        const result = await this.messageRepo.delete({ companyId, leadId });
        return { deleted: result.affected || 0 };
    }

    async getLinkPreview(url: string) {
        const decodeHtml = (text: string) => {
            if (!text) return text;
            return text
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&#x([0-9A-Fa-f]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 16)))
                .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&apos;/g, "'");
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            
            const req = await fetch(url, { 
                signal: controller.signal,
                headers: { 
                    'User-Agent': 'WhatsApp/2.21.19.21 A',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            clearTimeout(timeoutId);
            
            if (!req.ok) throw new Error('Bad status');
            const html = await req.text();
            
            // Regex parsing HTML tags safely
            const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
            const imgMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            const domainMatch = url.match(/:\/\/(?:www\.)?([^\/]+)/);

            return {
                title: titleMatch ? decodeHtml(titleMatch[1]).trim() : (domainMatch ? domainMatch[1] : 'External Link'),
                description: descMatch ? decodeHtml(descMatch[1]).trim() : '',
                image: imgMatch ? (decodeHtml(imgMatch[1]).startsWith('/') ? new URL(decodeHtml(imgMatch[1]), url).toString() : decodeHtml(imgMatch[1])) : null,
                domain: domainMatch ? domainMatch[1] : url,
                url
            };
        } catch(e) {
            const domainMatch = url.match(/:\/\/(?:www\.)?([^\/]+)/);
            return { 
                title: domainMatch ? domainMatch[1] : 'External Link', 
                description: '', 
                image: null, 
                domain: domainMatch ? domainMatch[1] : url,
                url 
            };
        }
    }

    async handleIncomingWebhook(body: any): Promise<void> {
        this.logger.log(`[WhatsApp Webhook] Received webhook payload: ${JSON.stringify(body).substring(0, 500)}`);

        const entry = body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Process Status Updates (Read Receipts)
        if (value?.statuses?.length) {
            for (const statusObj of value.statuses) {
                const messageId = statusObj.id;
                const statusStr = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
                let newStatus;
                
                if (statusStr === 'delivered') newStatus = MessageStatus.DELIVERED;
                else if (statusStr === 'read') newStatus = MessageStatus.READ;
                else if (statusStr === 'failed') newStatus = MessageStatus.FAILED;
                
                if (messageId && newStatus) {
                    await this.messageRepo.update(
                        { whatsappMessageId: messageId },
                        { status: newStatus }
                    );
                    this.logger.log(`[WhatsApp Webhook] Updated message ${messageId} to status: ${newStatus}`);
                }
            }
        }

        // Process Incoming Messages
        if (!value?.messages?.length) {
            return; // Complete processing if payload was just status updates
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
            const waMessageId = msg.id;

            const messageType = msg.type || 'text';
            let text = '';
            let mediaId: string | undefined = undefined;
            let mimeType: string | undefined = undefined;

            if (messageType === 'text') {
                text = msg.text?.body || '';
            } else if (messageType === 'interactive') {
                text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.button_reply?.id || '[Interactive Reply]';
            } else if (messageType === 'button') {
                text = msg.button?.text || msg.button?.payload || '[Button Click]';
            } else if (msg[messageType]) {
                const mediaObj = msg[messageType];
                mediaId = mediaObj.id || undefined;
                mimeType = mediaObj.mime_type || undefined;
                text = mediaObj.caption || mediaObj.filename || `[${messageType} message]`;
            } else {
                text = `[${messageType} message]`;
            }

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

            const isFirstInbound = !lead;

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
                }, { skipAutoReply: true });

                this.logger.log(`[WhatsApp Webhook] ✓ Auto-created lead: ${contactName} (${fromPhone}) - Lead ID: ${lead.id} | Source: ${source} | Company: ${companyId}`);
            }

            if (!lead) {
                this.logger.error(`[WhatsApp Webhook] Failed to find or create lead for phone ${fromPhone}. Skipping.`);
                continue;
            }

            // Sync to WhatsAppContact for Contacts tab
            try {
                const contactName = contacts.find((c: any) => c.wa_id === fromPhone)?.profile?.name || lead.name;
                await this.ensureWhatsAppContact(companyId, fromPhone, contactName);
            } catch (cErr) {
                this.logger.warn(`Could not sync WhatsAppContact for incoming webhook: ${cErr.message}`);
            }

            // Save message — companyId is guaranteed to match the lead's company
            const message = this.messageRepo.create({
                companyId,
                leadId: lead.id,
                direction: MessageDirection.INBOUND,
                content: text || `[${messageType} message]`,
                status: MessageStatus.DELIVERED,
                whatsappMessageId: waMessageId,
                messageType,
                mediaId,
                mimeType,
                referral: isFromAd ? referral : undefined,
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

            // ── Auto-trigger Flow / Automation Engine ────────────────────────
            try {
                const interactivePayload = msg.interactive || (msg.type === 'button' ? { button_reply: { id: msg.button?.payload, title: msg.button?.text } } : null);
                await this.executeFlowAutomations(companyId, lead, fromPhone, text, messageType, interactivePayload, isFirstInbound);
            } catch (autoErr) {
                this.logger.warn(`[FlowEngine] Automation execution warning: ${autoErr.message}`);
            }
            // ──────────────────────────────────────────────────────────────────
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

        // Resolve the actual template body text from DB (fill in variables)
        let templateContent: string;
        try {
            const tpl = await this.templateRepo.findOne({ where: { companyId, name: templateName } });
            if (tpl?.content) {
                let body = tpl.content;
                if (variables?.length) {
                    variables.forEach((val, i) => {
                        body = body.replace(new RegExp(`\\{\\{${i + 1}\\}}`, 'g'), val);
                    });
                }
                templateContent = body;
            } else {
                templateContent = `[Template: ${templateName}]${variables?.length ? ' (' + variables.join(', ') + ')' : ''}`;
            }
        } catch {
            templateContent = `[Template: ${templateName}]`;
        }

        // Save message record with actual template body
        const msg = this.messageRepo.create({
            companyId,
            leadId,
            direction: MessageDirection.OUTBOUND,
            content: templateContent,
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
     * Fetch all message templates from Meta Business API (approved, pending, rejected).
     */
    async fetchTemplates(companyId: string): Promise<any[]> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config) {
            throw new BadRequestException('WhatsApp Business API is not configured');
        }
        if (!config.businessAccountId) {
            throw new BadRequestException('Business Account ID (WABA ID) is required to fetch templates. Please ensure your WhatsApp account is connected.');
        }

        try {
            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.businessAccountId}/message_templates?limit=100`,
                {
                    headers: { 'Authorization': `Bearer ${config.accessToken}` },
                },
            );

            const data = await response.json();

            if (!response.ok) {
                this.logger.error(`Meta templates API error: ${JSON.stringify(data)}`);
                throw new BadRequestException(data.error?.message || 'Failed to fetch templates from Meta');
            }

            const templates = (data.data || []).map((t: any) => {
                const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
                const headerComp = (t.components || []).find((c: any) => c.type === 'HEADER');
                const footerComp = (t.components || []).find((c: any) => c.type === 'FOOTER');
                const buttonsComp = (t.components || []).find((c: any) => c.type === 'BUTTONS');

                const status = (t.status || 'APPROVED').toLowerCase();

                return {
                    id: t.id || t.name,
                    name: t.name,
                    language: t.language,
                    status: status,
                    category: t.category,
                    bodyText: bodyComp?.text || '',
                    headerText: headerComp?.text || '',
                    footerText: footerComp?.text || '',
                    buttons: buttonsComp?.buttons || [],
                    components: t.components,
                    rejectedReason: t.rejected_reason || null,
                };
            });

            // Sync with local DB in background
            this.syncTemplatesToDB(companyId).catch((err) => {
                this.logger.warn(`Background syncTemplatesToDB error: ${err.message}`);
            });

            return templates;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(`Failed to fetch templates: ${error.message}`);
            throw new BadRequestException(error.message || 'Failed to fetch templates from Meta');
        }
    }

    /**
     * Create and submit a message template directly to Meta Graph API for review.
     */
    async createAndSubmitTemplate(
        companyId: string,
        dto: {
            name: string;
            category: string;
            language: string;
            bodyText: string;
            headerText?: string;
            footerText?: string;
            buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
        },
    ) {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config || !config.accessToken) {
            throw new BadRequestException('WhatsApp Business API is not connected. Please connect your WhatsApp account first.');
        }

        const wabaId = config.businessAccountId;
        if (!wabaId) {
            throw new BadRequestException('WhatsApp Business Account ID (WABA ID) not found in config. Please reconnect or sync account.');
        }

        // Meta requires name in lowercase, numbers, underscores only
        const cleanName = dto.name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        if (!cleanName) {
            throw new BadRequestException('Template name is required and can only contain lowercase letters, numbers, and underscores.');
        }

        if (!dto.bodyText || !dto.bodyText.trim()) {
            throw new BadRequestException('Template message body is required.');
        }

        const category = (dto.category || 'MARKETING').toUpperCase();
        const language = dto.language || 'en_US';

        // Build Meta Components
        const components: any[] = [];

        // 1. Header (optional)
        if (dto.headerText && dto.headerText.trim()) {
            components.push({
                type: 'HEADER',
                format: 'TEXT',
                text: dto.headerText.trim(),
            });
        }

        // 2. Body (required)
        components.push({
            type: 'BODY',
            text: dto.bodyText.trim(),
        });

        // 3. Footer (optional)
        if (dto.footerText && dto.footerText.trim()) {
            components.push({
                type: 'FOOTER',
                text: dto.footerText.trim(),
            });
        }

        // 4. Buttons (optional)
        if (dto.buttons && dto.buttons.length > 0) {
            const formattedButtons = dto.buttons.map(b => {
                if (b.type === 'URL') {
                    return { type: 'URL', text: b.text, url: b.url };
                } else if (b.type === 'PHONE_NUMBER') {
                    return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number };
                }
                return { type: 'QUICK_REPLY', text: b.text };
            });
            components.push({
                type: 'BUTTONS',
                buttons: formattedButtons,
            });
        }

        const payload = {
            name: cleanName,
            category: category,
            language: language,
            components: components,
        };

        this.logger.log(`[WhatsApp Templates] Submitting template "${cleanName}" to Meta WABA ${wabaId}...`);

        const response = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/message_templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        this.logger.log(`[WhatsApp Templates] Meta response (${response.status}): ${JSON.stringify(data)}`);

        if (!response.ok) {
            const metaError = data.error?.message || data.error?.error_user_msg || JSON.stringify(data);
            throw new BadRequestException(`Meta API Error: ${metaError}`);
        }

        // Extract variables from body text (e.g. {{1}}, {{2}})
        const variables = (dto.bodyText.match(/\{\{\d+\}\}/g) || []).map((_, i) => `var${i + 1}`);

        // Save or update in local DB
        const metaStatus = (data.status || 'PENDING').toLowerCase();
        const mappedStatus = metaStatus === 'approved' ? TemplateStatus.APPROVED :
                             metaStatus === 'rejected' ? TemplateStatus.REJECTED :
                             TemplateStatus.PENDING;

        let template = await this.templateRepo.findOne({ where: { companyId, name: cleanName } });
        if (!template) {
            template = this.templateRepo.create({
                companyId,
                name: cleanName,
                content: dto.bodyText.trim(),
                category: (category.toLowerCase() as any) || TemplateCategory.MARKETING,
                status: mappedStatus,
                metaTemplateId: data.id || undefined,
                language: language,
                variables: variables,
            });
        } else {
            template.content = dto.bodyText.trim();
            template.category = (category.toLowerCase() as any) || TemplateCategory.MARKETING;
            template.status = mappedStatus;
            template.metaTemplateId = data.id || template.metaTemplateId;
            template.language = language;
            template.variables = variables;
        }

        await this.templateRepo.save(template);

        return {
            success: true,
            message: `Template "${cleanName}" submitted to Meta for approval! Initial status: ${data.status || 'PENDING'}`,
            template: {
                id: template.id,
                name: cleanName,
                status: data.status || 'PENDING',
                category: category,
                language: language,
                metaId: data.id,
            },
        };
    }

    /**
     * Delete a template from Meta and local DB.
     */
    async deleteTemplate(companyId: string, templateName: string) {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config || !config.accessToken || !config.businessAccountId) {
            throw new BadRequestException('WhatsApp config missing');
        }

        // Call Meta DELETE
        try {
            const res = await fetch(
                `https://graph.facebook.com/v21.0/${config.businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${config.accessToken}` },
                }
            );
            const data = await res.json();
            this.logger.log(`Delete template from Meta result: ${JSON.stringify(data)}`);
        } catch (e) {
            this.logger.warn(`Could not delete template from Meta: ${e.message}`);
        }

        // Remove from DB
        await this.templateRepo.delete({ companyId, name: templateName });
        return { success: true, message: `Template ${templateName} deleted.` };
    }

    /**
     * Sync Meta templates into the local whatsapp_templates DB table.
     */
    async syncTemplatesToDB(companyId: string): Promise<void> {
        try {
            const metaTemplates = await this.fetchTemplates(companyId);
            for (const t of metaTemplates) {
                const bodyText = t.bodyText || '';
                const variables = (bodyText.match(/\{\{\d+\}\}/g) || []).map((_: any, i: number) => `var${i + 1}`);

                const mappedStatus = t.status === 'approved' ? TemplateStatus.APPROVED :
                                     t.status === 'rejected' ? TemplateStatus.REJECTED :
                                     TemplateStatus.PENDING;

                const existing = await this.templateRepo.findOne({ where: { companyId, name: t.name } });
                if (existing) {
                    existing.content = bodyText || existing.content;
                    existing.language = t.language || existing.language;
                    existing.status = mappedStatus;
                    existing.metaTemplateId = t.id || existing.metaTemplateId;
                    existing.variables = variables.length ? variables : existing.variables;
                    await this.templateRepo.save(existing);
                } else {
                    await this.templateRepo.save(this.templateRepo.create({
                        companyId,
                        name: t.name,
                        content: bodyText || t.name,
                        language: t.language || 'en',
                        status: mappedStatus,
                        category: (t.category?.toLowerCase() as any) || 'marketing',
                        metaTemplateId: t.id || undefined,
                        variables,
                    }));
                }
            }
        } catch (err: any) {
            this.logger.warn(`Template sync skipped: ${err.message}`);
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

    /**
     * Download media from WhatsApp by mediaId. Returns a streamable response object.
     */
    async downloadMedia(companyId: string, mediaId: string): Promise<{ buffer: Buffer, mimeType: string }> {
        const config = await this.configRepo.findOne({ where: { companyId } });
        if (!config || !config.accessToken) {
            throw new BadRequestException('WhatsApp Business API is not configured or missing access token');
        }

        try {
            // First, get the media URL from the Graph API
            const getUrlRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${config.accessToken}` }
            });

            if (!getUrlRes.ok) {
                const errData = await getUrlRes.text();
                this.logger.error(`Failed to fetch media metadata for ${mediaId}`, errData);
                throw new Error('Failed to fetch media metadata');
            }

            const mediaMetadata = await getUrlRes.json();
            const mediaUrl = mediaMetadata.url;
            const mimeType = mediaMetadata.mime_type;

            if (!mediaUrl) {
                throw new Error('No media URL returned from WhatsApp');
            }

            // Second, download the actual media file
            const downloadRes = await fetch(mediaUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${config.accessToken}` }
            });

            if (!downloadRes.ok) {
                throw new Error('Failed to download media file');
            }

            const arrayBuffer = await downloadRes.arrayBuffer();
            return {
                buffer: Buffer.from(arrayBuffer),
                mimeType: mimeType || 'application/octet-stream',
            };
        } catch (error) {
            this.logger.error(`Error downloading media ${mediaId}: ${error.message}`);
            throw new BadRequestException('Failed to retrieve media file');
        }
    }

    // ==================== FLOW & AUTOMATION ENGINE ====================

    async getFlows(companyId: string): Promise<any[]> {
        const setting = await this.companySettingRepo.findOne({
            where: { companyId, key: 'whatsapp_flows' }
        });
        if (!setting || !setting.value) return [];
        try {
            return JSON.parse(setting.value);
        } catch {
            return [];
        }
    }

    async saveFlows(companyId: string, flows: any[]): Promise<any[]> {
        let setting = await this.companySettingRepo.findOne({
            where: { companyId, key: 'whatsapp_flows' }
        });
        const serialized = JSON.stringify(flows || []);
        if (setting) {
            setting.value = serialized;
        } else {
            setting = this.companySettingRepo.create({
                companyId,
                key: 'whatsapp_flows',
                value: serialized,
            });
        }
        await this.companySettingRepo.save(setting);
        return flows;
    }

    async getAutomations(companyId: string): Promise<any[]> {
        const setting = await this.companySettingRepo.findOne({
            where: { companyId, key: 'whatsapp_automations' }
        });
        if (!setting || !setting.value) return [];
        try {
            return JSON.parse(setting.value);
        } catch {
            return [];
        }
    }

    async saveAutomations(companyId: string, automations: any[]): Promise<any[]> {
        let setting = await this.companySettingRepo.findOne({
            where: { companyId, key: 'whatsapp_automations' }
        });
        const serialized = JSON.stringify(automations || []);
        if (setting) {
            setting.value = serialized;
        } else {
            setting = this.companySettingRepo.create({
                companyId,
                key: 'whatsapp_automations',
                value: serialized,
            });
        }
        await this.companySettingRepo.save(setting);
        return automations;
    }

    async executeFlowAutomations(
        companyId: string,
        lead: Lead,
        fromPhone: string,
        text: string,
        messageType: string,
        interactivePayload?: any,
        isFirstInbound?: boolean,
    ): Promise<boolean> {
        try {
            const incomingLower = (text || '').trim().toLowerCase();
            const buttonId = interactivePayload?.button_reply?.id || interactivePayload?.list_reply?.id;
            const buttonTitle = (interactivePayload?.button_reply?.title || interactivePayload?.list_reply?.title || '').toLowerCase();

            // 1. EVALUATE AUTOMATIONS
            const automations = await this.getAutomations(companyId);
            if (Array.isArray(automations) && automations.length > 0) {
                for (const auto of automations) {
                    if (auto.status !== 'active') continue;

                    let matched = false;
                    const triggerType = auto.trigger;

                    if (triggerType === 'first_inbound' && isFirstInbound) {
                        matched = true;
                    } else if (triggerType === 'every_inbound') {
                        matched = true;
                    } else if (triggerType === 'keyword_match') {
                        const rawKeywords = auto.triggerConfig?.keywords || auto.keywords || '';
                        const keywords = rawKeywords
                            .split(',')
                            .map((k: string) => k.trim().toLowerCase())
                            .filter(Boolean);

                        if (keywords.length > 0 && keywords.some((k: string) =>
                            incomingLower === k || incomingLower.startsWith(k + ' ') || incomingLower.endsWith(' ' + k) || incomingLower.includes(k)
                        )) {
                            matched = true;
                        }
                    }

                    if (matched && Array.isArray(auto.steps) && auto.steps.length > 0) {
                        this.logger.log(`[AutomationEngine] Matched active Automation "${auto.name}" (${auto.id}) for lead ${lead.id}`);
                        for (const step of auto.steps) {
                            await this.executeAutomationStep(companyId, lead, fromPhone, step, auto);
                        }
                        return true;
                    }
                }
            }

            // 2. EVALUATE FLOWS (Node-based interactive flows)
            const flows = await this.getFlows(companyId);
            if (!Array.isArray(flows) || flows.length === 0) {
                return false;
            }

            for (const flow of flows) {
                if (flow.status !== 'active' || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
                    continue;
                }

                const startNode = flow.nodes.find((n: any) => n.type === 'start') || flow.nodes[0];
                const rawKeywords = flow.triggerKeyword || startNode?.config?.keyword || '';
                const keywords = rawKeywords
                    .split(',')
                    .map((k: string) => k.trim().toLowerCase())
                    .filter(Boolean);

                let isMatch = false;
                let targetNodeIdFromButton: string | null = null;

                // 1. Interactive button / list payload match
                if (buttonId || buttonTitle) {
                    for (const node of flow.nodes) {
                        if (node.type === 'send_buttons' && Array.isArray(node.config?.buttons)) {
                            const btn = node.config.buttons.find((b: any) => 
                                b.id === buttonId || (b.label && b.label.toLowerCase() === buttonTitle)
                            );
                            if (btn && btn.targetNodeId) {
                                targetNodeIdFromButton = btn.targetNodeId;
                                isMatch = true;
                                break;
                            }
                        }
                    }
                }

                // 2. Keyword match (e.g. "hi", "hello", "menu", "pricing")
                if (!isMatch && keywords.length > 0) {
                    isMatch = keywords.some((k: string) => 
                        incomingLower === k || incomingLower.startsWith(k + ' ') || incomingLower.endsWith(' ' + k) || incomingLower.includes(k)
                    );
                }

                // 3. Number quick-reply (e.g. customer replied with "1", "2")
                if (!isMatch && /^\d+$/.test(incomingLower)) {
                    const optIndex = parseInt(incomingLower, 10) - 1;
                    for (const node of flow.nodes) {
                        if (node.type === 'send_buttons' && Array.isArray(node.config?.buttons)) {
                            if (node.config.buttons[optIndex] && node.config.buttons[optIndex].targetNodeId) {
                                targetNodeIdFromButton = node.config.buttons[optIndex].targetNodeId;
                                isMatch = true;
                                break;
                            }
                        }
                    }
                }

                if (!isMatch) {
                    continue;
                }

                this.logger.log(`[FlowEngine] Matched active Flow "${flow.name}" (${flow.id}) for message "${incomingLower}" from ${fromPhone}`);

                const nextNodeId = targetNodeIdFromButton || startNode?.config?.nextNodeId || flow.nodes[1]?.id;
                if (!nextNodeId) {
                    continue;
                }

                const actionNode = flow.nodes.find((n: any) => n.id === nextNodeId);
                if (!actionNode) {
                    continue;
                }

                await this.executeNode(companyId, lead, fromPhone, actionNode, flow);
                return true;
            }

            return false;
        } catch (err) {
            this.logger.error(`[FlowEngine] Error executing flow automations: ${err.message}`, err.stack);
            return false;
        }
    }

    private async executeAutomationStep(companyId: string, lead: Lead, toPhone: string, step: any, auto: any) {
        const replaceVars = (str: string) => {
            if (!str) return '';
            return str
                .replace(/\{\{name\}\}/gi, lead.name || 'there')
                .replace(/\{\{phone\}\}/gi, toPhone)
                .replace(/\{\{company\}\}/gi, auto.name || 'Wcrm');
        };

        const type = step.type || 'message';

        if (type === 'message' || type === 'send_message') {
            const content = replaceVars(step.content || step.text || '');
            if (content) {
                await this.sendMessage(companyId, lead.id, toPhone, content);
            }
        } else if (type === 'link' || type === 'send_link') {
            const text = replaceVars(step.content || step.text || '');
            const url = step.url || step.linkUrl || '';
            const fullMsg = url ? (text ? `${text}\n\n👉 ${url}` : url) : text;
            if (fullMsg) {
                await this.sendMessage(companyId, lead.id, toPhone, fullMsg);
            }
        } else if (type === 'template' || type === 'send_template') {
            const templateName = step.templateName || step.template;
            if (templateName) {
                try {
                    await this.sendTemplate(
                        companyId,
                        lead.id,
                        toPhone,
                        templateName,
                        step.languageCode || 'en_US',
                    );
                } catch (tErr) {
                    this.logger.warn(`Failed to send template ${templateName}: ${tErr.message}. Falling back to text.`);
                    if (step.content) {
                        await this.sendMessage(companyId, lead.id, toPhone, replaceVars(step.content));
                    }
                }
            } else if (step.content) {
                await this.sendMessage(companyId, lead.id, toPhone, replaceVars(step.content));
            }
        } else if (type === 'buttons' || type === 'send_buttons') {
            const header = replaceVars(step.headerText || '');
            const body = replaceVars(step.content || step.bodyText || step.text || 'Please select an option:');
            const footer = step.footerText || '';
            const buttons: any[] = step.buttons || [];

            let fullText = '';
            if (header) fullText += `*${header}*\n\n`;
            fullText += body;
            if (buttons.length > 0) {
                fullText += '\n\n' + buttons.map((b: any, i: number) => {
                    const label = typeof b === 'string' ? b : (b.label || b.text);
                    return `${i + 1}️⃣ ${label}`;
                }).join('\n');
                fullText += `\n\n_Reply with 1, 2, or 3_`;
            }
            if (footer) fullText += `\n\n_${footer}_`;

            await this.sendMessage(companyId, lead.id, toPhone, fullText);
        } else if (type === 'tag') {
            if (step.tagName) {
                try {
                    const existingNotes = lead.notes || '';
                    lead.notes = existingNotes ? `${existingNotes} | Tag: ${step.tagName}` : `Tag: ${step.tagName}`;
                    await this.leadRepo.save(lead);
                } catch (e) {
                    this.logger.warn(`Could not attach tag in automation: ${e.message}`);
                }
            }
        }
    }

    private async executeNode(companyId: string, lead: Lead, toPhone: string, node: any, flow: any) {
        this.logger.log(`[FlowEngine] Executing node "${node.title || node.id}" (type: ${node.type})`);

        const replaceVars = (str: string) => {
            if (!str) return '';
            return str
                .replace(/\{\{name\}\}/gi, lead.name || 'there')
                .replace(/\{\{phone\}\}/gi, toPhone)
                .replace(/\{\{company\}\}/gi, flow.name || 'Wcrm');
        };

        if (node.type === 'send_message') {
            const rawText = node.config?.text || node.config?.message || '';
            if (rawText) {
                const messageText = replaceVars(rawText);
                await this.sendMessage(companyId, lead.id, toPhone, messageText);
            }
        } else if (node.type === 'send_buttons') {
            const header = replaceVars(node.config?.headerText || '');
            const body = replaceVars(node.config?.bodyText || node.config?.text || 'Please choose an option:');
            const footer = node.config?.footerText || '';
            const buttons: any[] = node.config?.buttons || [];

            let fullText = '';
            if (header) fullText += `*${header}*\n\n`;
            fullText += body;
            if (buttons.length > 0) {
                fullText += '\n\n' + buttons.map((b, i) => `${i + 1}️⃣ ${b.label}`).join('\n');
                fullText += `\n\n_Reply with 1, 2, or 3_`;
            }
            if (footer) fullText += `\n\n_${footer}_`;

            await this.sendMessage(companyId, lead.id, toPhone, fullText);
        } else if (node.type === 'send_media') {
            const caption = replaceVars(node.config?.caption || '');
            const mediaUrl = node.config?.mediaUrl || '';
            const textToSend = caption ? `${caption}\n${mediaUrl}` : mediaUrl;
            if (textToSend) {
                await this.sendMessage(companyId, lead.id, toPhone, textToSend);
            }
        } else if (node.type === 'handoff') {
            await this.sendMessage(companyId, lead.id, toPhone, `Connecting you with a specialist. One of our team members will be right with you! 👋`);
        }
    }
}
