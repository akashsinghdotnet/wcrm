import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Public } from '../auth/public.decorator';

@Controller('coupons')
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    // ─── Admin endpoints ───

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    findAll() {
        return this.couponsService.findAll();
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    create(@Body() body: any) {
        return this.couponsService.create({
            code: body.code?.toUpperCase()?.trim(),
            type: body.type || 'percentage',
            value: Number(body.value),
            maxUses: body.maxUses ? Number(body.maxUses) : undefined,
            expiresAt: body.expiresAt || null,
            description: body.description || null,
            isActive: body.isActive !== false,
            billingCycle: body.billingCycle || 'both',
            isFirstCycleOnly: body.isFirstCycleOnly !== false,
            maxUsesPerClient: body.maxUsesPerClient ? Number(body.maxUsesPerClient) : 1,
            applicablePlanId: body.applicablePlanId || null,
        });
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    update(@Param('id') id: string, @Body() body: any) {
        return this.couponsService.update(id, body);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    remove(@Param('id') id: string) {
        return this.couponsService.remove(id);
    }

    @Patch(':id/toggle')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    toggle(@Param('id') id: string) {
        return this.couponsService.toggleActive(id);
    }

    // ─── Public endpoint for checkout ───

    @Post('validate')
    @Public()
    async validate(@Body() body: { code: string; billingCycle?: string; planId?: string; companyId?: string; isRenewal?: boolean }) {
        return this.couponsService.validate(body.code, body.billingCycle, body.planId, body.companyId, body.isRenewal);
    }
}
