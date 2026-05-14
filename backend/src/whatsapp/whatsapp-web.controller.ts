import { Controller, Get, Post, Request, UseGuards, Param, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WhatsAppWebService } from './whatsapp-web.service';

import { UserRole } from '../users/user.entity';

@Controller('whatsapp-web')
@UseGuards(JwtAuthGuard)
export class WhatsAppWebController {
    constructor(private readonly webService: WhatsAppWebService) {}

    @Get('status')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async getStatus(@Request() req) {
        return this.webService.getStatus(req.user.companyId);
    }

    @Post('start')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async startClient(@Request() req) {
        return this.webService.restartClient(req.user.companyId);
    }

    @Post('logout')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async logoutClient(@Request() req) {
        return this.webService.logoutClient(req.user.companyId);
    }
}
