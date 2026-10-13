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

    private async logEmail(to: string, subject: string, body: string, status: 'sent' | 'failed', error?: string, triggeredBy: string = 'system', companyId?: string): Promise<EmailLog> {
        const log = this.logRepo.create({
            to,
            subject,
            body,
            status,
            deliveryStatus: status === 'sent' ? 'sent' : 'failed',
            errorMessage: error,
            triggeredBy,
            companyId,
        });
        return this.logRepo.save(log);
    }

    async recordOpen(logId: string) {
        try {
            const log = await this.logRepo.findOne({ where: { id: logId } });
            if (!log) return;
            log.openedAt = log.openedAt || new Date();
            log.openCount = (log.openCount || 0) + 1;
            if (log.deliveryStatus !== 'clicked') {
                log.deliveryStatus = 'opened';
            }
            await this.logRepo.save(log);
        } catch (err) {
            this.logger.error(`Error recording email open for log ${logId}: ${err.message}`);
        }
    }

    async recordClick(logId: string, url?: string): Promise<string> {
        const defaultTarget = process.env.FRONTEND_URL || 'https://app.wcrm.si';
        const targetUrl = url || defaultTarget;
        try {
            const log = await this.logRepo.findOne({ where: { id: logId } });
            if (log) {
                log.clickedAt = log.clickedAt || new Date();
                log.clickCount = (log.clickCount || 0) + 1;
                log.openedAt = log.openedAt || new Date();
                log.openCount = (log.openCount || 0) + 1;
                log.deliveryStatus = 'clicked';
                await this.logRepo.save(log);
            }
        } catch (err) {
            this.logger.error(`Error recording email click for log ${logId}: ${err.message}`);
        }
        return targetUrl;
    }

    async getAnalytics(companyId?: string) {
        const where: any = {};
        if (companyId) {
            where.companyId = companyId;
        }
        const logs = await this.logRepo.find({ where });
        const totalSent = logs.length;
        const delivered = logs.filter(l => l.status === 'sent').length;
        const opened = logs.filter(l => (l.openCount || 0) > 0 || l.openedAt).length;
        const clicked = logs.filter(l => (l.clickCount || 0) > 0 || l.clickedAt).length;
        const failed = logs.filter(l => l.status === 'failed').length;

        const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
        const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0;

        return {
            totalSent,
            delivered,
            opened,
            clicked,
            failed,
            openRate,
            clickRate,
        };
    }

    async sendEmail(to: string, subject: string, html: string, triggeredBy: string = 'system', companyId?: string) {
        let initialLog: EmailLog | null = null;
        try {
            // Create initial email log record to obtain tracking logId
            initialLog = await this.logEmail(to, subject, html, 'sent', undefined, triggeredBy, companyId);

            const logId = initialLog?.id || '';
            const backendUrl = process.env.BACKEND_URL || 'https://app.wcrm.si/api';
            const openTrackingUrl = `${backendUrl}/email/track/open/${logId}`;
            const trackingPixel = `<img src="${openTrackingUrl}" width="1" height="1" style="display:none;width:1px;height:1px;opacity:0;" alt="" />`;

            // Wrap href links for click tracking
            let trackedHtml = html.replace(/href=["'](https?:\/\/[^"']+)["']/gi, (match, originalUrl) => {
                const clickTrackingUrl = `${backendUrl}/email/track/click/${logId}?url=${encodeURIComponent(originalUrl)}`;
                return `href="${clickTrackingUrl}"`;
            });

            // Append tracking pixel
            if (trackedHtml.includes('</body>')) {
                trackedHtml = trackedHtml.replace('</body>', `${trackingPixel}</body>`);
            } else {
                trackedHtml = `${trackedHtml}${trackingPixel}`;
            }

            let transporter: any;
            let from = `"Wcrm" <noreply@wcrm.com>`;
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
                    from = `"${companySettings.fromName || 'Wcrm Support'}" <${fromEmail}>`;
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
                    from = `"${config.fromName || 'Wcrm'}" <${fromEmail}>`;
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
                    from = `"${systemSettings.fromName || 'Wcrm'}" <${fromEmail}>`;
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
                    from = `"Wcrm" <${process.env.SMTP_USER}>`;
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
                html: trackedHtml,
            });

            this.logger.log(`Email sent successfully: ${info.messageId}`);
            initialLog.body = trackedHtml;
            initialLog.status = 'sent';
            initialLog.deliveryStatus = 'sent';
            await this.logRepo.save(initialLog);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error(`Failed to send email to=${to}: ${error.message}`, error.stack);
            if (initialLog) {
                initialLog.status = 'failed';
                initialLog.deliveryStatus = 'failed';
                initialLog.errorMessage = error.message;
                await this.logRepo.save(initialLog);
            }
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
                type: 'lead_assignment',
                subject: `🎯 New Lead Assigned: {{leadName}} ({{source}})`,
                body: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; color: #f8fafc;">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🎯 New Lead Assigned!</h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">A new lead has been assigned to you in {{platform}}</p>
                </div>
                
                <div style="padding: 28px 24px;">
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #cbd5e1;">Hi <strong style="color: #ffffff;">{{assigneeName}}</strong>,</p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">You have received a new lead inquiry. Here are the details:</p>

                    <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #ffffff; font-weight: 700; border-bottom: 1px solid #334155; padding-bottom: 12px;">{{leadName}}</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; width: 120px;">Phone:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{phone}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Email:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{email}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Source:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{source}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Company:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{company}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Location:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{location}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Notes:</td><td style="padding: 8px 0; color: #cbd5e1; font-size: 13px;">{{notes}}</td></tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin: 32px 0 16px 0;">
                        <a href="https://app.wcrm.si/leads" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                            🚀 View Lead in {{platform}}
                        </a>
                    </div>
                </div>

                <div style="background-color: #090d16; padding: 20px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} {{platform}}. Automated Sales Notification.</p>
                </div>
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
            platform: 'Wcrm', dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`
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
            userName, companyName, planName, platform: 'Wcrm', loginUrl
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
            platform: 'Wcrm', loginUrl
        }, defaultSubject, defaultHtml);
        
        return this.sendEmail(to, subject, body, 'system');
    }

    async sendEmailChangeVerification(to: string, userName: string, otp: string, companyId?: string) {
        const defaultSubject = `Verify your new email address`;
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #25D366;">Wcrm</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>We received a request to change your Wcrm account email address to this one.</p>
                    <p>Please use the following verification code to confirm this change. The code is valid for 10 minutes.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;">If you did not request this change, please ignore this email.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Wcrm. All rights reserved.</p>
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
                    <h1 style="color: #25D366;">Wcrm</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>This is a security notification to let you know that the email address associated with your Wcrm account has been successfully changed.</p>
                    
                    <p style="color: #dc2626; font-size: 14px;">If you did not authorize this change, please contact your administrator or Wcrm support immediately to secure your account.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Wcrm. All rights reserved.</p>
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
            userName, companyName, planName, platform: 'Wcrm',
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
                <h2 style="color: #25D366;">Password Reset</h2>
                <p>Hi <strong>{{userName}}</strong>,</p>
                <p>You requested a password reset for your {{platform}} account.</p>
                <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{resetLink}}" style="background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('forgot_password', {
            userName, resetLink, platform: 'Wcrm'
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system-auth', companyId);
    }

    async sendRenewalConfirmation(to: string, userName: string, companyName: string, planName: string, amount: number, period?: string) {
        const defaultSubject = 'Subscription Renewed - {{platform}}';
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Subscription Renewed</h2>
                <p>Hi <strong>{{userName}}</strong>,</p>
                <p>Your subscription for <strong>{{companyName}}</strong> has been renewed successfully.</p>
                <p><strong>Plan:</strong> {{planName}}</p>
                <p><strong>Amount:</strong> ₹{{amount}}</p>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('renewal_confirmation', {
            userName, companyName, planName, amount: Number(amount).toLocaleString('en-IN'), platform: 'Wcrm'
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system');
    }

    async sendRenewalReminder(to: string, userName: string, companyName: string, planName: string, amount: number, period?: string, daysLeft?: number) {
        const defaultSubject = 'Subscription Renewal Reminder - {{platform}}';
        const defaultHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #25D366;">Renewal Reminder</h2>
                <p>Hi <strong>{{userName}}</strong>,</p>
                <p>Your subscription for <strong>{{companyName}}</strong> on plan <strong>{{planName}}</strong> is due for renewal${daysLeft ? ` in ${daysLeft} days` : ' soon'}.</p>
                <p><strong>Amount:</strong> ₹{{amount}}</p>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} {{platform}}. All rights reserved.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('renewal_reminder', {
            userName, companyName, planName, amount: Number(amount).toLocaleString('en-IN'), platform: 'Wcrm'
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system');
    }

    async sendLeadAssignmentEmail(to: string, assigneeName: string, lead: any, companyId?: string) {
        const sourceFormatted = (lead.source || 'Manual').toString().replace(/_/g, ' ').toUpperCase();
        const leadCompany = [lead.designation, lead.companyName].filter(Boolean).join(' at ') || 'N/A';
        const leadLocation = [lead.city, lead.state].filter(Boolean).join(', ') || 'N/A';

        const defaultSubject = '🎯 New Lead Assigned: {{leadName}} ({{source}})';
        const defaultHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; color: #f8fafc;">
                <div style="background: linear-gradient(135deg, #128C7E 0%, #25D366 100%); padding: 32px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🎯 New Lead Assigned!</h1>
                    <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">A new lead has been assigned to you in Wcrm</p>
                </div>
                
                <div style="padding: 28px 24px;">
                    <p style="margin: 0 0 20px 0; font-size: 15px; color: #cbd5e1;">Hi <strong style="color: #ffffff;">{{assigneeName}}</strong>,</p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.5;">You have received a new lead inquiry. Here are the details:</p>

                    <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 24px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #ffffff; font-weight: 700; border-bottom: 1px solid #334155; padding-bottom: 12px;">{{leadName}}</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px; width: 120px;">Phone:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{phone}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Email:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{email}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Source:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{source}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Company:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{company}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Location:</td><td style="padding: 8px 0; color: #f8fafc; font-size: 14px; font-weight: 600;">{{location}}</td></tr>
                            <tr><td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Notes:</td><td style="padding: 8px 0; color: #cbd5e1; font-size: 13px;">{{notes}}</td></tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin: 32px 0 16px 0;">
                        <a href="https://app.wcrm.si/leads" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #128C7E 0%, #25D366 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);">
                            🚀 View Lead in Wcrm
                        </a>
                    </div>
                </div>

                <div style="background-color: #090d16; padding: 20px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} {{platform}}. Automated Sales Notification.</p>
                </div>
            </div>
        `;

        const { subject, body } = await this.renderTemplate('lead_assignment', {
            assigneeName,
            leadName: lead.name || 'New Lead',
            phone: lead.phone || 'N/A',
            email: lead.email || 'N/A',
            source: sourceFormatted,
            company: leadCompany,
            location: leadLocation,
            notes: lead.notes || 'N/A',
            platform: 'Wcrm',
        }, defaultSubject, defaultHtml);

        return this.sendEmail(to, subject, body, 'system', companyId);
    }
}
