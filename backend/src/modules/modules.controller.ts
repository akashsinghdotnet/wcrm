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
            // Super admin — return all modules as active
            return {
                activeModules: this.modulesService.getAllModuleDefinitions().map(m => m.key),
                allModules: this.modulesService.getAllModuleDefinitions(),
            };
        }
        const config = await this.modulesService.getModuleConfig(companyId);
        return {
            activeModules: config.activeModules,
            allModules: this.modulesService.getAllModuleDefinitions(),
        };
    }

    @Patch()
    async updateModules(@Request() req, @Body() body: { activeModules: string[] }) {
        const companyId = req.user.companyId;
        if (!companyId) {
            return { message: 'Super admin modules cannot be modified' };
        }
        const config = await this.modulesService.updateActiveModules(companyId, body.activeModules);
        return {
            activeModules: config.activeModules,
            allModules: this.modulesService.getAllModuleDefinitions(),
        };
    }
}
