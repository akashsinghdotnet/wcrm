import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException, Logger } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
    private readonly logger = new Logger(CompaniesController.name);

    constructor(
        private readonly companiesService: CompaniesService,
        private readonly emailService: EmailService,
        private readonly usersService: UsersService,
    ) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    create(@Body() createCompanyDto: CreateCompanyDto) {
        return this.companiesService.create(createCompanyDto);
    }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.SUPERADMIN_STAFF)
    findAll() {
        return this.companiesService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.companiesService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN, UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @Request() req) {
        if (req.user.role === UserRole.ADMIN && req.user.companyId !== id) {
            throw new ForbiddenException('You can only update your own company');
        }
        return this.companiesService.update(id, updateCompanyDto);
    }

    @Patch(':id/activate')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    async activate(@Param('id') id: string) {
        const company = await this.companiesService.findOne(id);
        const renewalDate = new Date();
        if (company.subscriptionPeriod === 'yearly') {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
            renewalDate.setMonth(renewalDate.getMonth() + 1);
        }
        const updated = await this.companiesService.update(id, {
            subscriptionStatus: 'active',
            renewalDate: renewalDate.toISOString(),
        });

        // Send activation confirmation email to the company admin
        try {
            const users = await this.usersService.findAll(id, UserRole.ADMIN);
            const adminUser = users[0];
            if (adminUser) {
                await this.emailService.sendActivationEmail(
                    adminUser.email,
                    adminUser.firstName || adminUser.name || adminUser.email,
                    company.companyName,
                    company.plan?.name || 'Standard',
                );
                this.logger.log(`Activation email sent to ${adminUser.email} for company ${company.companyName}`);
            }
        } catch (emailError) {
            this.logger.error(`Failed to send activation email for company ${id}: ${emailError.message}`);
            // Don't fail the activation if email fails
        }

        return updated;
    }

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    remove(@Param('id') id: string) {
        return this.companiesService.remove(id);
    }
}
