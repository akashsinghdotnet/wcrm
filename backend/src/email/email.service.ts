import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { EmailConfig } from './email-config.entity';
import { EmailLog } from './email-log.entity';
import { MarketingSettings } from '../marketing/marketing-settings.entity';
import { EmailTemplate } from './email-template.entity';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        @InjectRepository(EmailConfig)
        private configRepo: Repository<EmailConfig>,
        @InjectRepository(EmailLog)
        private logRepo: Repository<EmailLog>,
        @InjectRepository(MarketingSettings)
        private marketingSettingsRepo: Repository<MarketingSettings>,
        @InjectRepository(EmailTemplate)
        private templateRepo: Repository<EmailTemplate>,
    ) { }

    private formatRoleName(role: string): string {
        // Handle special cases for superadmin roles
        if (role === 'superadmin_admin') return 'Admin';
        if (role === 'superadmin_staff') return 'Staff';
        // For other roles, capitalize each word
        return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }


    private async getTransporter() {
        // 1. Try to get config from legacy EmailConfig (if used)
        const config = await this.configRepo.findOne({ where: {} });

        if (config) {
            return nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.isSecure,
                auth: {
                    user: config.user,
                    pass: config.pass,
                },
            });
        }

        // 2. Try to get Super Admin Marketing Settings
        const systemSettings = await this.marketingSettingsRepo.findOne({ where: { companyId: IsNull() } });
        if (systemSettings) {
            return nodemailer.createTransport({
                host: systemSettings.smtpHost,
                port: systemSettings.smtpPort,
                secure: systemSettings.smtpSecure,
                auth: {
                    user: systemSettings.smtpUser,
                    pass: systemSettings.smtpPassword,
                },
            });
        }

        // 3. Fallback to Env vars
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }


    async saveConfig(configDto: Partial<EmailConfig>) {
        let config = await this.configRepo.findOne({ where: {} });
        if (!config) {
            config = this.configRepo.create(configDto);
        } else {
            this.configRepo.merge(config, configDto);
        }
        return this.configRepo.save(config);
    }

    async getConfig() {
        return this.configRepo.findOne({ where: {} });
    }

    async testConfig(config: Partial<EmailConfig>) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: config.port,
                secure: config.isSecure,
                auth: {
                    user: config.user,
                    pass: config.pass,
                },
            });
            await transporter.verify();
            return { success: true, message: 'SMTP connection successful' };
        } catch (error) {
            this.logger.error(`SMTP test failed: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    async getLogs(companyId?: string) {
        const where: any = {};
        if (companyId) {
            where.companyId = companyId;
        }
        return this.logRepo.find({ where, order: { sentAt: 'DESC' }, take: 100 });
    }

    private async logEmail(to: string, subject: string, body: string, status: 'sent' | 'failed', error?: string, triggeredBy: string = 'system', companyId?: string) {
        const log = this.logRepo.create({
            to,
            subject,
            body,
            status,
            errorMessage: error,
            triggeredBy,
            companyId,
        });
        await this.logRepo.save(log);
    }

    async sendEmail(to: string, subject: string, html: string, triggeredBy: string = 'system', companyId?: string) {
        try {
            let transporter: any;
            let from = `"Magnet CRM" <noreply@magnetcrm.com>`;
            let settingsFound = false;

            // 1. Try company-specific settings first
            if (companyId) {
                const companySettings = await this.marketingSettingsRepo.findOne({ where: { companyId } });
                if (companySettings && companySettings.smtpHost && companySettings.smtpUser) {
                    transporter = nodemailer.createTransport({
                        host: companySettings.smtpHost,
                        port: companySettings.smtpPort,
                        secure: companySettings.smtpSecure,
                        auth: { user: companySettings.smtpUser, pass: companySettings.smtpPassword },
                    });
                    const fromEmail = companySettings.fromEmail || companySettings.smtpUser;
                    from = `"${companySettings.fromName || 'Events Team'}" <${fromEmail}>`;
                    settingsFound = true;
                }
            }

            // 2. Try legacy global config
            if (!settingsFound) {
                const config = await this.configRepo.findOne({ where: {} });
                if (config) {
                    transporter = nodemailer.createTransport({
                        host: config.host,
                        port: config.port,
                        secure: config.isSecure,
                        auth: { user: config.user, pass: config.pass },
                    });
                    const fromEmail = config.fromEmail || config.user;
                    from = `"${config.fromName || 'Magnet CRM'}" <${fromEmail}>`;
                    settingsFound = true;
                }
            }

            // 3. Try System Superadmin settings
            if (!settingsFound) {
                const systemSettings = await this.marketingSettingsRepo.findOne({ where: { companyId: IsNull() } });
                if (systemSettings && systemSettings.smtpHost && systemSettings.smtpUser) {
                    transporter = nodemailer.createTransport({
                        host: systemSettings.smtpHost,
                        port: systemSettings.smtpPort,
                        secure: systemSettings.smtpSecure,
                        auth: { user: systemSettings.smtpUser, pass: systemSettings.smtpPassword },
                    });
                    const fromEmail = systemSettings.fromEmail || systemSettings.smtpUser;
                    from = `"${systemSettings.fromName || 'Magnet CRM'}" <${fromEmail}>`;
                    settingsFound = true;
                }
            }

            if (!settingsFound) {
                // Fallback to env vars
                    transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'smtp.gmail.com',
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: false,
                        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                    });
                    if (process.env.SMTP_USER) {
                        from = `"Magnet CRM" <${process.env.SMTP_USER}>`;
                    }
                    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                        this.logger.warn('No SMTP credentials configured — email delivery will likely fail');
                    }
                }

            this.logger.log(`Sending email to=${to} subject="${subject}" from=${from}`);

            const info = await transporter.sendMail({
                from,
                to,
                subject,
                html,
            });

            this.logger.log(`Email sent successfully: ${info.messageId}`);
            await this.logEmail(to, subject, html, 'sent', undefined, triggeredBy, companyId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error(`Failed to send email to=${to}: ${error.message}`, error.stack);
            await this.logEmail(to, subject, html, 'failed', error.message, triggeredBy);
            throw error;
        }
    }


    async getTemplates() {
        const defaultTemplates = [
            {
                type: 'purchase_confirmation',
                subject: `Welcome to {{platform}} - Purchase Confirmation`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{userName}}</strong>,</p>
                    <p>Thank you for choosing {{platform}}! We are thrilled to have you on board.</p>
                    <p>Your subscription for <strong>{{companyName}}</strong> has been successfully activated.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Purchase Details</h3>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
                        <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹{{amount}}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
                    </div>

                    <p>You can verify your specific purchase in your billing dashboard.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{dashboardUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `
            },
            {
                type: 'activation',
                subject: `Your {{platform}} Account is Now Active!`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{userName}}</strong>,</p>
                    <p>Great news! Your bank transfer payment has been verified and your CRM account for <strong>{{companyName}}</strong> is now <span style="color: #059669; font-weight: bold;">fully active</span>.</p>

                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1fae5;">
                        <h3 style="margin-top: 0; color: #065f46;">✅ Account Activated</h3>
                        <p style="margin: 5px 0;"><strong>Company:</strong> {{companyName}}</p>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
                    </div>

                    <p>You can now log in using the email and password you created during registration.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{loginUrl}}" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Login Now</a>
                    </div>

                    <p style="margin-top: 30px; color: #6b7280; font-size: 13px;">If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `
            },
            {
                type: 'welcome',
                subject: `Welcome to {{platform}} - Your Account Details`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{name}}</strong>,</p>
                    <p>Your account has been created on {{platform}}{{companyClause}}.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Your Login Credentials</h3>
                        <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
                        <p style="margin: 5px 0;"><strong>Password:</strong> {{password}}</p>
                        <p style="margin: 5px 0;"><strong>Role:</strong> {{roleName}}</p>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;">⚠ Please change your password after your first login for security.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{loginUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `
            },
            {
                type: 'bank_transfer_pending',
                subject: `Order Placed - Bank Transfer Details - {{platform}}`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{userName}}</strong>,</p>
                    <p>Thank you for choosing {{platform}}! Your order has been placed successfully.</p>
                    <p>Please complete the payment via bank transfer to activate your CRM account for <strong>{{companyName}}</strong>.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Order Details</h3>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
                        <p style="margin: 5px 0;"><strong>Billing:</strong> {{billingPeriod}}</p>
                        <p style="margin: 5px 0;"><strong>Subtotal:</strong> ₹{{amount}}</p>
                        <p style="margin: 5px 0;"><strong>GST (18%):</strong> ₹{{gstAmount}}</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: bold;">₹{{totalAmount}}</span></p>
                    </div>

                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1fae5;">
                        <h3 style="margin-top: 0; color: #065f46;">Bank Account Details</h3>
                        <p style="margin: 5px 0;"><strong>Bank:</strong> {{bankName}}</p>
                        <p style="margin: 5px 0;"><strong>Account Holder:</strong> {{accountHolder}}</p>
                        <p style="margin: 5px 0;"><strong>Account Number:</strong> {{accountNumber}}</p>
                        <p style="margin: 5px 0;"><strong>IFSC Code:</strong> {{ifscCode}}</p>
                        <p style="margin: 5px 0;"><strong>Branch:</strong> {{branch}}</p>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> Please transfer the exact amount of <strong>₹{{totalAmount}}</strong> and share the payment receipt/screenshot for faster verification.</p>

                    <p>Once we verify your payment, your CRM account will be activated and you'll receive a confirmation email with login details.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `
            },
            {
                type: 'forgot_password',
                subject: `Password Reset Request - {{platform}}`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Password Reset</h2>
                <p>Hi <strong>{{userName}}</strong>,</p>
                <p>You requested a password reset for your {{platform}} account.</p>
                <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `
            },
            {
                type: 'event_booking_client',
                subject: `Booking Confirmed: {{eventName}}`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4F46E5;">Booking Confirmation</h2>
                <p>Hi <strong>{{guestName}}</strong>,</p>
                <p>Your booking for <strong>{{eventName}}</strong> has been {{status}}!</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Reference ID:</strong> {{bookingRef}}</p>
                    <p style="margin: 5px 0;"><strong>Ticket Type:</strong> {{ticketName}} (x{{quantity}})</p>
                    <p style="margin: 5px 0;"><strong>Amount:</strong> ₹{{amount}}</p>
                </div>
                
                <p>We look forward to seeing you at the event.</p>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>{{companyName}}</p>
                </div>
            </div>
        `
            },
            {
                type: 'event_booking_admin',
                subject: `New Booking Received: {{eventName}}`,
                body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #059669;">New Booking Alert</h2>
                <p>A new booking was just placed for <strong>{{eventName}}</strong>.</p>
                
                <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Guest:</strong> {{guestName}} ({{guestEmail}})</p>
                    <p style="margin: 5px 0;"><strong>Phone:</strong> {{guestPhone}}</p>
                    <p style="margin: 5px 0;"><strong>Tickets:</strong> {{ticketName}} (x{{quantity}})</p>
                    <p style="margin: 5px 0;"><strong>Total Paid:</strong> ₹{{amount}} ({{paymentMethod}})</p>
                    <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
                </div>
                <p>Check your Dashboard for full details.</p>
            </div>
        `
            }
        ];

        for (const dt of defaultTemplates) {
            const exists = await this.templateRepo.findOne({ where: { type: dt.type } });
            if (!exists) {
                const newTpl = this.templateRepo.create(dt);
                await this.templateRepo.save(newTpl);
            }
        }

        return this.templateRepo.find({ order: { type: 'ASC' } });
    }

    async updateTemplate(id: string, data: { subject: string; body: string }) {
        await this.templateRepo.update(id, data);
        return this.templateRepo.findOne({ where: { id } });
    }

    private async renderTemplate(type: string, data: Record<string, string>, defaultSubject: string, defaultBody: string) {
        let template = await this.templateRepo.findOne({ where: { type } });
        if (!template) {
            template = this.templateRepo.create({ type, subject: defaultSubject, body: defaultBody });
            await this.templateRepo.save(template);
        }

        let subject = template.subject;
        let body = template.body;

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, value);
            body = body.replace(regex, value);
        }

        return { subject, body };
    }

    async sendPurchaseConfirmation(
        to: string,
        userName: string,
        companyName: string,
        planName: string,
        amount: number,
        invoiceUrl?: string,
    ) {
        const defaultSubject = `Welcome to {{platform}} - Purchase Confirmation`;
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{userName}}</strong>,</p>
                    <p>Thank you for choosing {{platform}}! We are thrilled to have you on board.</p>
                    <p>Your subscription for <strong>{{companyName}}</strong> has been successfully activated.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Purchase Details</h3>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
                        <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹{{amount}}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
                    </div>

                    <p>You can verify your specific purchase in your billing dashboard.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{dashboardUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('purchase_confirmation', {
            userName, companyName, planName, amount: amount.toLocaleString('en-IN'),
            platform: 'Magnet CRM', dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system');
    }

    async sendActivationEmail(
        to: string,
        userName: string,
        companyName: string,
        planName: string,
    ) {
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
        const defaultSubject = `Your {{platform}} Account is Now Active!`;
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{userName}}</strong>,</p>
                    <p>Great news! Your bank transfer payment has been verified and your CRM account for <strong>{{companyName}}</strong> is now <span style="color: #059669; font-weight: bold;">fully active</span>.</p>

                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1fae5;">
                        <h3 style="margin-top: 0; color: #065f46;">✅ Account Activated</h3>
                        <p style="margin: 5px 0;"><strong>Company:</strong> {{companyName}}</p>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
                    </div>

                    <p>You can now log in using the email and password you created during registration.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{loginUrl}}" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Login Now</a>
                    </div>

                    <p style="margin-top: 30px; color: #6b7280; font-size: 13px;">If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('activation', {
            userName, companyName, planName, platform: 'Magnet CRM', loginUrl
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system');
    }

    async sendWelcomeEmail(
        to: string,
        name: string,
        password: string,
        role: string,
        companyName?: string,
    ) {
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
        const defaultSubject = `Welcome to {{platform}} - Your Account Details`;
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{name}}</strong>,</p>
                    <p>Your account has been created on {{platform}}{{companyClause}}.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Your Login Credentials</h3>
                        <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
                        <p style="margin: 5px 0;"><strong>Password:</strong> {{password}}</p>
                        <p style="margin: 5px 0;"><strong>Role:</strong> {{roleName}}</p>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;">⚠ Please change your password after your first login for security.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="{{loginUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;
        
        const { subject, body } = await this.renderTemplate('welcome', {
            name: name || 'there', email: to, password, roleName: this.formatRoleName(role),
            companyClause: companyName ? ` for <strong>${companyName}</strong>` : '',
            platform: 'Magnet CRM', loginUrl
        }, defaultSubject, defaultHtml);
        
        return this.sendEmail(to, subject, body, 'system');
    }

    async sendEmailChangeVerification(to: string, userName: string, otp: string, companyId?: string) {
        const defaultSubject = `Verify your new email address`;
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">Magnet CRM</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>We received a request to change your Magnet CRM account email address to this one.</p>
                    <p>Please use the following verification code to confirm this change. The code is valid for 10 minutes.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;">If you did not request this change, please ignore this email.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Magnet CRM. All rights reserved.</p>
                </div>
            </div>
        `;
        
        return this.sendEmail(to, defaultSubject, defaultHtml, 'system', companyId);
    }

    async sendEmailChangeAlert(to: string, userName: string, companyId?: string) {
        const defaultSubject = `Security Alert: Your email address was changed`;
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">Magnet CRM</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>This is a security notification to let you know that the email address associated with your Magnet CRM account has been successfully changed.</p>
                    
                    <p style="color: #dc2626; font-size: 14px;">If you did not authorize this change, please contact your administrator or Magnet CRM support immediately to secure your account.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Magnet CRM. All rights reserved.</p>
                </div>
            </div>
        `;
        
        return this.sendEmail(to, defaultSubject, defaultHtml, 'system', companyId);
    }

    async sendBankDetailsEmail(
        to: string,
        userName: string,
        companyName: string,
        planName: string,
        amount: number,
        billingPeriod: string,
        bankDetails: any,
    ) {
        const gstAmount = (amount * 18 / 100).toFixed(2);
        const totalAmount = (amount * 1.18).toFixed(2);

        const defaultSubject = 'Order Placed - Bank Transfer Details - {{platform}}';
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">{{platform}}</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>{{userName}}</strong>,</p>
                    <p>Thank you for choosing {{platform}}! Your order has been placed successfully.</p>
                    <p>Please complete the payment via bank transfer to activate your CRM account for <strong>{{companyName}}</strong>.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Order Details</h3>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> {{planName}}</p>
                        <p style="margin: 5px 0;"><strong>Billing:</strong> {{billingPeriod}}</p>
                        <p style="margin: 5px 0;"><strong>Subtotal:</strong> ₹{{amount}}</p>
                        <p style="margin: 5px 0;"><strong>GST (18%):</strong> ₹{{gstAmount}}</p>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>Total Amount:</strong> <span style="color: #059669; font-weight: bold;">₹{{totalAmount}}</span></p>
                    </div>

                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1fae5;">
                        <h3 style="margin-top: 0; color: #065f46;">Bank Account Details</h3>
                        <p style="margin: 5px 0;"><strong>Bank:</strong> {{bankName}}</p>
                        <p style="margin: 5px 0;"><strong>Account Holder:</strong> {{accountHolder}}</p>
                        <p style="margin: 5px 0;"><strong>Account Number:</strong> {{accountNumber}}</p>
                        <p style="margin: 5px 0;"><strong>IFSC Code:</strong> {{ifscCode}}</p>
                        <p style="margin: 5px 0;"><strong>Branch:</strong> {{branch}}</p>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;"><strong>Important:</strong> Please transfer the exact amount of <strong>₹{{totalAmount}}</strong> and share the payment receipt/screenshot for faster verification.</p>

                    <p>Once we verify your payment, your CRM account will be activated and you'll receive a confirmation email with login details.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('bank_transfer_pending', {
            userName, companyName, planName, platform: 'Magnet CRM',
            billingPeriod: billingPeriod === 'yearly' ? 'Yearly' : 'Monthly',
            amount: Number(amount).toLocaleString('en-IN'),
            gstAmount: Number(gstAmount).toLocaleString('en-IN'),
            totalAmount: Number(totalAmount).toLocaleString('en-IN'),
            bankName: bankDetails?.bankName || '',
            accountHolder: bankDetails?.accountHolder || '',
            accountNumber: bankDetails?.accountNumber || '',
            ifscCode: bankDetails?.ifscCode || '',
            branch: bankDetails?.branch || '',
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system');
    }

    async sendForgotPasswordEmail(to: string, userName: string, resetLink: string, companyId?: string) {
        const defaultSubject = 'Password Reset Request - {{platform}}';
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Password Reset</h2>
                <p>Hi <strong>{{userName}}</strong>,</p>
                <p>You requested a password reset for your {{platform}} account.</p>
                <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('forgot_password', {
            userName, resetLink, platform: 'Magnet CRM'
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system-auth', companyId);
    }

    async sendEventBookingClientEmail(to: string, data: any, companyId: string) {
        const { guestName, eventName, bookingRef, ticketName, quantity, amount, status, companyName } = data;
        const defaultSubject = `Booking Confirmed: {{eventName}}`;
        const defaultHtml = `<p>Booking confirmed for {{eventName}}.</p>`;

        const { subject, body } = await this.renderTemplate('event_booking_client', {
            guestName, eventName, bookingRef, ticketName, quantity, amount, status, companyName: companyName || 'Events Team'
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'event-booking', companyId);
    }

    async sendEventBookingAdminEmail(to: string, data: any, companyId: string) {
        const { eventName, guestName, guestEmail, guestPhone, ticketName, quantity, amount, paymentMethod, status } = data;
        const defaultSubject = `New Booking Received: {{eventName}}`;
        const defaultHtml = `<p>New booking received for {{eventName}}.</p>`;

        const { subject, body } = await this.renderTemplate('event_booking_admin', {
            eventName, guestName, guestEmail, guestPhone: guestPhone || 'N/A', ticketName, quantity, amount, paymentMethod, status
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'event-booking', companyId);
    }
}
