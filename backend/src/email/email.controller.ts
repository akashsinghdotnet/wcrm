import { Controller, Get, Put, Body, UseGuards, Post, Query, Request, Param } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class EmailController {
    constructor(private readonly emailService: EmailService) { }

    @Get('config')
    @Roles(UserRole.SUPER_ADMIN) // Only Super Admin can change system SMTP config
    async getConfig() {
        return this.emailService.getConfig();
    }

    @Put('config')
    @Roles(UserRole.SUPER_ADMIN)
    async saveConfig(@Body() config: any) {
        return this.emailService.saveConfig(config);
    }

    @Post('config/test')
    @Roles(UserRole.SUPER_ADMIN)
    async testConfig(@Body() config: any) {
        return this.emailService.testConfig(config);
    }

    @Get('logs')
    async getLogs(@Request() req) {
        // user.companyId is null for Super Admin -> returns all (or filter by null if we wanted system only)
        // For Admin, it returns their company logs
        return this.emailService.getLogs(req.user.companyId);
    }

    @Post('send')
    async sendManualEmail(@Body() body: { to: string; subject: string; html: string }) {
        return this.emailService.sendEmail(body.to, body.subject, body.html, 'super_admin');
    }

    @Get('templates')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    async getTemplates() {
        return this.emailService.getTemplates();
    }

    @Put('templates/:id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    async updateTemplate(@Param('id') id: string, @Body() data: { subject: string; body: string }) {
        return this.emailService.updateTemplate(id, data);
    }
}
