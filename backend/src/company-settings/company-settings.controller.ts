import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Public } from '../auth/public.decorator';

@Controller('company-settings')
export class CompanySettingsController {
    constructor(private readonly service: CompanySettingsService) { }

    // Get a setting for the logged-in company admin
    @Get(':key')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async get(@Param('key') key: string, @Request() req) {
        const setting = await this.service.get(req.user.companyId, key);
        return { key, value: setting?.value || null };
    }

    // Save a setting for the logged-in company admin
    @Patch(':key')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async upsert(
        @Param('key') key: string,
        @Body() body: { value: string },
        @Request() req,
    ) {
        const setting = await this.service.upsert(req.user.companyId, key, body.value);
        return { key, value: setting.value };
    }

    // Public endpoint — used by event booking page to read payment methods (secrets stripped)
    @Public()
    @Get('public/:companyId/payment')
    async getPublicPayment(@Param('companyId') companyId: string) {
        return this.service.getPublicPaymentSettings(companyId);
    }
}
