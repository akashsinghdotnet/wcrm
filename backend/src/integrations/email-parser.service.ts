import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationPlatform } from './integration-config.entity';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
import { Cron } from '@nestjs/schedule';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

@Injectable()
export class EmailParserService {
    private readonly logger = new Logger(EmailParserService.name);

    constructor(
        @InjectRepository(IntegrationConfig)
        private configRepo: Repository<IntegrationConfig>,
        @Inject(forwardRef(() => LeadsService))
        private leadsService: LeadsService,
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService,
    ) { }

    @Cron('*/5 * * * *')
    async autoFetchEmailLeads() {
        const activeConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.EMAIL_PARSER, isActive: true },
        });

        for (const config of activeConfigs) {
            try {
                await this.processInbox(config);
            } catch (error: any) {
                this.logger.error(`Email Parser crashed for company ${config.companyId}: ${error.message}`);
            }
        }
    }

    async testConnection(credentials: Record<string, any>) {
        const { host, port, username, password, tls } = credentials || {};
        if (!host || !username || !password) {
            return { success: false, message: 'Missing required credentials (host, username, password)' };
        }

        const client = new ImapFlow({
            host,
            port: Number(port) || 993,
            secure: tls !== 'false',
            auth: {
                user: username,
                pass: password?.replace(/\s+/g, ''),
            },
            logger: false
        });

        try {
            await client.connect();
            await client.logout();
            return { success: true, message: 'Connection successful!' };
        } catch (error: any) {
            this.logger.error(`Test Connection failed for ${username}: ${error.message}`);
            return { success: false, message: error.message || 'Connection failed' };
        }
    }

    private async processInbox(config: IntegrationConfig) {
        const { host, port, username, password, tls } = config.credentials || {};
        if (!host || !username || !password) return;

        const client = new ImapFlow({
            host,
            port: Number(port) || 993,
            secure: tls !== 'false',
            auth: {
                user: username,
                pass: password?.replace(/\s+/g, ''),
            },
            logger: false
        });

        try {
            await client.connect();
            
            // Lock INBOX
            const lock = await client.getMailboxLock('INBOX');
            try {
                // Search for unseen messages and batch them to prevent memory crashes
                const unseenSeq = await client.search({ seen: false });
                if (!unseenSeq || unseenSeq.length === 0) {
                    return; // Nothing to process
                }

                // Process up to 50 emails max per 5-minute cron sweep to maintain server health
                const batch = unseenSeq.slice(-50); // Get the 50 newest unseen
                const messages = client.fetch(batch, { source: true, uid: true });
                let importCount = 0;

                for await (const message of messages) {
                    try {
                        if (!message.source) continue;
                        const parsed: any = await simpleParser(message.source as any);
                        const extractedList = this.extractLeads(parsed.text || parsed.html || '');

                        for (const extracted of extractedList) {
                            if (!extracted.phone && !extracted.email) continue;
                            
                            // Check for duplicates
                            const dup = await this.leadsService.findByPhoneOrEmail(config.companyId, extracted.phone, extracted.email);
                            if (dup) continue;

                            const assignedTo = await this.leadsService.getNextAssignee(config.companyId, extracted.source.toLowerCase());

                            await this.leadsService.create({
                                companyId: config.companyId,
                                name: extracted.name || 'Unknown User',
                                phone: extracted.phone,
                                email: extracted.email,
                                source: extracted.source as LeadSource || LeadSource.WEBSITE,
                                status: LeadStatus.NEW,
                                assignedTo: assignedTo || undefined,
                                notes: extracted.notes,
                            });
                            importCount++;
                        }
                        
                        // Mark message as seen
                        await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
                    } catch (parseError: any) {
                        this.logger.error(`Error processing email message: ${parseError.message}`);
                    }
                }

                if (importCount > 0) {
                    this.logger.log(`Successfully imported ${importCount} new leads via Email Parser for company ${config.companyId}`);
                    config.lastSyncAt = new Date();
                    await this.configRepo.save(config);
                }
            } finally {
                lock.release();
            }
        } catch (error: any) {
            this.logger.error(`IMAP Connection Failed for ${username}: ${error.message}`);
            // Disable config automatically if auth fails repeatedly to avoid locking account?
            if (error.message.includes('AUTHENTICATIONFAILED')) {
                this.logger.warn(`Disabling Email Parser for ${config.companyId} due to bad credentials`);
                config.isActive = false;
                await this.configRepo.save(config);
            }
        } finally {
            try {
                await client.logout();
            } catch (e) {}
        }
    }

    private extractLeads(content: string): Array<{name: string, phone: string, email: string, source: string, notes?: string}> {
        // Strip HTML tags and try to decode if it is URL-encoded (like IndiaMART templates)
        let text = content;
        try {
            if (text.includes('%20') || text.includes('%0A')) {
                text = decodeURIComponent(text);
            }
        } catch(e) {}
        
        text = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
        const leads: Array<{name: string, phone: string, email: string, source: string, notes?: string}> = [];

        // ── TradeIndia Buy Lead parser ────────────────────────────────────────
        if (text.includes('TradeIndia') || text.toLowerCase().includes('buyer inquiry')) {
            const nameMatch  = text.match(/Buyer Name:?\s*([A-Za-z\s]+?)(?:Company|Email|Mobile|City)/i);
            const mobileMatch = text.match(/(?:Mobile(?:\s*No)?|Phone):?\s*([\+\d\-\s]{10,15})/i);
            const emailMatch  = text.match(/Email(?:\s*Id)?:?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
            const reqMatch    = text.match(/Product Requirements?:?\s*(.+?)(?:Quantity|Expected|View)/i);

            if (mobileMatch || emailMatch) {
                leads.push({
                    name:   nameMatch  ? nameMatch[1].trim()                      : 'TradeIndia Buyer',
                    phone:  mobileMatch ? mobileMatch[1].replace(/\D/g, '')       : '',
                    email:  emailMatch  ? emailMatch[1].trim()                     : '',
                    source: LeadSource.TRADEINDIA,
                    notes:  reqMatch   ? `[Buy Now Lead] Buy Lead: ${reqMatch[1].trim()}`        : '[Buy Now Lead] Imported via Email Parser',
                });
            }
        }

        // ── JustDial lead parser ──────────────────────────────────────────────
        if (text.includes('Justdial') || text.includes('Just Dial') || text.includes('JustDial')) {
            const nameMatch   = text.match(/Name:?\s*([A-Za-z\s]+?)(?:Mobile|Phone|Email|City)/i);
            const mobileMatch = text.match(/(?:Mobile(?:\s*No)?|Phone):?\s*([\+\d\-\s]{10,15})/i);
            const emailMatch  = text.match(/Email(?:\s*Id)?:?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
            const reqMatch    = text.match(/Enquiry Details:?\s*(.+?)(?:Regards|Thanks)/i);

            if (mobileMatch || emailMatch) {
                leads.push({
                    name:   nameMatch   ? nameMatch[1].trim()                     : 'JustDial User',
                    phone:  mobileMatch ? mobileMatch[1].replace(/\D/g, '')      : '',
                    email:  emailMatch  ? emailMatch[1].trim()                    : '',
                    source: LeadSource.JUSTDIAL,
                    notes:  reqMatch    ? `[Buy Now Lead] Requirement: ${reqMatch[1].trim()}`   : '[Buy Now Lead] Imported via Email Parser',
                });
            }
        }

        // ── IndiaMART lead parser ─────────────────────────────────────────────
        if (text.includes('IndiaMART') || text.includes('indiamart') || text.toLowerCase().includes('indiamart buyer')) {
            const nameMatch   = text.match(/Name:?\s*([A-Za-z\s]+?)(?:Mobile|Phone|Email|Company|City)/i) || text.match(/Buyer(?: Name)?:?\s*([A-Za-z\s]+?)(?:Mobile|Phone|Email|Company|City)/i);
            const mobileMatch = text.match(/(?:Mobile|Phone|Mob)(?:\s*No)?[:\-\s]+([\+\d\-\s]{10,15})/i);
            const emailMatch  = text.match(/Email(?:\s*Id)?:?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
            const reqMatch    = text.match(/(?:Requirement|Message|Enquiry|Query|Product Name)[:\-\s]+(.+?)(?:Regards|Thanks|View|Reply)/i);

            if (mobileMatch || emailMatch) {
                leads.push({
                    name:   nameMatch   ? nameMatch[1].trim()                     : 'IndiaMART Buyer',
                    phone:  mobileMatch ? mobileMatch[1].replace(/\D/g, '')      : '',
                    email:  emailMatch  ? emailMatch[1].trim()                    : '',
                    source: LeadSource.INDIAMART,
                    notes:  reqMatch    ? `[Buy Now Lead] Enquiry: ${reqMatch[1].trim()}` : '[Buy Now Lead] Imported via Email Parser',
                });
            }
        }

        // ── Generic fallback ──────────────────────────────────────────────────
        if (leads.length === 0) {
            const genericMobile = text.match(/(?:Mobile(?:\s*No)?|Phone|Contact):?\s*([\+\d\-\s]{10,15})/i);
            const genericEmail  = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);

            if (genericMobile || genericEmail) {
                leads.push({
                    name:   'Email Lead',
                    phone:  genericMobile ? genericMobile[1].replace(/\D/g, '') : '',
                    email:  genericEmail  ? genericEmail[1].trim()              : '',
                    source: LeadSource.WEBSITE,
                    notes:  'Auto-parsed from unrecognised email format',
                });
            }
        }

        return leads;
    }
}
