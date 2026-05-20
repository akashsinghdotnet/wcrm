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
import { BillingService } from '../billing/billing.service';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
    private readonly logger = new Logger(CompaniesController.name);

    constructor(
        private readonly companiesService: CompaniesService,
        private readonly emailService: EmailService,
        private readonly usersService: UsersService,
        private readonly billingService: BillingService,
    ) { }

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    async create(@Body() createCompanyDto: CreateCompanyDto) {
        const savedCompany = await this.companiesService.create(createCompanyDto);

        // Auto-generate a system invoice if a plan is assigned
        if (savedCompany.planId) {
            try {
                const company = await this.companiesService.findOne(savedCompany.id);
                if (company.plan) {
                    const price = company.subscriptionPeriod === 'yearly'
                        ? Number(company.plan.priceYearly)
                        : Number(company.plan.priceMonthly);

                    const isFreePlan = Number(company.plan.priceMonthly) === 0 && Number(company.plan.priceYearly) === 0;

                    if (!isFreePlan && price > 0) {
                        const gstAmount = Math.round(price * 18) / 100;
                        const totalAmount = Math.round((price + gstAmount) * 100) / 100;
                        const now = new Date();

                        await this.billingService.createSystemInvoice({
                            targetCompanyId: company.id,
                            amount: totalAmount,
                            subtotal: price,
                            tax: gstAmount,
                            invoiceDate: now,
                            dueDate: now,
                            month: now.toLocaleString('default', { month: 'short', year: 'numeric' }),
                            status: company.subscriptionStatus === 'active' ? 'paid' : 'pending',
                            items: [{
                                description: `MagnetCRM ${company.plan.name} Plan (${company.subscriptionPeriod})`,
                                quantity: 1,
                                rate: price,
                                amount: price,
                            }],
                            notes: 'Auto-generated invoice for plan subscription (created by superadmin)',
                        });

                        this.logger.log(`Auto-generated system invoice for company ${company.companyName} (${company.id})`);
                    }
                }
            } catch (err) {
                this.logger.error(`Failed to auto-generate invoice for company ${savedCompany.id}: ${err.message}`);
                // Don't fail the company creation if invoice generation fails
            }
        }

        return savedCompany;
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

        // Auto-generate invoice on activation
        try {
            if (company.plan) {
                const price = company.subscriptionPeriod === 'yearly'
                    ? Number(company.plan.priceYearly)
                    : Number(company.plan.priceMonthly);

                const isFreePlan = Number(company.plan.priceMonthly) === 0 && Number(company.plan.priceYearly) === 0;

                if (!isFreePlan && price > 0) {
                    const gstAmount = Math.round(price * 18) / 100;
                    const totalAmount = Math.round((price + gstAmount) * 100) / 100;
                    const now = new Date();

                    await this.billingService.createSystemInvoice({
                        targetCompanyId: company.id,
                        amount: totalAmount,
                        subtotal: price,
                        tax: gstAmount,
                        invoiceDate: now,
                        dueDate: now,
                        month: now.toLocaleString('default', { month: 'short', year: 'numeric' }),
                        status: 'paid',
                        items: [{
                            description: `MagnetCRM ${company.plan.name} Plan (${company.subscriptionPeriod}) — Activation`,
                            quantity: 1,
                            rate: price,
                            amount: price,
                        }],
                        notes: 'Auto-generated invoice on account activation (by superadmin)',
                    });

                    this.logger.log(`Auto-generated activation invoice for company ${company.companyName}`);
                }
            }
        } catch (err) {
            this.logger.error(`Failed to auto-generate activation invoice for company ${id}: ${err.message}`);
        }

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
