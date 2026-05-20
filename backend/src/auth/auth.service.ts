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
        const isPayPal = dto.paymentMethod === 'paypal';

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

        const isFreePlan = Number(plan.priceMonthly) === 0 && Number(plan.priceYearly) === 0;

        if (totalAmount === 0) {
            // Activate immediately
            let renewalDate: Date | null = new Date();
            if (isFreePlan) {
                renewalDate = null;
            } else if (dto.billingPeriod === 'yearly') {
                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
            } else {
                renewalDate.setMonth(renewalDate.getMonth() + 1);
            }

            await this.companiesService.update(company.id, {
                subscriptionStatus: 'active',
                renewalDate: renewalDate ? renewalDate.toISOString() : (null as any),
            });

            // Send purchase confirmation/welcome email
            try {
                await this.emailService.sendPurchaseConfirmation(
                    user.email,
                    dto.firstName,
                    company.companyName,
                    plan.name,
                    totalAmount
                );
                await this.emailService.sendWelcomeEmail(
                    user.email,
                    dto.firstName,
                    password,
                    user.role,
                    company.companyName
                );
            } catch (err) {
                this.logger.error(`Failed to send welcome email: ${err.message}`);
            }

            return {
                status: 'active',
                message: 'Your free plan has been activated successfully! Please check your email for login details.',
            };
        }

        if (isBankTransfer) {
            // Send bank details email
            try {
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

                await this.emailService.sendBankDetailsEmail(
                    user.email, dto.firstName, company.companyName,
                    plan.name, baseAmount, dto.billingPeriod, bankDetails
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

        if (isPayPal) {
            const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
            let paypalSettings = { clientId: '', secret: '', mode: 'sandbox' };
            if (paymentSettingsRaw) {
                try {
                    const parsed = JSON.parse(paymentSettingsRaw);
                    if (parsed.paypal) paypalSettings = parsed.paypal;
                } catch { }
            }

            if (!paypalSettings.clientId || !paypalSettings.secret) {
                throw new BadRequestException('PayPal is not configured. Please contact support.');
            }

            try {
                const isSandbox = paypalSettings.mode !== 'live';
                const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

                const auth = Buffer.from(`${paypalSettings.clientId}:${paypalSettings.secret}`).toString('base64');
                const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'grant_type=client_credentials'
                });
                
                if (!tokenRes.ok) {
                    const errText = await tokenRes.text();
                    this.logger.error(`PayPal Token Error: ${errText}`);
                    throw new Error('Invalid PayPal Credentials');
                }
                const tokenData = await tokenRes.json();

                // Fetch Live Exchange Rate (INR to USD)
                let usdAmount = (totalAmount / 84).toFixed(2); // Initial fallback
                try {
                    const rateRes = await fetch('https://open.er-api.com/v6/latest/INR');
                    if (rateRes.ok) {
                        const rateData = await rateRes.json();
                        if (rateData?.rates?.USD) {
                            usdAmount = (totalAmount * rateData.rates.USD).toFixed(2);
                            this.logger.log(`Live conversion: ₹${totalAmount} INR -> $${usdAmount} USD (Rate: ${rateData.rates.USD})`);
                        }
                    }
                } catch (err) {
                    this.logger.warn(`Failed to fetch live exchange rate, using fallback. Error: ${err.message}`);
                }

                const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${tokenData.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        intent: 'CAPTURE',
                        purchase_units: [{
                            reference_id: `order_${company.id.substring(0, 8)}`,
                            amount: {
                                currency_code: 'USD',
                                value: usdAmount
                            },
                            description: `${plan.name} Plan - ${dto.billingPeriod}`
                        }]
                    })
                });

                if (!orderRes.ok) {
                    const errText = await orderRes.text();
                    this.logger.error(`PayPal Order Error: ${errText}`);
                    throw new Error('Failed to configure PayPal order payload');
                }
                const orderData = await orderRes.json();

                return {
                    status: 'paypal_order_created',
                    orderId: orderData.id,
                    clientId: paypalSettings.clientId,
                    currency: 'USD',
                    amount: usdAmount,
                    companyId: company.id,
                    userId: user.id,
                    couponCode: appliedCouponCode || undefined,
                };
            } catch (err) {
                this.logger.error(`PayPal order creation failed: ${err.message}`);
                throw new BadRequestException(`PayPal Error: ${err.message}`);
            }
        }

        // Fallback for unknown methods
        return {
            status: 'pending_payment',
            message: 'Order placed. Your CRM will be activated once payment is verified.',
        };
    }

    async renewSubscription(user: any, dto: any) {
        // 1. Fetch Company
        const company = await this.companiesService.findOne(user.companyId);
        if (!company) {
            throw new BadRequestException('Company not found');
        }

        // 2. Validate Plan
        const plan = await this.plansService.findOne(dto.planId);
        if (!plan) {
            throw new BadRequestException('Invalid plan selected');
        }

        // Update company's pending plan details just in case they are upgrading/downgrading
        await this.companiesService.update(company.id, {
            planId: plan.id,
            subscriptionPeriod: dto.billingPeriod,
        });

        const isBankTransfer = dto.paymentMethod === 'bank_transfer';
        const isRazorpay = dto.paymentMethod === 'razorpay';
        const isPayPal = dto.paymentMethod === 'paypal';

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

        const isFreePlan = Number(plan.priceMonthly) === 0 && Number(plan.priceYearly) === 0;

        if (totalAmount === 0) {
            // Activate immediately
            let renewalDate: Date | null = new Date();
            if (isFreePlan) {
                renewalDate = null;
            } else if (dto.billingPeriod === 'yearly') {
                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
            } else {
                renewalDate.setMonth(renewalDate.getMonth() + 1);
            }

            await this.companiesService.update(company.id, {
                subscriptionStatus: 'active',
                renewalDate: renewalDate ? renewalDate.toISOString() : (null as any),
            });

            return {
                status: 'active',
                message: 'Subscription renewed successfully.',
            };
        }

        if (isBankTransfer) {
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
                    receipt: `renew_${company.id.substring(0, 8)}_${Date.now()}`,
                    notes: {
                        companyId: company.id,
                        userId: user.userId || user.id || user.sub,
                        planId: plan.id,
                        billingPeriod: dto.billingPeriod,
                        couponCode: appliedCouponCode || undefined,
                        isRenewal: 'true',
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
                    userId: user.userId || user.id || user.sub,
                    couponCode: appliedCouponCode || undefined,
                    prefill: {
                        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                        email: user.email,
                        contact: user.phone || '',
                    },
                };
            } catch (err) {
                this.logger.error(`Razorpay order creation failed: ${err.message}`);
                throw new BadRequestException('Failed to create payment order. Please try again.');
            }
        }

        if (isPayPal) {
            const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
            let paypalSettings = { clientId: '', secret: '', mode: 'sandbox' };
            if (paymentSettingsRaw) {
                try {
                    const parsed = JSON.parse(paymentSettingsRaw || "{}");
                    if (parsed.paypal) paypalSettings = parsed.paypal;
                } catch { }
            }

            if (!paypalSettings.clientId || !paypalSettings.secret) {
                throw new BadRequestException('PayPal is not configured. Please contact support.');
            }

            try {
                const isSandbox = paypalSettings.mode !== 'live';
                const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

                const auth = Buffer.from(`${paypalSettings.clientId}:${paypalSettings.secret}`).toString('base64');
                const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'grant_type=client_credentials'
                });
                
                if (!tokenRes.ok) {
                    const errText = await tokenRes.text();
                    this.logger.error(`PayPal Token Error: ${errText}`);
                    throw new Error('Invalid PayPal Credentials');
                }
                const tokenData = await tokenRes.json();

                // Fetch Live Exchange Rate (INR to USD)
                let usdAmount = (totalAmount / 84).toFixed(2); // Initial fallback
                try {
                    const rateRes = await fetch('https://open.er-api.com/v6/latest/INR');
                    if (rateRes.ok) {
                        const rateData = await rateRes.json();
                        if (rateData?.rates?.USD) {
                            usdAmount = (totalAmount * rateData.rates.USD).toFixed(2);
                            this.logger.log(`Live conversion: ₹${totalAmount} INR -> $${usdAmount} USD (Rate: ${rateData.rates.USD})`);
                        }
                    }
                } catch (err) {
                    this.logger.warn(`Failed to fetch live exchange rate, using fallback. Error: ${err.message}`);
                }

                const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${tokenData.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        intent: 'CAPTURE',
                        purchase_units: [{
                            reference_id: `renew_${company.id.substring(0, 8)}_${Date.now()}`,
                            amount: {
                                currency_code: 'USD',
                                value: usdAmount
                            },
                            description: `${plan.name} Plan - ${dto.billingPeriod}`
                        }]
                    })
                });

                if (!orderRes.ok) {
                    const errText = await orderRes.text();
                    this.logger.error(`PayPal Order Error: ${errText}`);
                    throw new Error('Failed to configure PayPal order payload');
                }
                const orderData = await orderRes.json();

                return {
                    status: 'paypal_order_created',
                    orderId: orderData.id,
                    clientId: paypalSettings.clientId,
                    currency: 'USD',
                    amount: usdAmount,
                    companyId: company.id,
                    userId: user.userId || user.id || user.sub,
                    couponCode: appliedCouponCode || undefined,
                };
            } catch (err) {
                this.logger.error(`PayPal order creation failed: ${err.message}`);
                throw new BadRequestException(`PayPal Error: ${err.message}`);
            }
        }

        // Fallback for unknown methods
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
        try {
            await this.emailService.sendPurchaseConfirmation(
                user.email,
                user.firstName || user.email,
                company.companyName,
                plan ? plan.name : 'Subscription',
                Number(amount || 0)
            );
        } catch (err) {
            this.logger.error(`Failed to send purchase confirmation email: ${err.message}`);
        }

        return {
            message: 'Payment verified and account activated',
            access_token: this.jwtService.sign(payload),
            user: { ...user, companyId: user.companyId },
        };
    }

    async verifyPayPalPayment(data: {
        paypal_order_id: string;
        companyId: string;
        userId: string;
        couponCode?: string;
    }) {
        const paymentSettingsRaw = await this.settingsService.getValue('payment_settings');
        if (!paymentSettingsRaw) throw new BadRequestException('Payment settings not configured');

        let paypalSettings = { clientId: '', secret: '', mode: 'sandbox' };
        try {
            const parsed = JSON.parse(paymentSettingsRaw);
            if (parsed.paypal) paypalSettings = parsed.paypal;
        } catch {
            throw new BadRequestException('Invalid payment settings');
        }

        if (!paypalSettings.clientId || !paypalSettings.secret) {
            throw new BadRequestException('PayPal is not properly configured');
        }

        const isSandbox = paypalSettings.mode !== 'live';
        const baseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

        // 1. Capture the payment
        try {
            const auth = Buffer.from(`${paypalSettings.clientId}:${paypalSettings.secret}`).toString('base64');
            const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });
            const tokenData = await tokenRes.json();

            const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${data.paypal_order_id}/capture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!captureRes.ok) {
                const errorData = await captureRes.json();
                throw new Error(errorData.message || 'Capture failed');
            }
            
            const captureData = await captureRes.json();
            if (captureData.status !== 'COMPLETED') {
                throw new Error('Payment not completed');
            }
        } catch (err) {
            this.logger.error(`PayPal capture failed: ${err.message}`);
            throw new BadRequestException('Payment verification failed. Payment was not completed.');
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

        // 4. Send purchase confirmation email
        const plan = company.plan || (company.planId ? await this.plansService.findOne(company.planId) : null);
        const amount = company.subscriptionPeriod === 'yearly' ? plan?.priceYearly : plan?.priceMonthly;
        try {
            await this.emailService.sendPurchaseConfirmation(
                user.email,
                user.firstName || user.email,
                company.companyName,
                plan ? plan.name : 'Subscription',
                Number(amount || 0)
            );
        } catch (err) {
            this.logger.error(`Failed to send purchase confirmation email: ${err.message}`);
        }

        return {
            message: 'PayPal Payment verified and account activated',
            access_token: this.jwtService.sign(payload),
            user: { ...user, companyId: user.companyId },
        };
    }



    async validateUser(email: string, pass: string): Promise<any> {
        // Get all users with this email (might be multiple: superadmin + company)
        const users = await this.usersService.findAllByEmail(email);

        // Try to validate password against each user
        for (const user of users) {
            if (await bcrypt.compare(pass, user.password)) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...result } = user;
                return result;
            }
        }

        return null;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Block login for companies with pending_payment status
        let companyStatus = 'active';
        let companyPlanId: string | null = null;
        let companyName: string | null = null;
        let renewalDate: Date | null = null;
        if (user.companyId) {
            try {
                const company = await this.companiesService.findOne(user.companyId);
                companyStatus = company.subscriptionStatus;
                companyPlanId = company.planId;
                companyName = company.companyName;
                renewalDate = company.renewalDate;
                if (company.subscriptionStatus === 'pending_payment') {
                    throw new ForbiddenException('Your account is pending payment verification. Please complete the bank transfer and wait for activation.');
                }
                
                const isFreePlan = company.plan && Number(company.plan.priceMonthly) === 0 && Number(company.plan.priceYearly) === 0;

                if (isFreePlan) {
                    if (company.subscriptionStatus === 'past_due') {
                        await this.companiesService.update(company.id, { subscriptionStatus: 'active', renewalDate: null as any });
                        companyStatus = 'active';
                        renewalDate = null;
                    }
                } else if (company.renewalDate && new Date(company.renewalDate).getTime() < new Date().getTime()) {
                    if (company.subscriptionStatus !== 'past_due') {
                        await this.companiesService.update(company.id, { subscriptionStatus: 'past_due' });
                        companyStatus = 'past_due';
                    }
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
            user: { 
                ...user, 
                subscriptionStatus: companyStatus,
                planId: companyPlanId,
                companyName,
                renewalDate
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

        await this.emailService.sendForgotPasswordEmail(user.email, user.firstName, resetLink);

        return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    async impersonateCompany(companyId: string) {
        const users = await this.usersService.findAll(companyId);
        const adminUser = users.find(u => u.role === UserRole.ADMIN) || users[0];
        
        if (!adminUser) {
            throw new BadRequestException('No users found for this company to impersonate.');
        }

        const payload = { email: adminUser.email, sub: adminUser.id, role: adminUser.role, companyId: adminUser.companyId };
        return {
            access_token: this.jwtService.sign(payload),
            user: adminUser,
        };
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

