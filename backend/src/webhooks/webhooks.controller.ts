import { Controller, Post, Get, Body, HttpCode, HttpStatus, Query, Logger } from '@nestjs/common';
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
 * call these URLs to push new leads into MagnetCRM.
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
    ) {
        const VERIFY_TOKEN = 'magnet-crm';
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            this.logger.log('Meta webhook verification successful');
            return parseInt(challenge);
        }
        this.logger.warn(`Meta webhook verification failed: mode=${mode}, token=${token}`);
        return 'Verification failed';
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
            const assignedTo = await this.leadsService.getNextAssignee(body.companyId);
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
     * Google Ads Lead
     * POST /api/webhooks/google
     */
    @Post('google')
    @HttpCode(HttpStatus.CREATED)
    async handleGoogle(@Body() dto: WebhookGoogleDto) {
        const assignedTo = await this.leadsService.getNextAssignee(dto.companyId);

        const fullName = dto.name || [dto.first_name, dto.last_name].filter(Boolean).join(' ') || 'Unknown (Google)';

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

    /**
     * JustDial Lead
     * POST /api/webhooks/justdial
     */
    @Post('justdial')
    @HttpCode(HttpStatus.CREATED)
    async handleJustdial(@Body() dto: WebhookJustdialDto) {
        const assignedTo = await this.leadsService.getNextAssignee(dto.companyId);

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

        const assignedTo = await this.leadsService.getNextAssignee(companyId);

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
        const assignedTo = await this.leadsService.getNextAssignee(dto.companyId);

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
        const assignedTo = await this.leadsService.getNextAssignee(dto.companyId);

        const lead = await this.leadsService.create({
            companyId: dto.companyId,
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
    }
}
