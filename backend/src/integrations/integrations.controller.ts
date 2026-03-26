import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Res, HttpStatus } from '@nestjs/common';
import type { Response as HttpResponse } from 'express';
import { IntegrationsService } from './integrations.service';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { IntegrationPlatform } from './integration-config.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('integrations')
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

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
}
