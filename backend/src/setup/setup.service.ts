import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Company } from '../companies/company.entity';
import { InitializeSetupDto } from './dto/initialize-setup.dto';
import { ModulesService } from '../modules/modules.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SetupService {
    private readonly logger = new Logger(SetupService.name);

    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Company)
        private companyRepo: Repository<Company>,
        private modulesService: ModulesService,
        private jwtService: JwtService,
    ) { }

    async getStatus() {
        const isSelfHosted = process.env.DEPLOYMENT_MODE === 'self_hosted';
        if (!isSelfHosted) {
            // SaaS Cloud deployment is never in self-hosted setup mode
            return {
                isSelfHosted: false,
                isConfigured: true,
            };
        }

        const userCount = await this.userRepo.count();
        return {
            isSelfHosted: true,
            isConfigured: userCount > 0,
        };
    }

    async initialize(dto: InitializeSetupDto) {
        const isSelfHosted = process.env.DEPLOYMENT_MODE === 'self_hosted';
        if (!isSelfHosted) {
            throw new ForbiddenException('The setup wizard is exclusively for open-source self-hosted installations.');
        }

        const userCount = await this.userRepo.count();
        if (userCount > 0) {
            throw new BadRequestException('This Wcrm instance has already been initialized. Please log in.');
        }

        const email = dto.adminEmail.trim().toLowerCase();
        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            throw new BadRequestException('An account with this email address already exists.');
        }

        // 1. Create the Primary Company
        const companyData: Partial<Company> = {
            companyName: dto.companyName.trim(),
            email: email,
            phone: dto.phone?.trim() || undefined,
        };
        const company = this.companyRepo.create(companyData);
        const savedCompany = await this.companyRepo.save(company);

        // 2. Prepare Name
        const nameParts = dto.adminName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // 3. Hash Password & Create Company Administrator
        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
        const userData: Partial<User> = {
            email,
            password: hashedPassword,
            name: dto.adminName.trim(),
            firstName,
            lastName,
            role: UserRole.ADMIN,
            companyId: savedCompany.id,
            isActive: true,
            phone: dto.phone?.trim() || undefined,
        };
        const adminUser = this.userRepo.create(userData);
        const savedUser = await this.userRepo.save(adminUser);

        // Assign company owner
        savedCompany.ownerUserId = savedUser.id;
        await this.companyRepo.save(savedCompany);

        // 4. Initialize all default modules for this self-hosted organization
        await this.modulesService.getModuleConfig(savedCompany.id);

        this.logger.log(`[SetupService] Open-source self-hosted instance initialized for "${savedCompany.companyName}" (Admin: ${savedUser.email})`);

        // 5. Generate authentication token for instant login
        const payload = {
            email: savedUser.email,
            sub: savedUser.id,
            role: savedUser.role,
            companyId: savedCompany.id,
        };
        const token = this.jwtService.sign(payload);

        return {
            message: 'Instance initialized successfully!',
            access_token: token,
            user: {
                id: savedUser.id,
                email: savedUser.email,
                name: savedUser.name,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                role: savedUser.role,
                companyId: savedCompany.id,
                companyName: savedCompany.companyName,
                activeModules: ['WHATSAPP', 'SALES', 'AUTOMATIONS', 'CALLING', 'REPORTS'],
            },
        };
    }
}
