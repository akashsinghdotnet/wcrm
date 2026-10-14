import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLoginLog } from '../users/user-login-log.entity';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { toDataURL } from 'qrcode';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService,
        @InjectRepository(UserLoginLog)
        private userLoginLogRepo: Repository<UserLoginLog>,
    ) { }

    async validateUser(emailRaw: string, pass: string): Promise<any> {
        const email = emailRaw.trim().toLowerCase();
        const user = await this.usersService.findOne(email);
        if (user && await bcrypt.compare(pass, user.password)) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async resolveIpLocation(ip: string): Promise<string> {
        const cleanIp = (ip || '').toString().trim().replace(/^.*:/, '');
        if (
            !cleanIp ||
            cleanIp === '127.0.0.1' ||
            cleanIp === 'localhost' ||
            cleanIp === '::1' ||
            cleanIp.startsWith('10.') ||
            cleanIp.startsWith('192.168.') ||
            cleanIp.startsWith('172.')
        ) {
            return 'Local Network';
        }

        try {
            const res = await axios.get(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city`, { timeout: 3500 });
            if (res.data && res.data.status === 'success') {
                const parts = [res.data.city, res.data.regionName, res.data.country].filter(Boolean);
                if (parts.length > 0) return parts.join(', ');
            }
        } catch { }
        return `IP: ${cleanIp}`;
    }

    async recordLoginLog(user: any, ipAddress?: string, userAgent?: string) {
        try {
            const rawIp = (ipAddress || '').toString().trim();
            const cleanIp = rawIp.replace(/^.*:/, '') || '127.0.0.1';
            const location = await this.resolveIpLocation(cleanIp);
            const log = this.userLoginLogRepo.create({
                userId: user.id,
                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                userEmail: user.email,
                userRole: user.role,
                companyId: user.companyId || null,
                ipAddress: cleanIp,
                location: location,
                userAgent: userAgent || '',
            });
            await this.userLoginLogRepo.save(log);
        } catch (err) {
            this.logger.error(`Error saving user login log: ${err.message}`);
        }
    }

    async getLoginLogs(companyId?: string) {
        const where: any = {};
        if (companyId) {
            where.companyId = companyId;
        }
        return this.userLoginLogRepo.find({
            where,
            order: { loginAt: 'DESC' },
            take: 100,
        });
    }

    async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.recordLoginLog(user, ipAddress, userAgent);

        if (user.isTwoFactorEnabled) {
            return {
                requires2FA: true,
                userId: user.id,
            };
        }

        const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                ...user,
                subscriptionStatus: 'active',
                companyName: user.company?.companyName || 'My Business',
            },
        };
    }

    async loginVerify2FA(userId: string, token: string) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException('2FA is not enabled for this user');
        }

        const { verify: otpVerify } = await import('otplib');
        const result = await otpVerify({
            token,
            secret: user.twoFactorSecret,
        });

        if (!result || !result.valid) {
            throw new UnauthorizedException('Invalid 2FA code');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, twoFactorSecret, ...safeUser } = user;
        const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };
        return {
            access_token: this.jwtService.sign(payload),
            user: safeUser,
        };
    }

    async generate2FASecret(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException();

        const { generateSecret } = await import('otplib');
        const secret = generateSecret();
        const issuer = 'Wcrm';
        const account = user.email;
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

        await this.usersService.setTwoFactorSecret(userId, secret);

        return {
            secret,
            otpauthUrl,
            qrCode: await toDataURL(otpauthUrl),
        };
    }

    async verify2FA(userId: string, token: string) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.twoFactorSecret) {
            throw new BadRequestException('2FA is not set up');
        }

        const { verify: otpVerify } = await import('otplib');
        const result = await otpVerify({
            token,
            secret: user.twoFactorSecret,
        });

        if (!result || !result.valid) {
            throw new UnauthorizedException('Invalid 2FA token');
        }

        return true;
    }

    async enable2FA(userId: string, token: string) {
        const isValid = await this.verify2FA(userId, token);
        if (isValid) {
            await this.usersService.enableTwoFactor(userId);
            return { message: '2FA enabled successfully' };
        }
    }

    async disable2FA(userId: string) {
        await this.usersService.disableTwoFactor(userId);
        return { message: '2FA disabled successfully' };
    }

    async getUserById(userId: string) {
        return this.usersService.findById(userId);
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.usersService.findOne(dto.email);
        if (!user) {
            return { message: 'If an account exists with this email, a password reset link has been sent.' };
        }

        const token = uuidv4();
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await this.usersService.setResetToken(user.id, token, expires);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        await this.emailService.sendForgotPasswordEmail(user.email, user.firstName, resetLink);

        return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const user = await this.usersService.findByResetToken(dto.token);

        if (!user) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

        await this.usersService.updatePasswordAndClearToken(user.id, hashedPassword);

        return { message: 'Password has been reset successfully.' };
    }
}
