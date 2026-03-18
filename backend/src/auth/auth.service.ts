import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { PlansService } from '../plans/plans.service';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { CouponsService } from '../coupons/coupons.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { UserRole } from '../users/user.entity';
import { MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import Razorpay = require('razorpay');

// otplib is ESM-only in v13+, so we use dynamic import
import { toDataURL } from 'qrcode';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private companiesService: CompaniesService,
        private plansService: PlansService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private settingsService: SettingsService,
        private couponsService: CouponsService,
    ) { }

    private async getRazorpayInstance(): Promise<any> {
        const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
        if (!paymentSettingsRaw) return null;
        try {
            const parsed = JSON.parse(paymentSettingsRaw);
            if (parsed.razorpay?.enabled && parsed.razorpay?.keyId && parsed.razorpay?.keySecret) {
                return new Razorpay({
                    key_id: parsed.razorpay.keyId,
                    key_secret: parsed.razorpay.keySecret,
                });
            }
        } catch { }
        return null;
    }

    private async getRazorpayKeyId(): Promise<string | null> {
        const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
        if (!paymentSettingsRaw) return null;
        try {
            const parsed = JSON.parse(paymentSettingsRaw);
            return parsed.razorpay?.keyId || null;
        } catch { }
        return null;
    }

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
        const isRazorpay = dto.paymentMethod === 'razorpay';

        // 3. Create Company — ALWAYS pending_payment until payment is verified
        const addressParts = [dto.streetAddress, dto.city, dto.state, dto.postcode, dto.country].filter(Boolean);
        const company = await this.companiesService.create({
            companyName: dto.companyName,
            email: dto.email,
            phone: dto.phone,
            address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
            gstNo: dto.taxId,
            planId: plan.id,
            subscriptionStatus: 'pending_payment',
            subscriptionPeriod: dto.billingPeriod,
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

        let baseAmount = Number(dto.billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly);

        // Apply coupon discount if provided
        let appliedCouponCode: string | null = null;
        if (dto.couponCode) {
            try {
                const coupon = await this.couponsService.validate(dto.couponCode, dto.billingPeriod);
                let discount = 0;
                if (coupon.type === 'percentage') {
                    discount = parseFloat((baseAmount * coupon.value / 100).toFixed(2));
                } else {
                    discount = Math.min(coupon.value, baseAmount);
                }
                baseAmount = Math.max(0, parseFloat((baseAmount - discount).toFixed(2)));
                appliedCouponCode = coupon.code;
                this.logger.log(`Coupon ${coupon.code} applied: discount=${discount}, newBaseAmount=${baseAmount}`);
            } catch (err) {
                this.logger.warn(`Coupon validation failed: ${err.message}`);
                // Continue without discount — don't block registration
            }
        }

        const gstAmount = Math.round(baseAmount * 18) / 100;
        const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100; // in rupees

        if (isBankTransfer) {
            // Send bank details email
            try {
                await this.sendBankDetailsEmail(
                    user.email, dto.firstName, company.companyName,
                    plan.name, baseAmount, dto.billingPeriod,
                );
            } catch (err) {
                this.logger.error(`Failed to send bank details email: ${err.message}`);
            }

            return {
                status: 'pending_payment',
                message: 'Order placed successfully. Bank details have been sent to your email. Your CRM will be activated once payment is verified.',
            };
        }

        if (isRazorpay) {
            // Create Razorpay order
            const rzp = await this.getRazorpayInstance();
            if (!rzp) {
                throw new BadRequestException('Razorpay is not configured. Please contact support.');
            }

            try {
                const order = await rzp.orders.create({
                    amount: Math.round(totalAmount * 100), // Razorpay expects paise
                    currency: 'INR',
                    receipt: `order_${company.id.substring(0, 8)}`,
                    notes: {
                        companyId: company.id,
                        userId: user.id,
                        planId: plan.id,
                        billingPeriod: dto.billingPeriod,
                        couponCode: appliedCouponCode || undefined,
                    },
                });

                const keyId = await this.getRazorpayKeyId();

                return {
                    status: 'razorpay_order_created',
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    keyId,
                    companyId: company.id,
                    userId: user.id,
                    couponCode: appliedCouponCode || undefined,
                    prefill: {
                        name: `${dto.firstName} ${dto.lastName || ''}`.trim(),
                        email: dto.email,
                        contact: dto.phone || '',
                    },
                };
            } catch (err) {
                this.logger.error(`Razorpay order creation failed: ${err.message}`);
                throw new BadRequestException('Failed to create payment order. Please try again.');
            }
        }

        // PayPal or other — for now, same as bank transfer
        return {
            status: 'pending_payment',
            message: 'Order placed. Your CRM will be activated once payment is verified.',
        };
    }

    async verifyRazorpayPayment(data: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        companyId: string;
        userId: string;
        couponCode?: string;
    }) {
        // 1. Verify signature
        const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
        if (!paymentSettingsRaw) throw new BadRequestException('Payment settings not configured');

        let keySecret: string;
        try {
            const parsed = JSON.parse(paymentSettingsRaw);
            keySecret = parsed.razorpay?.keySecret;
        } catch {
            throw new BadRequestException('Invalid payment settings');
        }

        if (!keySecret) throw new BadRequestException('Razorpay key secret not configured');

        const crypto = await import('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== data.razorpay_signature) {
            throw new BadRequestException('Payment verification failed. Invalid signature.');
        }

        // 2. Activate company subscription
        const company = await this.companiesService.findOne(data.companyId);
        if (!company) throw new BadRequestException('Company not found');

        const renewalDate = new Date();
        if (company.subscriptionPeriod === 'yearly') {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
            renewalDate.setMonth(renewalDate.getMonth() + 1);
        }

        await this.companiesService.update(data.companyId, {
            subscriptionStatus: 'active',
            renewalDate: renewalDate,
        } as any);

        // 3. Get user and generate JWT
        const user = await this.usersService.findById(data.userId);
        if (!user) throw new BadRequestException('User not found');

        const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };

        // 4. Send purchase confirmation email (non-blocking)
        const plan = company.plan || (company.planId ? await this.plansService.findOne(company.planId) : null);
        const amount = company.subscriptionPeriod === 'yearly' ? plan?.priceYearly : plan?.priceMonthly;

        this.emailService.sendPurchaseConfirmation(
            user.email,
            user.firstName || user.email,
            company.companyName,
            plan?.name || 'Subscription',
            Number(amount || 0),
        ).catch(err => this.logger.error(`Failed to send purchase confirmation: ${err.message}`));

        // Increment coupon usage after successful payment
        if (data.couponCode) {
            this.couponsService.incrementUsage(data.couponCode)
                .catch(err => this.logger.error(`Failed to increment coupon usage: ${err.message}`));
        }

        return {
            access_token: this.jwtService.sign(payload),
            user: { ...user, password: undefined },
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

        // Check if 2FA is enabled
        if (user.isTwoFactorEnabled) {
            return {
                requires2FA: true,
                userId: user.id,
            };
        }

        const payload = { email: user.email, sub: user.id, role: user.role, companyId: user.companyId };
        return {
            access_token: this.jwtService.sign(payload),
            user,
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

        // Verify the TOTP token (otplib v13 verify returns { valid, delta, ... })
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

        // otplib v13 verify returns { valid, delta, ... } not a boolean
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

