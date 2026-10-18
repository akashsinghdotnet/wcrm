import { Controller, Get, Patch, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) {}

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
    async getCompany(@Param('id') id: string, @Request() req) {
        if (req.user.companyId && req.user.companyId !== id) {
            throw new ForbiddenException('You do not have permission to view this company.');
        }
        return this.companiesService.findById(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async updateCompany(@Param('id') id: string, @Body() body: any, @Request() req) {
        if (req.user.companyId && req.user.companyId !== id) {
            throw new ForbiddenException('You do not have permission to update this company.');
        }
        return this.companiesService.update(id, body);
    }
}
