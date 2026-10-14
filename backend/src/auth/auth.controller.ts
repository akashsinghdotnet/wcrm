import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../users/user.entity';
import { Public } from './public.decorator';
import { ModulesService } from '../modules/modules.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private modulesService: ModulesService,
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
    @Roles(UserRole.ADMIN)
    @Get('login-logs')
    async getLoginLogs(@Request() req) {
        return this.authService.getLoginLogs(req.user?.companyId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Request() req) {
        const user = await this.authService.getUserById(req.user.userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, twoFactorSecret, ...result } = user;
        
        let activeModules: string[] = [];
        if (result.companyId) {
            activeModules = await this.modulesService.getActiveModules(result.companyId);
        }

        return { ...result, activeModules };
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
