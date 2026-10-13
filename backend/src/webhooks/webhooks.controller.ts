import { Controller, Post, Get, Body, HttpCode, HttpStatus, Query, Logger, ValidationPipe, Res, BadRequestException } from '@nestjs/common';
import type { Response as HttpResponse } from 'express';
import { LeadsService } from '../leads/leads.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { WebhookGoogleDto } from './dto/webhook-google.dto';
import { WebhookJustdialDto } from './dto/webhook-justdial.dto';
import { WebhookIndiamartDto } from './dto/webhook-indiamart.dto';
import { WebhookTradeindiaDto } from './dto/webhook-tradeindia.dto';
import { WebhookWebsiteDto } from './dto/webhook-website.dto';

/**
 * Public webhook endpoints (no JWT required).
 * External services like Meta Ads, Google Ads, JustDial, and website forms
 * call these URLs to push new leads into Wcrm.
 */
@Controller('webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        private readonly leadsService: LeadsService,
        private readonly notifications: NotificationsService,
        private readonly integrationsService: IntegrationsService,
    ) { }

    private async notifyNewLead(lead: any, source: string) {
        const msg = this.notifications.formatLeadMessage({
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            source,
        });
        await this.notifications.sendWhatsApp(msg);
    }

    /**
     * Meta / Facebook Lead Ads — Webhook Verification
     * GET /api/webhooks/meta
     * Facebook sends hub.mode, hub.verify_token, hub.challenge for verification
     */
    @Get('meta')
    verifyMetaWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: HttpResponse,
    ) {
        const validTokens = [process.env.META_WEBHOOK_VERIFY_TOKEN, 'wcrm'].filter(Boolean);
        if (mode === 'subscribe' && validTokens.includes(token)) {
            this.logger.log('Meta webhook verification successful');
            return res.status(HttpStatus.OK).send(challenge);
        }
        this.logger.warn(`Meta webhook verification failed: mode=${mode}, token=${token}`);
        return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }

    /**
     * Meta / Facebook Lead Ads — Incoming Leadgen Events
     * POST /api/webhooks/meta
     * Facebook sends: { object: "page", entry: [{ id: pageId, changes: [{ field: "leadgen", value: { leadgen_id, page_id, ... } }] }] }
     */
    @Post('meta')
    @HttpCode(HttpStatus.OK)
    async handleMeta(@Body() body: any) {
        this.logger.log(`Meta webhook received: ${JSON.stringify(body).substring(0, 500)}`);

        // Handle Facebook's native leadgen webhook format
        if (body?.object === 'page' && body?.entry) {
            for (const entry of body.entry) {
                const pageId = entry.id?.toString();
                const changes = entry.changes || [];

                for (const change of changes) {
                    if (change.field === 'leadgen') {
                        const leadgenId = change.value?.leadgen_id;
                        const leadPageId = change.value?.page_id?.toString() || pageId;

                        if (!leadgenId) {
                            this.logger.warn('Meta leadgen event missing leadgen_id');
                            continue;
                        }

                        // Process asynchronously so we respond to Facebook quickly
                        this.integrationsService.processMetaLeadgenEvent(leadgenId, leadPageId)
                            .catch(err => this.logger.error(`Failed to process Meta lead ${leadgenId}: ${err.message}`));
                    }
                }
            }
            return { status: 'ok' };
        }

        // Fallback: handle legacy/direct format with companyId in body
        if (body?.companyId) {
            const assignedTo = await this.leadsService.getNextAssignee(body.companyId, 'meta_ads');
            const lead = await this.leadsService.create({
                companyId: body.companyId,
                name: body.name || body.full_name || 'Unknown (Meta)',
                phone: body.phone || body.phone_number,
                email: body.email,
                source: LeadSource.META_ADS,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
            });
            this.notifyNewLead(lead, 'Meta Ads');
            return { success: true, leadId: lead.id, assignedTo };
        }

        this.logger.warn(`Unrecognized Meta webhook format: ${JSON.stringify(body).substring(0, 300)}`);
        return { status: 'ok' };
    }

    /**
     * Google Ads Lead Form Webhook
     * POST /api/webhooks/google
     * Handles both Google's native webhook format (user_column_data) and legacy format (companyId + name/phone/email)
     */
    @Post('google')
    @HttpCode(HttpStatus.OK)
    async handleGoogle(@Body(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true })) dto: WebhookGoogleDto) {
        this.logger.log(`Google webhook received: ${JSON.stringify(dto).substring(0, 500)}`);

        // Native Google Ads webhook format — has user_column_data array
        if (dto.user_column_data && Array.isArray(dto.user_column_data)) {
            // Look up company by matching google_key in stored credentials
            let companyId = dto.companyId;

            if (!companyId && dto.google_key) {
                const config = await this.integrationsService.findByGoogleKey(dto.google_key);
                if (!config) {
                    this.logger.warn(`No Google Ads integration found for google_key`);
                    return {};
                }
                companyId = config.companyId;
            }

            if (!companyId) {
                this.logger.warn('Google webhook: no companyId and no matching google_key');
                return {};
            }

            // Extract fields from user_column_data array
            const columnData = dto.user_column_data!;
            const getField = (...columnIds: string[]): string | undefined => {
                for (const id of columnIds) {
                    const col = columnData.find(
                        c => c.column_id?.toUpperCase() === id.toUpperCase()
                    );
                    if (col?.string_value) return col.string_value;
                }
                return undefined;
            };

            const name = getField('FULL_NAME', 'NAME', 'FIRST_NAME') || 'Unknown (Google Ads)';
            const lastName = getField('LAST_NAME');
            const fullName = lastName ? `${name} ${lastName}` : name;
            const phone = getField('PHONE_NUMBER', 'PHONE');
            const email = getField('EMAIL', 'USER_EMAIL');

            // Deduplication by lead_id or phone/email
            if (phone || email) {
                const existingLead = await this.leadsService.findByPhoneOrEmail(companyId, phone, email);
                if (existingLead) {
                    this.logger.log(`Google lead ${dto.lead_id} already exists (duplicate), skipping`);
                    return {};
                }
            }

            const assignedTo = await this.leadsService.getNextAssignee(companyId, 'google_ads');

            // Build notes from campaign info and extra fields
            const noteParts = [
                dto.lead_id ? `Google Lead ID: ${dto.lead_id}` : null,
                dto.campaign_id ? `Campaign: ${dto.campaign_id}` : null,
            ];
            // Include any custom fields beyond standard ones
            const standardFields = ['FULL_NAME', 'NAME', 'FIRST_NAME', 'LAST_NAME', 'PHONE_NUMBER', 'PHONE', 'EMAIL', 'USER_EMAIL'];
            for (const col of columnData) {
                if (col.column_id && !standardFields.includes(col.column_id.toUpperCase()) && col.string_value) {
                    noteParts.push(`${col.column_name || col.column_id}: ${col.string_value}`);
                }
            }
            const notes = noteParts.filter(Boolean).join(', ') || undefined;

            const lead = await this.leadsService.create({
                companyId,
                name: fullName,
                phone,
                email,
                source: LeadSource.GOOGLE_ADS,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
                notes,
            });

            this.notifyNewLead(lead, 'Google Ads');
            return {};
        }

        // Legacy/middleware format — companyId + flat fields
        if (dto.companyId) {
            const fullName = dto.name || [dto.first_name, dto.last_name].filter(Boolean).join(' ') || 'Unknown (Google)';
            const assignedTo = await this.leadsService.getNextAssignee(dto.companyId, 'google_ads');

            const lead = await this.leadsService.create({
                companyId: dto.companyId,
                name: fullName,
                phone: dto.phone,
                email: dto.email,
                source: LeadSource.GOOGLE_ADS,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
            });

            this.notifyNewLead(lead, 'Google Ads');
            return { success: true, leadId: lead.id, assignedTo };
        }

        this.logger.warn(`Unrecognized Google webhook format: ${JSON.stringify(dto).substring(0, 300)}`);
        return {};
    }

    /**
     * JustDial Lead
     * POST /api/webhooks/justdial
     */
    @Post('justdial')
    @HttpCode(HttpStatus.CREATED)
    async handleJustdial(@Body() dto: WebhookJustdialDto) {
        const assignedTo = await this.leadsService.getNextAssignee(dto.companyId, 'justdial');

        const notes = [
            dto.category ? `Category: ${dto.category}` : null,
            dto.city ? `City: ${dto.city}` : null,
            dto.area ? `Area: ${dto.area}` : null,
        ].filter(Boolean).join(', ');

        const lead = await this.leadsService.create({
            companyId: dto.companyId,
            name: dto.leadname || dto.name || 'Unknown (JustDial)',
            phone: dto.phone || dto.mobile,
            email: dto.email,
            source: LeadSource.JUSTDIAL,
            status: LeadStatus.NEW,
            assignedTo: assignedTo || undefined,
            notes: notes || undefined,
        });

        this.notifyNewLead(lead, 'JustDial');
        return { success: true, leadId: lead.id, assignedTo };
    }

    /**
     * IndiaMart Lead
     * POST /api/webhooks/indiamart?companyId=xxx
     * IndiaMART sends: { CODE: 200, STATUS: "SUCCESS", RESPONSE: { SENDER_NAME, SENDER_EMAIL, ... } }
     */
    @Post('indiamart')
    @HttpCode(HttpStatus.CREATED)
    async handleIndiamart(@Body() dto: WebhookIndiamartDto, @Query('companyId') queryCompanyId?: string) {
        // Get companyId from query param, body, or fail gracefully
        const companyId = queryCompanyId || dto.companyId;
        if (!companyId) {
            return { success: false, error: 'companyId is required as query parameter. Use: /api/webhooks/indiamart?companyId=YOUR_COMPANY_ID' };
        }

        // Extract lead data from IndiaMART wrapper format or use flat fields
        const response = dto.RESPONSE;
        const leadName = response?.SENDER_NAME || dto.leadname || dto.name || 'Unknown (IndiaMart)';
        const leadPhone = response?.SENDER_MOBILE || response?.SENDER_PHONE || dto.phone || dto.mobile;
        const leadEmail = response?.SENDER_EMAIL || dto.email;
        const leadCity = response?.SENDER_CITY || dto.city;
        const queryMessage = response?.QUERY_MESSAGE || '';
        const subject = response?.SUBJECT || dto.category || '';

        const assignedTo = await this.leadsService.getNextAssignee(companyId, 'indiamart');

        const notes = [
            subject ? `Subject: ${subject}` : null,
            leadCity ? `City: ${leadCity}` : null,
            response?.SENDER_STATE ? `State: ${response.SENDER_STATE}` : null,
            queryMessage ? `Message: ${queryMessage}` : null,
        ].filter(Boolean).join(', ');

        const lead = await this.leadsService.create({
            companyId,
            name: leadName,
            phone: leadPhone,
            email: leadEmail,
            source: LeadSource.INDIAMART,
            status: LeadStatus.NEW,
            assignedTo: assignedTo || undefined,
            notes: notes || undefined,
        });

        this.notifyNewLead(lead, 'IndiaMart');
        return { success: true, leadId: lead.id, assignedTo };
    }

    /**
     * Trade India Lead
     * POST /api/webhooks/tradeindia
     */
    @Post('tradeindia')
    @HttpCode(HttpStatus.CREATED)
    async handleTradeindia(@Body() dto: WebhookTradeindiaDto) {
        const assignedTo = await this.leadsService.getNextAssignee(dto.companyId, 'tradeindia');

        const notes = [
            dto.category ? `Category: ${dto.category}` : null,
            dto.city ? `City: ${dto.city}` : null,
        ].filter(Boolean).join(', ');

        const lead = await this.leadsService.create({
            companyId: dto.companyId,
            name: dto.sender_name || dto.name || 'Unknown (TradeIndia)',
            phone: dto.sender_phone || dto.phone,
            email: dto.sender_email || dto.email,
            source: LeadSource.TRADEINDIA,
            status: LeadStatus.NEW,
            assignedTo: assignedTo || undefined,
            notes: notes || undefined,
        });

        this.notifyNewLead(lead, 'Trade India');
        return { success: true, leadId: lead.id, assignedTo };
    }

    /**
     * Website Form Lead
     * POST /api/webhooks/website
     */
    @Post('website')
    @HttpCode(HttpStatus.CREATED)
    async handleWebsite(@Body() dto: WebhookWebsiteDto) {
        const companyId = dto.companyId ? dto.companyId.replace(/^.*companyId=/i, '').trim() : '';

        // If this is a test connection request from WordPress plugin, verify without creating a lead
        if (dto.name === 'WordPress Plugin Test Lead' || dto.message?.includes('Test Connection') || (dto as any).testConnection) {
            const companyExists = await this.leadsService.verifyCompanyExists(companyId);
            if (!companyExists) {
                throw new BadRequestException('Invalid Company ID: Company not found in Wcrm.');
            }
            return { success: true, message: 'Connection verified successfully without creating a test lead.' };
        }

        const assignedTo = await this.leadsService.getNextAssignee(companyId, 'website');

        try {
            const lead = await this.leadsService.create({
                companyId,
                name: dto.name,
                phone: dto.phone,
                email: dto.email,
                source: LeadSource.WEBSITE,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
                notes: dto.message || undefined,
            });

            this.notifyNewLead(lead, 'Website');
            return { success: true, leadId: lead.id, assignedTo };
        } catch (err: any) {
            if (err.message && (err.message.includes('foreign key constraint') || err.message.includes('ER_NO_REFERENCED_ROW'))) {
                throw new BadRequestException('Invalid Company ID: Company not found in Wcrm.');
            }
            throw err;
        }
    }
}
