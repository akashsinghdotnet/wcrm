import { Injectable, forwardRef, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationPlatform } from './integration-config.entity';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { LeadsService } from '../leads/leads.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        @InjectRepository(IntegrationConfig)
        private configRepo: Repository<IntegrationConfig>,
        @Inject(forwardRef(() => LeadsService))
        private leadsService: LeadsService,
        @Inject(forwardRef(() => NotificationsService))
        private notificationsService: NotificationsService,
    ) { }

    async findAllByCompany(companyId: string): Promise<IntegrationConfig[]> {
        return this.configRepo.find({ where: { companyId } });
    }

    async findOne(companyId: string, platform: IntegrationPlatform): Promise<IntegrationConfig | null> {
        return this.configRepo.findOne({ where: { companyId, platform } });
    }

    async save(dto: SaveIntegrationDto): Promise<IntegrationConfig> {
        let config = await this.configRepo.findOne({
            where: { companyId: dto.companyId, platform: dto.platform },
        });

        if (config) {
            if (dto.credentials !== undefined) config.credentials = dto.credentials;
            if (dto.isActive !== undefined) config.isActive = dto.isActive;
        } else {
            config = this.configRepo.create({
                companyId: dto.companyId,
                platform: dto.platform,
                credentials: dto.credentials || {},
                isActive: dto.isActive ?? false,
            });
        }

        return this.configRepo.save(config);
    }

    async toggle(companyId: string, platform: IntegrationPlatform, isActive: boolean): Promise<IntegrationConfig | null> {
        const config = await this.configRepo.findOne({ where: { companyId, platform } });
        if (!config) {
            // Create a new config with just the active state
            const newConfig = this.configRepo.create({ companyId, platform, isActive, credentials: {} });
            return this.configRepo.save(newConfig);
        }
        config.isActive = isActive;
        return this.configRepo.save(config);
    }

    async remove(companyId: string, platform: IntegrationPlatform): Promise<void> {
        await this.configRepo.delete({ companyId, platform });
    }

    async fetchTradeIndiaLeads(companyId: string) {
        const config = await this.configRepo.findOne({ where: { companyId, platform: IntegrationPlatform.TRADEINDIA, isActive: true } });
        if (!config || !config.credentials) {
            return { success: false, message: 'TradeIndia integration is not configured or is disabled.' };
        }

        const { userid, profile_id, key } = config.credentials;
        if (!userid || !profile_id || !key) {
            return { success: false, message: 'Missing TradeIndia API credentials (userid, profile_id, key).' };
        }

        try {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - 7);

            const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

            // Try both TradeIndia API endpoints - my_inquiry (received inquiries) and my_buy_leads (purchased leads)
            const endpoints = [
                `https://www.tradeindia.com/utils/my_inquiry.html?userid=${userid}&profile_id=${profile_id}&key=${key}&from_date=${formatDate(fromDate)}&to_date=${formatDate(toDate)}&limit=50&page_no=1`,
                `https://www.tradeindia.com/utils/my_buy_leads.html?userid=${userid}&profile_id=${profile_id}&key=${key}&from_date=${formatDate(fromDate)}&to_date=${formatDate(toDate)}&limit=50&page_no=1`,
            ];

            let allLeads: any[] = [];

            for (const url of endpoints) {
                try {
                    const response = await fetch(url);
                    const textResponse = await response.text();

                    this.logger.log(`TradeIndia response from ${url.split('?')[0]}: status=${response.status}, length=${textResponse.length}`);

                    if (!textResponse || textResponse.trim().length === 0) continue;

                    let data;
                    try {
                        data = JSON.parse(textResponse);
                    } catch {
                        this.logger.warn(`TradeIndia non-JSON response from ${url.split('?')[0]}: ${textResponse.substring(0, 300)}`);
                        continue;
                    }

                    // Handle error responses from TradeIndia API
                    if (data && data.error) {
                        this.logger.warn(`TradeIndia API error: ${JSON.stringify(data.error)}`);
                        continue;
                    }

                    // Extract leads from various response structures
                    let leadsList: any[] = [];
                    if (Array.isArray(data)) {
                        leadsList = data;
                    } else if (data && data.DATA && Array.isArray(data.DATA)) {
                        leadsList = data.DATA;
                    } else if (data && data.response && Array.isArray(data.response)) {
                        leadsList = data.response;
                    } else if (data && typeof data === 'object') {
                        // TradeIndia sometimes returns { "0": {...}, "1": {...}, ... } format
                        const values = Object.values(data).filter(
                            item => typeof item === 'object' && item !== null && !Array.isArray(item)
                        );
                        if (values.length > 0 && values.every((v: any) => v.sender_name || v.sender_mobile || v.sender_email || v.rfi_id)) {
                            leadsList = values;
                        }
                    }

                    allLeads.push(...leadsList);
                } catch (fetchErr: any) {
                    this.logger.warn(`Failed to fetch from ${url.split('?')[0]}: ${fetchErr.message}`);
                }
            }

            if (allLeads.length === 0) {
                return { success: true, message: 'No new leads found in the specified date range.', count: 0 };
            }

            // Deduplicate by checking existing leads with same phone/email from TradeIndia source
            let importCount = 0;
            for (const item of allLeads) {
                const name = item.sender_name || item.sender || item.name || 'Unknown (TradeIndia)';
                const phone = item.sender_mobile || item.sender_phone || item.mobile || item.phone;
                const email = item.sender_email || item.email;
                const subject = item.subject || item.product_name || item.category;
                const city = item.sender_city || item.city;
                const message = item.message || item.query_message || item.description;
                const rfiId = item.rfi_id || item.inquiry_id || item.id;

                if (!phone && !email) continue;

                // Check for duplicate leads (by phone or email from same source)
                const existingLead = await this.leadsService.findByPhoneOrEmail(companyId, phone, email);
                if (existingLead) continue;

                const notes = [
                    rfiId ? `TradeIndia ID: ${rfiId}` : null,
                    subject ? `Subject: ${subject}` : null,
                    city ? `City: ${city}` : null,
                    message ? `Message: ${message}` : null,
                ].filter(Boolean).join(', ');

                const assignedTo = await this.leadsService.getNextAssignee(companyId);

                await this.leadsService.create({
                    companyId,
                    name,
                    phone,
                    email,
                    source: LeadSource.TRADEINDIA,
                    status: LeadStatus.NEW,
                    assignedTo: assignedTo || undefined,
                    notes: notes || undefined,
                });

                try {
                    const msg = this.notificationsService.formatLeadMessage({
                        name,
                        phone,
                        email,
                        source: 'Trade India',
                    });
                    await this.notificationsService.sendWhatsApp(msg);
                } catch { }

                importCount++;
            }

            return {
                success: true,
                message: `Successfully fetched and imported ${importCount} new leads from TradeIndia`,
                count: importCount
            };
        } catch (error: any) {
            this.logger.error(`Error fetching TradeIndia leads: ${error.message}`);
            return { success: false, message: `Error fetching from TradeIndia: ${error.message}` };
        }
    }

    /**
     * Process a Facebook Lead Ads leadgen event.
     * Facebook sends only the leadgen_id and page_id — we need to:
     * 1. Find the company by matching pageId in stored Meta integration credentials
     * 2. Use the stored access token to fetch the actual lead data from Graph API
     * 3. Create the lead in our system
     */
    async processMetaLeadgenEvent(leadgenId: string, pageId: string) {
        this.logger.log(`Processing Meta leadgen event: leadgenId=${leadgenId}, pageId=${pageId}`);

        // Find the company config that has this pageId
        const allMetaConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.META, isActive: true },
        });

        const config = allMetaConfigs.find(c => c.credentials?.pageId === pageId);
        if (!config) {
            this.logger.warn(`No active Meta integration found for pageId ${pageId}`);
            return;
        }

        const { accessToken } = config.credentials;
        if (!accessToken) {
            this.logger.warn(`Meta integration for company ${config.companyId} has no access token`);
            return;
        }

        // Fetch lead data from Facebook Graph API
        try {
            const graphUrl = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${accessToken}`;
            const response = await fetch(graphUrl);
            const data = await response.json();

            if (data.error) {
                this.logger.error(`Facebook Graph API error for lead ${leadgenId}: ${JSON.stringify(data.error)}`);
                return;
            }

            // Extract lead fields from Facebook's field_data format
            // Facebook returns: { field_data: [{ name: "full_name", values: ["John Doe"] }, ...] }
            const fieldData = data.field_data || [];
            const getField = (fieldName: string): string | undefined => {
                const field = fieldData.find((f: any) =>
                    f.name === fieldName || f.name === fieldName.toLowerCase()
                );
                return field?.values?.[0];
            };

            const name = getField('full_name') || getField('name') || getField('first_name') || 'Unknown (Meta Ads)';
            const phone = getField('phone_number') || getField('phone');
            const email = getField('email');

            if (!phone && !email) {
                this.logger.warn(`Meta lead ${leadgenId} has no phone or email, skipping`);
                return;
            }

            // Check for duplicate leads
            const existingLead = await this.leadsService.findByPhoneOrEmail(config.companyId, phone, email);
            if (existingLead) {
                this.logger.log(`Meta lead ${leadgenId} already exists (duplicate phone/email), skipping`);
                return;
            }

            const assignedTo = await this.leadsService.getNextAssignee(config.companyId);

            // Build notes from additional fields
            const additionalFields = fieldData
                .filter((f: any) => !['full_name', 'name', 'first_name', 'phone_number', 'phone', 'email'].includes(f.name))
                .map((f: any) => `${f.name}: ${f.values?.[0] || ''}`)
                .filter(Boolean);
            const notes = additionalFields.length > 0 ? additionalFields.join(', ') : undefined;

            await this.leadsService.create({
                companyId: config.companyId,
                name,
                phone,
                email,
                source: LeadSource.META_ADS,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
                notes,
            });

            try {
                const msg = this.notificationsService.formatLeadMessage({
                    name,
                    phone,
                    email,
                    source: 'Meta Ads',
                });
                await this.notificationsService.sendWhatsApp(msg);
            } catch { }

            this.logger.log(`Successfully imported Meta lead ${leadgenId} for company ${config.companyId}`);
        } catch (error: any) {
            this.logger.error(`Error fetching Meta lead ${leadgenId}: ${error.message}`);
        }
    }

    // Auto-fetch TradeIndia leads every 15 minutes for all active integrations
    @Cron('0 */15 * * * *')
    async autoFetchTradeIndiaLeads() {
        const activeConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.TRADEINDIA, isActive: true },
        });

        for (const config of activeConfigs) {
            try {
                const result = await this.fetchTradeIndiaLeads(config.companyId);
                if (result.count && result.count > 0) {
                    this.logger.log(`Auto-fetched ${result.count} TradeIndia leads for company ${config.companyId}`);
                }
            } catch (err: any) {
                this.logger.error(`Auto-fetch TradeIndia failed for company ${config.companyId}: ${err.message}`);
            }
        }
    }
}
