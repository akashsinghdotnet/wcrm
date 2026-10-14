import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleConfig } from './module-config.entity';
import { Company } from '../companies/company.entity';

export const ALL_MODULES = [
    { key: 'SALES', label: 'Sales & Pipeline', description: 'Leads management, pipeline view, and deal tracking', icon: 'kanban' },
    { key: 'WHATSAPP', label: 'WhatsApp', description: 'WhatsApp messaging, chats, and broadcast campaigns', icon: 'message-circle' },
    { key: 'CALLING', label: 'Calling', description: 'Phone calling integration with Twilio', icon: 'phone' },
    { key: 'REPORTS', label: 'Reports & Analytics', description: 'Advanced reports, dashboards, and analytics', icon: 'bar-chart' },
];

@Injectable()
export class ModulesService {
    private readonly logger = new Logger(ModulesService.name);

    constructor(
        @InjectRepository(ModuleConfig)
        private moduleConfigRepo: Repository<ModuleConfig>,
        @InjectRepository(Company)
        private companyRepo: Repository<Company>,
    ) {}

    async getModuleConfig(companyId: string): Promise<ModuleConfig> {
        let config = await this.moduleConfigRepo.findOne({ where: { companyId } });
        if (!config) {
            // Create default config with all modules enabled
            config = this.moduleConfigRepo.create({
                companyId,
                activeModules: ALL_MODULES.map(m => m.key),
            });
            config = await this.moduleConfigRepo.save(config);
        } else {
            // Auto-add any newly registered modules that didn't exist when this config was created
            const allKeys = ALL_MODULES.map(m => m.key);
            const newModules = allKeys.filter(k => !config!.activeModules.includes(k));
            if (newModules.length > 0) {
                config.activeModules = [...config.activeModules, ...newModules];
                config = await this.moduleConfigRepo.save(config);
                this.logger.log(`Auto-added new modules [${newModules.join(', ')}] for company ${companyId}`);
            }
        }
        return config;
    }

    async getActiveModules(companyId: string): Promise<string[]> {
        const config = await this.getModuleConfig(companyId);
        return config.activeModules || [];
    }

    async updateActiveModules(companyId: string, modules: string[]): Promise<ModuleConfig> {
        // Validate module keys
        const validKeys = ALL_MODULES.map(m => m.key);
        const filtered = modules.filter(m => validKeys.includes(m));

        let config = await this.moduleConfigRepo.findOne({ where: { companyId } });
        if (!config) {
            config = this.moduleConfigRepo.create({ companyId, activeModules: filtered });
        } else {
            config.activeModules = filtered;
        }
        return this.moduleConfigRepo.save(config);
    }

    async hasModule(companyId: string, moduleKey: string): Promise<boolean> {
        const modules = await this.getActiveModules(companyId);
        return modules.includes(moduleKey);
    }

    getAllModuleDefinitions() {
        return ALL_MODULES;
    }
}
