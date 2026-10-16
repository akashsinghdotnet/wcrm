import { Controller, Get, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModulesService } from './modules.service';

@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
    constructor(private readonly modulesService: ModulesService) {}

    @Get()
    async getModules(@Request() req) {
        const companyId = req.user.companyId;
        if (!companyId) {
            return {
                activeModules: this.modulesService.getAllModuleDefinitions().map(m => m.key),
                allModules: this.modulesService.getAllModuleDefinitions(),
            };
        }
        const activeModules = await this.modulesService.getActiveModules(companyId);
        return {
            activeModules,
            allModules: this.modulesService.getAllModuleDefinitions(),
        };
    }

    @Patch()
    async updateModules(@Request() req, @Body() body: { activeModules: string[] }) {
        const companyId = req.user.companyId;
        if (!companyId) {
            return { message: 'Company context required to update modules' };
        }
        const config = await this.modulesService.updateActiveModules(companyId, body.activeModules);
        return {
            activeModules: config.activeModules,
            allModules: this.modulesService.getAllModuleDefinitions(),
        };
    }
}
