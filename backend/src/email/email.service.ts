import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { EmailConfig } from './email-config.entity';
import { EmailLog } from './email-log.entity';
import { MarketingSettings } from '../marketing/marketing-settings.entity';

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
    ) { }


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

    async sendEmail(to: string, subject: string, html: string, triggeredBy: string = 'system') {
        try {
            const transporter = await this.getTransporter();

            // Determine 'from' address
            let from = '"Magnet CRM" <noreply@magnetcrm.com>';

            const config = await this.configRepo.findOne({ where: {} });
            if (config) {
                from = `"${config.fromName}" <${config.fromEmail || config.user}>`;
            } else {
                const systemSettings = await this.marketingSettingsRepo.findOne({ where: { companyId: IsNull() } });
                if (systemSettings) {
                    from = `"${systemSettings.fromName}" <${systemSettings.fromEmail}>`;
                }
            }

            const info = await transporter.sendMail({
                from,
                to,
                subject,
                html,
            });

            this.logger.log(`Email sent: ${info.messageId}`);
            await this.logEmail(to, subject, html, 'sent', undefined, triggeredBy);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Failed to send email', error.stack);
            await this.logEmail(to, subject, html, 'failed', error.message, triggeredBy);
            throw error;
        }
    }


    async sendPurchaseConfirmation(
        to: string,
        userName: string,
        companyName: string,
        planName: string,
        amount: number,
        invoiceUrl?: string,
    ) {
        const subject = `Welcome to Magnet CRM - Purchase Confirmation`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">Magnet CRM</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>Thank you for choosing Magnet CRM! We are thrilled to have you on board.</p>
                    <p>Your subscription for <strong>${companyName}</strong> has been successfully activated.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Purchase Details</h3>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
                        <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹${amount.toLocaleString('en-IN')}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
                    </div>

                    <p>You can verify your specific purchase in your billing dashboard.</p>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Magnet CRM. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.sendEmail(to, subject, html, 'system');
    }

    async sendActivationEmail(
        to: string,
        userName: string,
        companyName: string,
        planName: string,
    ) {
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
        const subject = `Your Magnet CRM Account is Now Active!`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">Magnet CRM</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>Great news! Your bank transfer payment has been verified and your CRM account for <strong>${companyName}</strong> is now <span style="color: #059669; font-weight: bold;">fully active</span>.</p>

                    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1fae5;">
                        <h3 style="margin-top: 0; color: #065f46;">✅ Account Activated</h3>
                        <p style="margin: 5px 0;"><strong>Company:</strong> ${companyName}</p>
                        <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Active</span></p>
                    </div>

                    <p>You can now log in using the email and password you created during registration.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${loginUrl}" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Login Now</a>
                    </div>

                    <p style="margin-top: 30px; color: #6b7280; font-size: 13px;">If you have any questions, feel free to reach out to our support team.</p>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Magnet CRM. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.sendEmail(to, subject, html, 'system');
    }

    async sendWelcomeEmail(
        to: string,
        name: string,
        password: string,
        role: string,
        companyName?: string,
    ) {
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
        const subject = `Welcome to Magnet CRM - Your Account Details`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4F46E5;">Magnet CRM</h1>
                </div>
                <div style="color: #333333;">
                    <p>Hi <strong>${name || 'there'}</strong>,</p>
                    <p>Your account has been created on Magnet CRM${companyName ? ` for <strong>${companyName}</strong>` : ''}.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #111827;">Your Login Credentials</h3>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
                        <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                        <p style="margin: 5px 0;"><strong>Role:</strong> ${role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    </div>

                    <p style="color: #dc2626; font-size: 14px;">⚠ Please change your password after your first login for security.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
                    </div>
                </div>
                <div style="margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p>&copy; ${new Date().getFullYear()} Magnet CRM. All rights reserved.</p>
                </div>
            </div>
        `;
        return this.sendEmail(to, subject, html, 'system');
    }
}
