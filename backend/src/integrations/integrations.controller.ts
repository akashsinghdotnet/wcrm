import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { IntegrationPlatform } from './integration-config.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async findAll(@Query('companyId') companyId: string) {
        return this.integrationsService.findAllByCompany(companyId);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    async save(@Body() dto: SaveIntegrationDto) {
        return this.integrationsService.save(dto);
    }

    @Patch(':platform/toggle')
    @Roles(UserRole.ADMIN)
    async toggle(
        @Param('platform') platform: IntegrationPlatform,
        @Body() body: { companyId: string; isActive: boolean },
    ) {
        return this.integrationsService.toggle(body.companyId, platform, body.isActive);
    }

    @Delete(':platform')
    @Roles(UserRole.ADMIN)
    async remove(
        @Param('platform') platform: IntegrationPlatform,
        @Query('companyId') companyId: string,
    ) {
        return this.integrationsService.remove(companyId, platform);
    }

    @Post('tradeindia/fetch')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    async fetchTradeIndiaLeads(@Body() body: { companyId: string }) {
        return this.integrationsService.fetchTradeIndiaLeads(body.companyId);
    }
}
