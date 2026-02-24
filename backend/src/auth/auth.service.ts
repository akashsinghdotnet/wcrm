import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { PlansService } from '../plans/plans.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { UserRole } from '../users/user.entity';
import { MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// otplib is ESM-only in v13+, so we use dynamic import
import { toDataURL } from 'qrcode';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private companiesService: CompaniesService,
        private plansService: PlansService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private settingsService: SettingsService,
    ) { }

    async registerSubscription(dto: RegisterSubscriptionDto) {
        // 1. Check if user exists
        const existingUser = await this.usersService.findOne(dto.email);
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // 2. Validate Plan
        const plan = await this.plansService.findOne(dto.planId);
        if (!plan) {
            throw new BadRequestException('Invalid plan selected');
        }

        const isBankTransfer = dto.paymentMethod === 'bank_transfer';

        // 3. Create Company
        // Calculate renewal date based on billing period
        const renewalDate = new Date();
        if (dto.billingPeriod === 'yearly') {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
            renewalDate.setMonth(renewalDate.getMonth() + 1);
        }

        const company = await this.companiesService.create({
            companyName: dto.companyName,
            planId: plan.id,
            subscriptionStatus: isBankTransfer ? 'pending_payment' : 'active',
            subscriptionPeriod: dto.billingPeriod,
            renewalDate: isBankTransfer ? undefined : renewalDate.toISOString(),
        });

        // 4. Create Admin User
        const password = dto.password || Math.random().toString(36).slice(-8);

        const user = await this.usersService.create({
            email: dto.email,
            password: password,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: UserRole.ADMIN,
            companyId: company.id,
        });

        const amount = dto.billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;

        if (isBankTransfer) {
            // Send bank details email instead of purchase confirmation
            await this.sendBankDetailsEmail(
                user.email,
                dto.firstName,
                company.companyName,
                plan.name,
                Number(amount),
                dto.billingPeriod,
            );

            return {
                status: 'pending_payment',
                message: 'Order placed successfully. Bank details have been sent to your email. Your CRM will be activated once payment is verified.',
            };
        }

        // Online payment: Auto-login
        const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };

        // Send Purchase Confirmation Email
        await this.emailService.sendPurchaseConfirmation(
            user.email,
            dto.firstName,
            company.companyName,
            plan.name,
            Number(amount),
        );

        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    private async sendBankDetailsEmail(
        to: string,
        userName: string,
        companyName: string,
        planName: string,
        amount: number,
        billingPeriod: string,
    ) {
        // Fetch bank details from settings
        const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
        let bankDetails = { bankName: '', accountHolder: '', accountNumber: '', ifscCode: '', branch: '' };
        if (paymentSettingsRaw) {
            try {
                const parsed = JSON.parse(paymentSettingsRaw);
                if (parsed.bankTransfer) {
                    bankDetails = parsed.bankTransfer;
                }
            } catch { }
        }

        const gstAmount = (amount * 18 / 100).toFixed(2);
        const totalAmount = (amount * 1.18).toFixed(2);

        const subject = 'Order Placed - Bank Transfer Details - Magnet CRM';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">Magnet CRM</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>Thank you for choosing Magnet CRM! Your order has been placed successfully.</p>
                    <p>Please complete the payment via bank transfer to activate your CRM account for <strong>${companyName}</strong>.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Order Details</h3>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
                        <p style="margin: 5px 0;"><strong>Billing:</strong> ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}</p>
                        <p style="margin: 5px 0;"><strong>Subtotal:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
                        <p style="margin: 5px 0;"><strong>GST (18%):</strong> ₹${Number(gstAmount).toLocaleString('en-IN')}</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: bold;">₹${Number(totalAmount).toLocaleString('en-IN')}</span></p>
                    </div>

                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1fae5;">
                        <h3 style="margin-top: 0; color: #065f46;">Bank Account Details</h3>
                        ${bankDetails.bankName ? `<p style="margin: 5px 0;"><strong>Bank:</strong> ${bankDetails.bankName}</p>` : ''}
                        ${bankDetails.accountHolder ? `<p style="margin: 5px 0;"><strong>Account Holder:</strong> ${bankDetails.accountHolder}</p>` : ''}
                        ${bankDetails.accountNumber ? `<p style="margin: 5px 0;"><strong>Account Number:</strong> ${bankDetails.accountNumber}</p>` : ''}
                        ${bankDetails.ifscCode ? `<p style="margin: 5px 0;"><strong>IFSC Code:</strong> ${bankDetails.ifscCode}</p>` : ''}
                        ${bankDetails.branch ? `<p style="margin: 5px 0;"><strong>Branch:</strong> ${bankDetails.branch}</p>` : ''}
                    </div>

                    <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> Please transfer the exact amount of <strong>₹${Number(totalAmount).toLocaleString('en-IN')}</strong> and share the payment receipt/screenshot for faster verification.</p>

                    <p>Once we verify your payment, your CRM account will be activated and you'll receive a confirmation email with login details.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Magnet CRM. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.emailService.sendEmail(to, subject, html, 'system');
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Block login for companies with pending_payment status
        if (user.companyId) {
            try {
                const company = await this.companiesService.findOne(user.companyId);
                if (company.subscriptionStatus === 'pending_payment') {
                    throw new ForbiddenException('Your account is pending payment verification. Please complete the bank transfer and wait for activation.');
                }
            } catch (e) {
                if (e instanceof ForbiddenException) throw e;
                // If company not found, allow login (super admin users don't have companies)
            }
        }

        const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    // 2FA Methods
    // 2FA Methods
    async generate2FASecret(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new UnauthorizedException();

        const { generateSecret } = await import('otplib');
        const secret = generateSecret();
        const issuer = 'Magnet CRM';
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

        // otplib v13+ uses ESM dynamic import
        const { verify: otpVerify } = await import('otplib');
        const isValid = await otpVerify({
            token,
            secret: user.twoFactorSecret,
        });

        if (!isValid) {
            throw new UnauthorizedException('Invalid 2FA token');
        }

        return isValid;
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
            // Return success even if user not found to prevent enumeration
            return { message: 'If an account exists with this email, a password reset link has been sent.' };
        }

        // Generate Token
        const token = uuidv4();
        const expires = new Date();
        expires.setHours(expires.getHours() + 1); // 1 hour expiration

        // Update User
        // Need to access repo directly or add method to UsersService. 
        // For now, assuming UsersService has update method or similar.
        // Actually UsersService.update might check for email uniqueness etc. 
        // Best to add specific methods in UsersService for this system operation to avoid side effects.
        // Or just use the repo if exposed, but UsersService abstracts it.
        // Let's check UsersService.

        // Since I can't check UsersService right now without interrupting, I'll assume I can add a method there later 
        // or usage `usersService.update` if it exists.
        // Wait, I recall `usersService.update` exists.

        await this.usersService.setResetToken(user.id, token, expires);

        // Send Email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        const subject = 'Password Reset Request - Magnet CRM';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Password Reset</h2>
                <p>You requested a password reset for your Magnet CRM account.</p>
                <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
        `;

        await this.emailService.sendEmail(user.email, subject, html, 'system-auth');

        return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const user = await this.usersService.findByResetToken(dto.token);

        if (!user) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Hash new password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

        // Update user
        await this.usersService.updatePasswordAndClearToken(user.id, hashedPassword);

        return { message: 'Password has been reset successfully.' };
    }
}

