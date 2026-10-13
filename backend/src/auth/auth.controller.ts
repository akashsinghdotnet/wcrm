import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../users/user.entity';

import { Public } from './public.decorator';
import { ModulesService } from '../modules/modules.service';

import { CompaniesService } from '../companies/companies.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private modulesService: ModulesService,
        private companiesService: CompaniesService,
    ) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto, @Request() req) {
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
        const userAgent = req.headers['user-agent'] || '';
        const result = await this.authService.login(loginDto, ip?.toString(), userAgent) as any;
        if (result.requires2FA || !result.user?.companyId) {
            return result;
        }
        const activeModules = await this.modulesService.getActiveModules(result.user.companyId);
        result.user.activeModules = activeModules;
        return result;
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    @Get('login-logs')
    async getLoginLogs(@Request() req) {
        return this.authService.getLoginLogs(req.user?.companyId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERADMIN_ADMIN)
    @Post('impersonate/:companyId')
    async impersonate(@Param('companyId') companyId: string) {
        return this.authService.impersonateCompany(companyId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Request() req) {
        try {
            // Fetch full user details (including firstName, lastName, etc.)
            const user = await this.authService.getUserById(req.user.userId);
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            const isSelfHosted = process.env.DEPLOYMENT_MODE === 'self_hosted';
            const isSuperAdminRole = [
                UserRole.SUPER_ADMIN,
                UserRole.SUPERADMIN_ADMIN,
                UserRole.SUPERADMIN_STAFF,
            ].includes(user.role) || (!user.companyId && user.role === UserRole.ADMIN);

            if (isSelfHosted && isSuperAdminRole) {
                throw new UnauthorizedException('Super-Admin access is disabled in Community Edition.');
            }
            
            let companyStatus = 'active';
            if (user.companyId) {
                const company = await this.companiesService.findOne(user.companyId);
                companyStatus = company.subscriptionStatus;
                
                const isFreePlan = company.plan && Number(company.plan.priceMonthly) === 0 && Number(company.plan.priceYearly) === 0;

                if (isFreePlan) {
                    if (company.subscriptionStatus === 'past_due') {
                        await this.companiesService.update(company.id, { subscriptionStatus: 'active', renewalDate: null as any });
                        companyStatus = 'active';
                        company.renewalDate = null as any;
                    }
                } else if (company.renewalDate && new Date(company.renewalDate).getTime() < new Date().getTime()) {
                    if (company.subscriptionStatus !== 'past_due') {
                        await this.companiesService.update(company.id, { subscriptionStatus: 'past_due' });
                        companyStatus = 'past_due';
                    }
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, twoFactorSecret, ...result } = user;
            result['subscriptionStatus'] = companyStatus;
            
            if (user.companyId) {
                const company = await this.companiesService.findOne(user.companyId);
                result['planId'] = company.planId;
                result['companyName'] = company.companyName;
                result['renewalDate'] = company.renewalDate;
            }

            // Attach active modules for company users
            let activeModules: string[] = [];
            if (result.companyId) {
                activeModules = await this.modulesService.getActiveModules(result.companyId);
            }

            return { ...result, activeModules };
        } catch (error) {
            return { error: 'INTERNAL_ERROR', message: error.message, stack: error.stack };
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('renew-subscription')
    renewSubscription(@Request() req, @Body() dto: RenewSubscriptionDto) {
        return this.authService.renewSubscription(req.user, dto);
    }

    @Public()
    @Post('register-subscription')
    registerSubscription(@Body() dto: RegisterSubscriptionDto) {
        return this.authService.registerSubscription(dto);
    }

    @Public()
    @Post('verify-payment')
    verifyPayment(@Body() body: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        companyId: string;
        userId: string;
    }) {
        return this.authService.verifyRazorpayPayment(body);
    }

    @Public()
    @Post('verify-paypal-payment')
    verifyPayPalPayment(@Body() body: {
        paypal_order_id: string;
        companyId: string;
        userId: string;
    }) {
        return this.authService.verifyPayPalPayment(body);
    }

    @Public()
    @Post('login/verify-2fa')
    async loginVerify2FA(@Body() body: { userId: string; token: string }) {
        const result = await this.authService.loginVerify2FA(body.userId, body.token) as any;
        if (result.error || !result.user?.companyId) {
            return result;
        }
        const activeModules = await this.modulesService.getActiveModules(result.user.companyId);
        result.user.activeModules = activeModules;
        return result;
    }

    @Public()
    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Public()
    @Post('reset-password')
    resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }


    @UseGuards(JwtAuthGuard)
    @Post('2fa/generate')
    generate2FA(@Request() req) {
        return this.authService.generate2FASecret(req.user.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('2fa/enable')
    enable2FA(@Request() req, @Body() body: { token: string }) {
        return this.authService.enable2FA(req.user.userId, body.token);
    }

    @UseGuards(JwtAuthGuard)
    @Post('2fa/disable')
    disable2FA(@Request() req) {
        return this.authService.disable2FA(req.user.userId);
    }
}
