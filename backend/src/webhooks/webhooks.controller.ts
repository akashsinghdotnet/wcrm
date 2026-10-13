import { Controller, Post, Get, Body, HttpCode, HttpStatus, Query, Logger, Res, BadRequestException } from '@nestjs/common';
import type { Response as HttpResponse } from 'express';
import { LeadsService } from '../leads/leads.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { WebhookWebsiteDto } from './dto/webhook-website.dto';

/**
 * Public webhook endpoints (no JWT required).
 * External services like Meta Lead Ads and Website / WordPress forms
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
     */
    @Post('meta')
    @HttpCode(HttpStatus.OK)
    async handleMetaWebhook(@Body() body: any) {
        this.logger.log(`Meta webhook received: ${JSON.stringify(body).substring(0, 300)}`);

        // Check for Facebook leadgen event structure
        if (body.object === 'page' && Array.isArray(body.entry)) {
            for (const entry of body.entry) {
                const pageId = entry.id;
                if (!Array.isArray(entry.changes)) continue;

                for (const change of entry.changes) {
                    if (change.field === 'leadgen') {
                        const { leadgen_id, form_id, page_id } = change.value || {};
                        this.logger.log(`Processing Meta leadgen_id: ${leadgen_id}, form: ${form_id}, page: ${page_id || pageId}`);

                        try {
                            await this.integrationsService.processMetaLeadgenEvent(
                                leadgen_id,
                                page_id || pageId,
                            );
                        } catch (err: any) {
                            this.logger.error(`Failed to process Meta lead: ${err.message}`);
                        }
                    }
                }
            }
            return { status: 'ok' };
        }

        // Direct / Middleware format: companyId + name/phone/email
        if (body.companyId && (body.name || body.phone)) {
            const assignedTo = await this.leadsService.getNextAssignee(body.companyId, 'meta_ads');
            const lead = await this.leadsService.create({
                companyId: body.companyId,
                name: body.name || 'Unknown (Meta Ads)',
                phone: body.phone,
                email: body.email,
                source: LeadSource.META_ADS,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
                notes: body.form_name ? `Form: ${body.form_name}` : undefined,
            });
            this.notifyNewLead(lead, 'Meta Ads');
            return { success: true, leadId: lead.id, assignedTo };
        }

        this.logger.warn(`Unrecognized Meta webhook format: ${JSON.stringify(body).substring(0, 300)}`);
        return { status: 'ok' };
    }

    /**
     * Website Form Lead (WordPress Plugin / Custom Web Form)
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
