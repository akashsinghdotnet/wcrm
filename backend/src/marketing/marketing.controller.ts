import { Controller, Get, Post, Body, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketingService } from './marketing.service';
import { SaveSettingsDto, SendEmailDto } from './marketing.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingController {
    constructor(private readonly marketingService: MarketingService) { }

    @Get('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN)
    async getSettings(@Request() req) {
        // Super Admin gets their own settings (companyId = null)
        // Client Admin gets their company settings
        return this.marketingService.getSettings(req.user.companyId);
    }

    @Post('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN)
    async saveSettings(@Request() req, @Body() dto: SaveSettingsDto) {
        return this.marketingService.saveSettings(dto, req.user.companyId);
    }

    @Post('send')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN)
    @UseInterceptors(FilesInterceptor('files'))
    async sendEmail(@Request() req, @Body() dto: SendEmailDto, @UploadedFiles() files: Array<any>) {
        return this.marketingService.sendEmail(dto, req.user, files);
    }
}
