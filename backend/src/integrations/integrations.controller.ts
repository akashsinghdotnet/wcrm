import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Res, HttpStatus, Logger } from '@nestjs/common';
import type { Response as HttpResponse } from 'express';
import { IntegrationsService } from './integrations.service';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { IntegrationPlatform } from './integration-config.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

import { EmailParserService } from './email-parser.service';

@Controller('integrations')
export class IntegrationsController {
    constructor(
        private readonly integrationsService: IntegrationsService,
        private readonly emailParserService: EmailParserService
    ) { }

    // ── Meta / Facebook Lead Ads Webhook (no JWT — Meta calls this directly) ─

    @Get('meta/webhook')
    verifyMetaWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.challenge') challenge: string,
        @Query('hub.verify_token') verifyToken: string,
        @Res() res: HttpResponse,
    ) {
        const result = this.integrationsService.verifyMetaWebhook(mode, challenge, verifyToken);
        if (result !== null) {
            return res.status(HttpStatus.OK).send(result);
        }
        return res.status(HttpStatus.FORBIDDEN).json({ message: 'Verification failed' });
    }

    @Post('meta/webhook')
    async handleMetaLeadgenWebhook(@Body() body: any, @Res() res: HttpResponse) {
        // Always return 200 immediately — Meta expects a fast response
        res.status(HttpStatus.OK).json({ received: true });

        try {
            const entries = body?.entry || [];
            for (const entry of entries) {
                const changes = entry?.changes || [];
                for (const change of changes) {
                    if (change.field === 'leadgen') {
                        const leadgenId = change.value?.leadgen_id;
                        const pageId = change.value?.page_id;
                        if (leadgenId && pageId) {
                            await this.integrationsService.processMetaLeadgenEvent(String(leadgenId), String(pageId));
                        }
                    }
                }
            }
        } catch { }
    }

    // ── Protected routes (require JWT) ──────────────────────────────────────

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get('status')
    async getActiveStatus(@Request() req) {
        const configs = await this.integrationsService.findAllByCompany(req.user.companyId);
        const status: Record<string, boolean> = {};
        for (const cfg of configs) {
            if (cfg.isActive) {
                status[cfg.platform] = true;
            }
        }
        return status;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async findAll(@Query('companyId') companyId: string) {
        return this.integrationsService.findAllByCompany(companyId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post()
    @Roles(UserRole.ADMIN)
    async save(@Body() dto: SaveIntegrationDto) {
        return this.integrationsService.save(dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Patch(':platform/toggle')
    @Roles(UserRole.ADMIN)
    async toggle(
        @Param('platform') platform: IntegrationPlatform,
        @Body() body: { companyId: string; isActive: boolean },
    ) {
        return this.integrationsService.toggle(body.companyId, platform, body.isActive);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Delete(':platform')
    @Roles(UserRole.ADMIN)
    async remove(
        @Param('platform') platform: IntegrationPlatform,
        @Query('companyId') companyId: string,
    ) {
        return this.integrationsService.remove(companyId, platform);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('tradeindia/fetch')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async fetchTradeIndiaLeads(@Body() body: { companyId: string }) {
        return this.integrationsService.fetchTradeIndiaLeads(body.companyId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('indiamart/fetch')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async fetchIndiaMartLeads(@Body() body: { companyId: string }) {
        return this.integrationsService.fetchIndiaMartLeads(body.companyId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('email-parser/test')
    @Roles(UserRole.ADMIN)
    async testEmailParserConnection(@Body() credentials: Record<string, any>) {
        return this.emailParserService.testConnection(credentials);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('meta/test')
    @Roles(UserRole.ADMIN)
    async testMetaConnection(@Body() credentials: Record<string, any>) {
        return this.integrationsService.testMetaConnection(credentials);
    }

    // ── Centralized Meta OAuth flow ──────────────────────────────────────────

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get('meta/oauth-url')
    @Roles(UserRole.ADMIN)
    getMetaOauthUrl(@Request() req) {
        const clientId = (process.env.META_CENTRAL_APP_ID || '').replace(/[\"\\']/g, '').trim();
        const redirectUri = encodeURIComponent('https://api.magnetcrm.com/api/integrations/meta/callback');
        const state = req.user.companyId; // Pass client's company ID in state
        
        const configId = (process.env.META_CENTRAL_CONFIG_ID || '').replace(/[\"\\']/g, '').trim();
        let url = '';
        if (configId) {
            url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&config_id=${configId}&state=${state}`;
        } else {
            url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=pages_show_list,leads_retrieval,pages_read_engagement,pages_manage_ads,pages_manage_metadata&state=${state}`;
        }
        return { url };
    }

    @Get('meta/callback')
    async handleMetaOauthCallback(
        @Query('code') code: string,
        @Query('state') companyId: string,
        @Res() res: HttpResponse,
    ) {
        const logger = new Logger('IntegrationsController');
        logger.log(`Received Meta OAuth Callback: companyId=${companyId}`);
        if (!code || !companyId) {
            logger.warn('Missing authorization code or state (companyId) in Meta callback');
            return res.status(HttpStatus.BAD_REQUEST).send('<h3>Error: Missing authorization code or state.</h3>');
        }

        try {
            const pages = await this.integrationsService.exchangeMetaCodeAndGetPages(code);
            logger.log(`Meta OAuth Success: Exchanged code and retrieved ${pages.length} pages for companyId=${companyId}`);
            
            // Render popup redirect HTML to post message to parent window and close popup
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>Meta Authentication Successful</title></head>
                <body>
                    <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                        <h2>Authentication Successful!</h2>
                        <p>Connecting to Magnet CRM... You can close this window now.</p>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({
                                type: 'META_OAUTH_SUCCESS',
                                pages: ${JSON.stringify(pages)}
                            }, '*');
                        }
                        window.close();
                    </script>
                </body>
                </html>
            `;
            return res.status(HttpStatus.OK).type('text/html').send(html);
        } catch (error: any) {
            logger.error(`Meta OAuth Failed for companyId=${companyId}: ${error.message}`);
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>Meta Authentication Failed</title></head>
                <body>
                    <div style="text-align: center; margin-top: 50px; font-family: sans-serif; color: red;">
                        <h2>Authentication Failed</h2>
                        <p>${error.message}</p>
                    </div>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({
                                type: 'META_OAUTH_FAILED',
                                error: ${JSON.stringify(error.message)}
                            }, '*');
                        }
                        setTimeout(() => window.close(), 4000);
                    </script>
                </body>
                </html>
            `;
            return res.status(HttpStatus.OK).type('text/html').send(html);
        }
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('meta/subscribe')
    @Roles(UserRole.ADMIN)
    async subscribeMetaPage(
        @Body() body: {
            companyId: string;
            pageId: string;
            pageAccessToken: string;
            pageName: string;
            userAccessToken: string;
        }
    ) {
        return this.integrationsService.subscribeMetaPage(body);
    }
}
