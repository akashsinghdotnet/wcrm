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
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ForbiddenException, Request } from '@nestjs/common';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
    constructor(
        private billingService: BillingService,
        private usersService: UsersService
    ) { }

    private async checkInvoiceAccess(req: any) {
        if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN || req.user.role === UserRole.ADMIN || req.user.role === UserRole.MANAGER) return;
        if (req.user.role === UserRole.STAFF) {
            const user = await this.usersService.findById(req.user.userId);
            if (!user || !user.canCreateInvoices) {
                throw new ForbiddenException('You do not have permission to access invoices.');
            }
        } else {
            throw new ForbiddenException('Access denied.');
        }
    }

    @Get('settings/:companyId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async getSettings(@Request() req, @Param('companyId') companyId: string) {
        await this.checkInvoiceAccess(req);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        // Allow any authenticated user to read super-admin settings (used in subscription invoices)
        // But restrict access to other companies' settings
        if (!isSuperadminTeam && companyId !== 'super-admin' && req.user.companyId !== companyId) {
            throw new ForbiddenException('Access denied for company.');
        }
        return this.billingService.getSettings(companyId);
    }

    @Patch('settings/:companyId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
    async upsertSettings(@Request() req, @Param('companyId') companyId: string, @Body() dto: any) {
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && req.user.companyId !== companyId) {
            throw new ForbiddenException('Access denied for company.');
        }
        return this.billingService.upsertSettings(companyId, dto);
    }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async create(@Request() req, @Body() dto: CreateInvoiceDto) {
        await this.checkInvoiceAccess(req);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam) {
            dto.companyId = req.user.companyId;
        }
        return this.billingService.create(dto);
    }

    @Post('system-invoice')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    createSystemInvoice(@Body() dto: any) {
        return this.billingService.createSystemInvoice(dto);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async findAll(
        @Request() req,
        @Query('companyId') paramCompanyId?: string,
        @Query('status') status?: string,
        @Query('clientId') clientId?: string,
    ) {
        await this.checkInvoiceAccess(req);
        let companyId = paramCompanyId;
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam) {
            companyId = req.user.companyId;
        }
        return this.billingService.findAll(companyId, status, clientId);
    }

    @Get('revenue')
    revenueByMonth(@Query('companyId') companyId: string) {
        return this.billingService.revenueByMonth(companyId);
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

    @Get('pending')
    totalPending(@Query('companyId') companyId: string) {
        return this.billingService.totalPending(companyId);
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async findOne(@Request() req, @Param('id') id: string) {
        await this.checkInvoiceAccess(req);
        const invoice = await this.billingService.findOne(id);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && invoice.companyId !== req.user.companyId && invoice.targetCompanyId !== req.user.companyId) {
            throw new ForbiddenException('Access denied.');
        }
        return invoice;
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
        await this.checkInvoiceAccess(req);
        const invoice = await this.billingService.findOne(id);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && invoice.companyId !== req.user.companyId) {
            throw new ForbiddenException('Access denied.');
        }
        return this.billingService.update(id, dto);
    }

    @Patch(':id/pay')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async markPaid(@Request() req, @Param('id') id: string) {
        await this.checkInvoiceAccess(req);
        const invoice = await this.billingService.findOne(id);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && invoice.companyId !== req.user.companyId) {
            throw new ForbiddenException('Access denied.');
        }
        return this.billingService.markPaid(id);
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async remove(@Request() req, @Param('id') id: string) {
        await this.checkInvoiceAccess(req);
        const invoice = await this.billingService.findOne(id);
        const isSuperadminTeam = req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.SUPERADMIN_ADMIN;
        if (!isSuperadminTeam && invoice.companyId !== req.user.companyId) {
            throw new ForbiddenException('Access denied.');
        }
        return this.billingService.remove(id);
    }
}
