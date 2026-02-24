import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MarketingSettings } from './marketing-settings.entity';
import { SaveSettingsDto, SendEmailDto, MarketingAudience } from './marketing.dto';
import * as nodemailer from 'nodemailer';
import { UsersService } from '../users/users.service';
import { LeadsService } from '../leads/leads.service';
import { EmailLog } from '../email/email-log.entity';

@Injectable()
export class MarketingService {
    private readonly logger = new Logger(MarketingService.name);

    constructor(
        @InjectRepository(MarketingSettings)
        private marketingSettingsRepo: Repository<MarketingSettings>,
        @InjectRepository(EmailLog)
        private emailLogRepo: Repository<EmailLog>,
        private usersService: UsersService,
        private leadsService: LeadsService,
    ) { }

    async saveSettings(dto: SaveSettingsDto, companyId?: string): Promise<MarketingSettings> {
        const whereCondition: any = { companyId: companyId || IsNull() };
        let settings = await this.marketingSettingsRepo.findOne({ where: whereCondition });

        if (!settings) {
            settings = new MarketingSettings();
            settings.companyId = companyId || null;
        }

        settings.smtpHost = dto.smtpHost;
        settings.smtpPort = dto.smtpPort;
        settings.smtpUser = dto.smtpUser;
        settings.smtpPassword = dto.smtpPassword; // Simplify: in real app, encrypt this
        settings.smtpSecure = dto.smtpSecure || false;
        settings.fromEmail = dto.fromEmail;
        settings.fromName = dto.fromName || (companyId ? 'Your Company' : 'MagnetCRM');

        return this.marketingSettingsRepo.save(settings);
    }

    async getSettings(companyId?: string): Promise<MarketingSettings | null> {
        const whereCondition: any = { companyId: companyId || IsNull() };
        return this.marketingSettingsRepo.findOne({ where: whereCondition });
    }

    private async logEmail(to: string, subject: string, body: string, status: 'sent' | 'failed', error?: string, triggeredBy: string = 'system', companyId?: string) {
        const log = this.emailLogRepo.create({
            to,
            subject,
            body,
            status,
            errorMessage: error,
            triggeredBy,
            companyId,
        });
        await this.emailLogRepo.save(log);
    }

    async sendEmail(dto: SendEmailDto, user: any, files: Array<any> = []): Promise<{ sent: number, failed: number }> {
        // 1. Get SMTP Settings (fallback to super admin settings if company has none)
        let settings = await this.getSettings(user.companyId);
        if (!settings && user.companyId) {
            // Fallback to super admin's SMTP settings
            settings = await this.getSettings(undefined);
        }
        if (!settings) {
            throw new BadRequestException('Email settings not configured. Please configure SMTP settings first.');
        }

        // 2. Create Transporter
        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpSecure, // Use saved secure setting
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPassword,
            },
        } as any);

        // 3. Verify Transporter
        try {
            await transporter.verify();
        } catch (error) {
            this.logger.error(`SMTP Connection failed: ${error.message}`);
            throw new BadRequestException(`SMTP Connection failed: ${error.message}`);
        }

        // 4. Fetch Recipients based on Audience
        let recipients: { email: string; name?: string }[] = [];

        if (user.role === 'super_admin') {
            if (dto.audience === MarketingAudience.INACTIVE_CLIENTS) {
                // Inactive Clients (isActive = false)
                // Assuming UsersService has findAll and we might need to filter manually or add a method
                const users = await this.usersService.findAll();
                recipients = users.filter(u => u.role !== 'super_admin' && !u.isActive).map(u => ({ email: u.email, name: u.email }));
            } else if (dto.audience === MarketingAudience.ACTIVE_CLIENTS) {
                // Active Clients
                const users = await this.usersService.findAll();
                recipients = users.filter(u => u.role !== 'super_admin' && u.isActive).map(u => ({ email: u.email, name: u.email }));
            } else if (dto.audience === MarketingAudience.MANUAL) {
                // Manual Recipients
                if (!dto.manualRecipients) return { sent: 0, failed: 0 };
                const emails = dto.manualRecipients.split(',').map(e => e.trim()).filter(e => e);
                recipients = emails.map(email => ({ email, name: email }));
            } else {
                // Default: ALL_CLIENTS (System Users)
                const users = await this.usersService.findAll();
                recipients = users.filter(u => u.role !== 'super_admin').map(u => ({ email: u.email, name: u.email }));
            }
        } else if (user.role === 'admin') {
            if (dto.audience === MarketingAudience.MANUAL) {
                if (!dto.manualRecipients) return { sent: 0, failed: 0 };
                const emails = dto.manualRecipients.split(',').map(e => e.trim()).filter(e => e);
                recipients = emails.map(email => ({ email, name: email }));
            } else {
                // Default: All Leads
                const leadsResult = await this.leadsService.findAll({} as any, user);
                recipients = leadsResult.data.map(l => ({ email: l.email, name: l.name }));
            }
        } else {
            throw new BadRequestException('You do not have permission to send marketing emails.');
        }

        // 5. Send Emails
        let sentCount = 0;
        let failedCount = 0;

        // Remove duplicates
        recipients = recipients.filter((v, i, a) => a.findIndex(t => (t.email === v.email)) === i);

        for (const recipient of recipients) {
            if (!recipient.email) continue;
            try {
                // Send
                await transporter.sendMail({
                    from: `"${settings.fromName}" <${settings.fromEmail}>`,
                    to: recipient.email,
                    subject: dto.subject,
                    html: dto.body,
                    attachments: files.map(f => ({
                        filename: f.originalname,
                        content: f.buffer
                    }))
                });

                // Log Success
                await this.logEmail(recipient.email, dto.subject, dto.body, 'sent', undefined, user.id, user.companyId);
                sentCount++;
            } catch (error) {
                this.logger.error(`Failed to send to ${recipient.email}: ${error.message}`);
                // Log Failure
                await this.logEmail(recipient.email, dto.subject, dto.body, 'failed', error.message, user.id, user.companyId);
                failedCount++;
            }
        }

        return { sent: sentCount, failed: failedCount };
    }
}
