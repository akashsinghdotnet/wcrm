import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ForbiddenException,
    Request,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
    constructor(
        private billingService: BillingService
    ) { }

    @Get('settings/:companyId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    async getSettings(@Request() req, @Param('companyId') companyId: string) {
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && companyId !== 'super-admin' && req.user.companyId !== companyId) {
            throw new ForbiddenException('Access denied for company.');
        }
        return this.billingService.getSettings(companyId);
    }

    @Patch('settings/:companyId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    async upsertSettings(@Request() req, @Param('companyId') companyId: string, @Body() dto: any) {
        return this.billingService.upsertSettings(companyId, dto);
    }

    @Post('system-invoice')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    createSystemInvoice(@Body() dto: any) {
        return this.billingService.createSystemInvoice(dto);
    }

    @Get('subscription-history')
    getSubscriptionHistory(@Query('companyId') companyId: string) {
        return this.billingService.getSubscriptionHistory(companyId);
    }

    @Get('global-history')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    getGlobalSubscriptionHistory() {
        return this.billingService.getGlobalBillingHistory();
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    async findOne(@Request() req, @Param('id') id: string) {
        const invoice = await this.billingService.findOne(id);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && invoice.targetCompanyId !== req.user.companyId && invoice.companyId !== req.user.companyId) {
            throw new ForbiddenException('Access denied.');
        }
        return invoice;
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    async remove(@Param('id') id: string) {
        return this.billingService.remove(id);
    }
}
