import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('admin')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN)
    getAdminStats(@Query('companyId') companyId: string) {
        return this.dashboardService.getAdminStats(companyId);
    }

    @Get('super-admin')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    getSuperAdminStats() {
        return this.dashboardService.getSuperAdminStats();
    }

    @Get('staff')
    getStaffStats(@Request() req) {
        return this.dashboardService.getStaffStats(req.user.companyId, req.user.userId);
    }

    @Get('reports')
    @Roles(UserRole.ADMIN)
    getReports(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
        return this.dashboardService.getReports(req.user.companyId, from, to);
    }

    @Get('employee-reports')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    getEmployeeReports(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
        return this.dashboardService.getEmployeeReports(req.user.companyId, from, to);
    }

    @Get('follow-ups')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    getFollowUps(@Request() req) {
        return this.dashboardService.getFollowUps(req.user.companyId, req.user.userId, req.user.role);
    }

    @Get('search')
    search(@Request() req, @Query('q') q: string) {
        return this.dashboardService.search(req.user.companyId, q);
    }
}
