import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleConfig } from './module-config.entity';
import { Company } from '../companies/company.entity';

export const ALL_MODULES = [
    { key: 'SALES', label: 'Sales & Pipeline', description: 'Leads management, pipeline view, and client tracking', icon: 'kanban' },
    { key: 'FINANCE', label: 'Finance & Invoicing', description: 'Create invoices, manage billing, and track payments', icon: 'receipt' },
    { key: 'MARKETING', label: 'Marketing', description: 'Email campaigns, marketing automation, and outreach', icon: 'mail' },
    { key: 'WHATSAPP', label: 'WhatsApp', description: 'WhatsApp messaging, chats, and broadcast campaigns', icon: 'message-circle' },
    { key: 'CALLING', label: 'Calling', description: 'Phone calling integration with Twilio', icon: 'phone' },
    { key: 'SUPPORT', label: 'Support & Tickets', description: 'Customer support tickets and issue tracking', icon: 'ticket' },
    { key: 'REPORTS', label: 'Reports & Analytics', description: 'Advanced reports, dashboards, and analytics', icon: 'bar-chart' },
    { key: 'APPOINTMENTS', label: 'Appointments & Booking', description: 'Calendar integration, meeting types, and public booking pages', icon: 'calendar' },
    { key: 'EVENTS', label: 'Event Booking', description: 'Create and manage events, ticket types, and event bookings', icon: 'calendar-days' },
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
        let active = config.activeModules || [];

        // Fetch company plan to strictly enforce plan features
        const company = await this.companyRepo.findOne({
            where: { id: companyId },
            relations: ['plan'],
        });

        if (company && company.plan) {
            const planFeatures = company.plan.features || [];
            // Intersect plan features with the company's configured active modules
            active = active.filter(mod => planFeatures.includes(mod));
        }

        return active;
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
