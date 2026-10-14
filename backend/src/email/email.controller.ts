import { Controller, Get, Put, Body, UseGuards, Post, Query, Request, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { UserRole } from '../users/user.entity';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class EmailController {
    constructor(private readonly emailService: EmailService) { }

    @Get('track/open/:logId')
    @Public()
    async trackOpen(@Param('logId') logId: string, @Res() res: Response) {
        await this.emailService.recordOpen(logId);
        const transparentGif = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64',
        );
        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': transparentGif.length.toString(),
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        });
        res.send(transparentGif);
    }

    @Get('track/click/:logId')
    @Public()
    async trackClick(@Param('logId') logId: string, @Query('url') url: string, @Res() res: Response) {
        const redirectUrl = await this.emailService.recordClick(logId, url);
        res.redirect(302, redirectUrl);
    }

    @Get('analytics')
    async getAnalytics(@Request() req) {
        return this.emailService.getAnalytics(req.user?.companyId);
    }

    @Get('config')
    @Roles(UserRole.ADMIN)
    async getConfig() {
        return this.emailService.getConfig();
    }

    @Put('config')
    @Roles(UserRole.ADMIN)
    async saveConfig(@Body() config: any) {
        return this.emailService.saveConfig(config);
    }

    @Post('config/test')
    @Roles(UserRole.ADMIN)
    async testConfig(@Body() config: any) {
        return this.emailService.testConfig(config);
    }

    @Get('logs')
    async getLogs(@Request() req) {
        return this.emailService.getLogs(req.user?.companyId);
    }

    @Post('send')
    async sendManualEmail(@Body() body: { to: string; subject: string; html: string }, @Request() req) {
        return this.emailService.sendEmail(body.to, body.subject, body.html, req.user?.userId || 'system', req.user?.companyId);
    }

    @Get('templates')
    @Roles(UserRole.ADMIN)
    async getTemplates() {
        return this.emailService.getTemplates();
    }

    @Put('templates/:id')
    @Roles(UserRole.ADMIN)
    async updateTemplate(@Param('id') id: string, @Body() data: { subject: string; body: string }) {
        return this.emailService.updateTemplate(id, data);
    }
}
