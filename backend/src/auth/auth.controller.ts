import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

import { Public } from './public.decorator';
import { ModulesService } from '../modules/modules.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private modulesService: ModulesService,
    ) { }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, twoFactorSecret, ...result } = user;

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
    loginVerify2FA(@Body() body: { userId: string; token: string }) {
        return this.authService.loginVerify2FA(body.userId, body.token);
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
