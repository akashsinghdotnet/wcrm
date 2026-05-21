import { Injectable, forwardRef, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationPlatform } from './integration-config.entity';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { LeadsService } from '../leads/leads.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';

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

    /**
     * Find a Google Ads integration config by matching the webhook key.
     */
    async findByGoogleKey(googleKey: string): Promise<IntegrationConfig | null> {
        const allGoogleConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.GOOGLE, isActive: true },
        });
        return allGoogleConfigs.find(c => c.credentials?.webhookKey === googleKey) || null;
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
            const newConfig = this.configRepo.create({ companyId, platform, isActive, credentials: {} });
            return this.configRepo.save(newConfig);
        }
        config.isActive = isActive;
        return this.configRepo.save(config);
    }

    async remove(companyId: string, platform: IntegrationPlatform): Promise<void> {
        await this.configRepo.delete({ companyId, platform });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRADEINDIA
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Fetch raw leads from TradeIndia API using given credentials.
     * Returns the parsed leads array, or throws on failure.
     */
    private async fetchTradeIndiaRaw(userid: string, profile_id: string, key: string): Promise<any[]> {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 1); // TradeIndia API only allows last 24 hours

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        let allLeads: any[] = [];
        let pageNo = 1;
        let hasMore = true;

        this.logger.log(`TradeIndia API fetch started: userid=${userid}`);

        while (hasMore) {
            const url = `https://www.tradeindia.com/utils/my_inquiry.html?userid=${userid}&profile_id=${profile_id}&key=${key}&from_date=${formatDate(fromDate)}&to_date=${formatDate(toDate)}&limit=100&page_no=${pageNo}`;
            
            try {
                const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
                const text = await response.text();
                
                if (!text || text.trim().length === 0) {
                    hasMore = false;
                    break;
                }

                let data: any;
                try {
                    data = JSON.parse(text);
                } catch {
                    this.logger.warn(`TradeIndia non-JSON response at page ${pageNo}: ${text.substring(0, 200)}`);
                    break;
                }

                if (data?.error) {
                    this.logger.warn(`TradeIndia API error at page ${pageNo}: ${JSON.stringify(data.error)}`);
                    break;
                }

                let currentPageLeads: any[] = [];
                if (Array.isArray(data)) {
                    currentPageLeads = data;
                } else if (data?.DATA && Array.isArray(data.DATA)) {
                    currentPageLeads = data.DATA;
                } else if (data?.response && Array.isArray(data.response)) {
                    currentPageLeads = data.response;
                } else if (data && typeof data === 'object') {
                    const values = Object.values(data).filter(
                        item => typeof item === 'object' && item !== null && !Array.isArray(item)
                    );
                    if (values.length > 0 && values.every((v: any) => v.sender_name || v.sender_mobile || v.sender_email || v.rfi_id)) {
                        currentPageLeads = values;
                    }
                }

                if (currentPageLeads.length > 0) {
                    allLeads = [...allLeads, ...currentPageLeads];
                }

                if (currentPageLeads.length < 100) {
                    hasMore = false;
                } else {
                    pageNo++;
                }
            } catch (err: any) {
                this.logger.error(`TradeIndia fetch error at page ${pageNo}: ${err.message}`);
                hasMore = false; // exit loop on network error
            }
        }

        this.logger.log(`TradeIndia API fetch finished: userid=${userid}, total_leads=${allLeads.length}`);
        return allLeads;
    }

    /**
     * Import a pre-fetched list of TradeIndia leads into a specific company.
     * This allows the same API data to be inserted into multiple companies
     * without calling the API more than once per credential set.
     */
    private async importTradeIndiaLeads(companyId: string, leadsList: any[], config: any): Promise<number> {
        const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        let importCount = 0;

        for (const item of leadsList) {
            const name = item.sender_name || item.sender || item.name || 'Unknown (TradeIndia)';
            const phone = item.sender_mobile || item.sender_phone || item.mobile || item.phone;
            const email = item.sender_email || item.email;
            const subject = item.subject || item.product_name || item.category;
            const city = item.sender_city || item.city;
            const rawMessage = item.message || item.query_message || item.description;
            const message = rawMessage ? stripHtml(rawMessage) : '';
            const rfiId = item.rfi_id || item.inquiry_id || item.id;

            if (!phone && !email) continue;

            // Per-company dedup by rfi_id
            if (rfiId) {
                const dup = await this.leadsService.findByNoteContent(companyId, `TradeIndia ID: ${rfiId}`);
                if (dup) continue;
            }
            const dupByContact = await this.leadsService.findByPhoneOrEmail(companyId, phone, email);
            if (dupByContact) continue;

            const notes = [
                rfiId ? `TradeIndia ID: ${rfiId}` : null,
                subject ? `Subject: ${subject}` : null,
                city ? `City: ${city}` : null,
                message ? `Message: ${message}` : null,
            ].filter(Boolean).join(', ');

            const assignedTo = await this.leadsService.getNextAssignee(companyId, 'tradeindia');
            await this.leadsService.create({
                companyId, name, phone, email,
                source: LeadSource.TRADEINDIA,
                status: LeadStatus.NEW,
                assignedTo: assignedTo || undefined,
                notes: notes || undefined,
            });

            try {
                const msg = this.notificationsService.formatLeadMessage({ name, phone, email, source: 'Trade India' });
                await this.notificationsService.sendWhatsApp(msg);
            } catch { }

            importCount++;
        }

        config.lastSyncAt = new Date();
        await this.configRepo.save(config);
        return importCount;
    }

    /**
     * Manual fetch endpoint — fetches for a single company.
     */
    async fetchTradeIndiaLeads(companyId: string) {
        const config = await this.configRepo.findOne({ where: { companyId, platform: IntegrationPlatform.TRADEINDIA, isActive: true } });
        if (!config?.credentials) return { success: false, message: 'TradeIndia integration is not configured or is disabled.' };

        const { userid, profile_id, key } = config.credentials;
        if (!userid || !profile_id || !key) return { success: false, message: 'Missing TradeIndia API credentials (userid, profile_id, key).' };

        try {
            const leadsList = await this.fetchTradeIndiaRaw(userid, profile_id, key);
            if (leadsList.length === 0) return { success: true, message: 'No new leads found in the date range.', count: 0 };
            const count = await this.importTradeIndiaLeads(companyId, leadsList, config);
            return { success: true, message: `Successfully imported ${count} new leads from TradeIndia`, count };
        } catch (error: any) {
            this.logger.error(`TradeIndia fetch error for company ${companyId}: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // INDIAMART
    // ──────────────────────────────────────────────────────────────────────────

    async fetchIndiaMartLeads(companyId: string) {
        const config = await this.configRepo.findOne({ where: { companyId, platform: IntegrationPlatform.INDIAMART, isActive: true } });
        if (!config || !config.credentials) {
            return { success: false, message: 'IndiaMART integration is not configured or is disabled.' };
        }

        const { glusr_crm_key } = config.credentials;
        if (!glusr_crm_key) {
            return { success: false, message: 'Missing IndiaMART API key (glusr_crm_key).' };
        }

        try {
            let importCount = 0;
            let startIndex = 0;
            const batchSize = 100;
            let hasMore = true;

            while (hasMore) {
                const url = `https://mapi.indiamart.com/wservices/crm/crmListing/v2/?glusr_crm_key=${glusr_crm_key}&start_index=${startIndex}`;

                this.logger.log(`IndiaMART fetch: start_index=${startIndex}`);

                const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
                const textResponse = await response.text();

                if (!textResponse || textResponse.trim().length === 0) {
                    this.logger.warn(`IndiaMART returned empty response at index ${startIndex}`);
                    break;
                }

                let data: any;
                try {
                    data = JSON.parse(textResponse);
                } catch {
                    this.logger.warn(`IndiaMART non-JSON response: ${textResponse.substring(0, 200)}`);
                    break;
                }

                // IndiaMART API returns { STATUS: "SUCCESS", CODE: 200, RESPONSE: [...] }
                if (data?.STATUS !== 'SUCCESS' && data?.CODE !== 200) {
                    this.logger.warn(`IndiaMART API error: ${JSON.stringify(data).substring(0, 200)}`);
                    return { success: false, message: `IndiaMART API error: ${data?.MESSAGE || data?.STATUS || 'Unknown error'}` };
                }

                const leadsList: any[] = data?.RESPONSE || [];

                if (leadsList.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const item of leadsList) {
                    const name = [item.SENDER_NAME, item.NAME].filter(Boolean).join(' ').trim() || 'Unknown (IndiaMART)';
                    const phone = item.SENDER_MOBILE || item.MOBILE || item.PHONE;
                    const email = item.SENDER_EMAIL || item.EMAIL;
                    const subject = item.SUBJECT || item.PRODUCT_NAME;
                    const city = item.SENDER_CITY || item.CITY;
                    const message = item.QUERY_MESSAGE || item.MESSAGE || item.DESCRIPTION || '';
                    const queryId = item.UNIQUE_QUERY_ID || item.QUERY_ID;

                    if (!phone && !email) continue;

                    // Deduplicate by queryId first, then phone/email
                    if (queryId) {
                        const existingByQueryId = await this.leadsService.findByNoteContent(companyId, `IndiaMART ID: ${queryId}`);
                        if (existingByQueryId) continue;
                    }

                    const existingLead = await this.leadsService.findByPhoneOrEmail(companyId, phone, email);
                    if (existingLead) continue;

                    const notes = [
                        queryId ? `IndiaMART ID: ${queryId}` : null,
                        subject ? `Subject: ${subject}` : null,
                        city ? `City: ${city}` : null,
                        message ? `Message: ${message}` : null,
                    ].filter(Boolean).join(', ');

                    const assignedTo = await this.leadsService.getNextAssignee(companyId, 'indiamart');

                    await this.leadsService.create({
                        companyId,
                        name,
                        phone,
                        email,
                        source: LeadSource.INDIAMART,
                        status: LeadStatus.NEW,
                        assignedTo: assignedTo || undefined,
                        notes: notes || undefined,
                    });

                    try {
                        const msg = this.notificationsService.formatLeadMessage({ name, phone, email, source: 'IndiaMART' });
                        await this.notificationsService.sendWhatsApp(msg);
                    } catch { }

                    importCount++;
                }

                // IndiaMART returns exactly `batchSize` items if there are more
                if (leadsList.length < batchSize) {
                    hasMore = false;
                } else {
                    startIndex += batchSize;
                }
            }

            // Update lastSyncAt
            config.lastSyncAt = new Date();
            await this.configRepo.save(config);

            return {
                success: true,
                message: `Successfully fetched and imported ${importCount} new leads from IndiaMART`,
                count: importCount
            };
        } catch (error: any) {
            this.logger.error(`Error fetching IndiaMART leads: ${error.message}`);
            return { success: false, message: `Error fetching from IndiaMART: ${error.message}` };
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FACEBOOK / META ADS
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Test Meta connection credentials by calling Facebook Graph API
     */
    async testMetaConnection(credentials: Record<string, any>): Promise<{ success: boolean; message: string }> {
        const { accessToken, pageId, appSecret } = credentials;
        if (!accessToken || !pageId) {
            return { success: false, message: 'Access Token and Page ID are required.' };
        }

        // Generate appsecret_proof if appSecret is provided
        let appsecretProof = '';
        if (appSecret) {
            appsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(accessToken)
                .digest('hex');
        }

        try {
            // 1. Fetch Page Info to verify Access Token & Page ID
            const pageUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=name&access_token=${accessToken}` +
                (appsecretProof ? `&appsecret_proof=${appsecretProof}` : '');
            const response = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) });
            const data = await response.json();

            if (data.error) {
                return { success: false, message: data.error.message || 'Facebook Graph API error' };
            }

            // 2. Fetch Page Permissions to verify scope check
            const permUrl = `https://graph.facebook.com/v21.0/me/permissions?access_token=${accessToken}` +
                (appsecretProof ? `&appsecret_proof=${appsecretProof}` : '');
            const permResponse = await fetch(permUrl, { signal: AbortSignal.timeout(10000) });
            const permData = await permResponse.json();

            let hasLeadsRetrieval = false;
            if (permData && Array.isArray(permData.data)) {
                hasLeadsRetrieval = permData.data.some(
                    (p: any) => p.permission === 'leads_retrieval' && p.status === 'granted'
                );
            }

            const pageName = data.name || 'Facebook Page';
            if (hasLeadsRetrieval) {
                return { 
                    success: true, 
                    message: `Successfully connected to Page "${pageName}"! leads_retrieval permission is active.` 
                };
            } else {
                return { 
                    success: true, 
                    message: `Connected to Page "${pageName}", but "leads_retrieval" permission was not found or not granted. Ensure your Page Access Token has leads_retrieval permissions.` 
                };
            }
        } catch (error: any) {
            return { success: false, message: `Failed to connect to Facebook: ${error.message}` };
        }
    }

    /**
     * Verify Meta webhook — called by Meta when setting up the webhook.
     */
    verifyMetaWebhook(mode: string, challenge: string, verifyToken: string): string | null {
        const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'magnet-crm';
        if (mode === 'subscribe' && verifyToken === expectedToken) {
            this.logger.log('Meta Lead Ads webhook verified successfully');
            return challenge;
        }
        this.logger.warn(`Meta Lead Ads webhook verification failed. Token: ${verifyToken}`);
        return null;
    }

    /**
     * Process a Facebook Lead Ads leadgen event.
     * Facebook sends only the leadgen_id and page_id — we fetch full data from Graph API.
     */
    async processMetaLeadgenEvent(leadgenId: string, pageId: string) {
        this.logger.log(`Processing Meta leadgen event: leadgenId=${leadgenId}, pageId=${pageId}`);

        const allMetaConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.META, isActive: true },
        });

        const config = allMetaConfigs.find(c => {
            const stored = String(c.credentials?.pageId || '').trim();
            const incoming = String(pageId || '').trim();
            return stored === incoming;
        });
        if (!config) {
            this.logger.warn(`No active Meta integration found for pageId ${pageId}. Available pageIds: ${allMetaConfigs.map(c => String(c.credentials?.pageId || '').trim()).join(', ')}`);
            return;
        }

        const { accessToken, appSecret } = config.credentials;
        if (!accessToken) {
            this.logger.warn(`Meta integration for company ${config.companyId} has no access token`);
            return;
        }

        // Generate appsecret_proof if appSecret is provided
        let appsecretProof = '';
        if (appSecret) {
            appsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(accessToken)
                .digest('hex');
        }

        try {
            const graphUrl = `https://graph.facebook.com/v21.0/${leadgenId}?fields=field_data,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${accessToken}` +
                (appsecretProof ? `&appsecret_proof=${appsecretProof}` : '');
            const response = await fetch(graphUrl, { signal: AbortSignal.timeout(15000) });
            const data = await response.json();

            if (data.error) {
                this.logger.error(`Facebook Graph API error for lead ${leadgenId}: ${JSON.stringify(data.error)}`);
                return;
            }

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

            const existingLead = await this.leadsService.findByPhoneOrEmail(config.companyId, phone, email);
            if (existingLead) {
                this.logger.log(`Meta lead ${leadgenId} already exists (duplicate), skipping`);
                return;
            }

            const assignedTo = await this.leadsService.getNextAssignee(config.companyId, 'meta_ads');

            const additionalFields = fieldData
                .filter((f: any) => !['full_name', 'name', 'first_name', 'phone_number', 'phone', 'email'].includes(f.name))
                .map((f: any) => `${f.name}: ${f.values?.[0] || ''}`)
                .filter(Boolean);

            const notes = [
                data.ad_name ? `Ad: ${data.ad_name}` : null,
                data.campaign_name ? `Campaign: ${data.campaign_name}` : null,
                ...additionalFields,
            ].filter(Boolean).join(', ') || undefined;

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
                const msg = this.notificationsService.formatLeadMessage({ name, phone, email, source: 'Meta Ads' });
                await this.notificationsService.sendWhatsApp(msg);
            } catch { }

            this.logger.log(`Successfully imported Meta lead ${leadgenId} for company ${config.companyId}`);
        } catch (error: any) {
            this.logger.error(`Error fetching Meta lead ${leadgenId}: ${error.message}`);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CRON JOBS — Auto-fetch every 5 minutes for all active integrations
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Cron: fetch TradeIndia leads every 5 minutes.
     * Groups configs by unique credentials so the API is called ONCE per credential
     * set, then the same lead data is imported into ALL companies sharing those credentials.
     * This prevents concurrent calls with the same account which causes API errors.
     */
    @Cron('*/5 * * * *')
    async autoFetchTradeIndiaLeads() {
        const activeConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.TRADEINDIA, isActive: true },
        });
        if (activeConfigs.length === 0) return;

        // Group configs by unique credential key (userid + key)
        const credentialGroups = new Map<string, typeof activeConfigs>();
        for (const config of activeConfigs) {
            const { userid, key } = config.credentials || {};
            if (!userid || !key) continue;
            const credKey = `${userid}::${key}`;
            if (!credentialGroups.has(credKey)) credentialGroups.set(credKey, []);
            credentialGroups.get(credKey)!.push(config);
        }

        // For each unique credential set: fetch once, import into all companies
        for (const [credKey, configs] of credentialGroups) {
            try {
                const { userid, profile_id, key } = configs[0].credentials;
                const leadsList = await this.fetchTradeIndiaRaw(userid, profile_id, key);
                if (leadsList.length === 0) continue;

                for (const config of configs) {
                    try {
                        const count = await this.importTradeIndiaLeads(config.companyId, leadsList, config);
                        if (count > 0) {
                            this.logger.log(`Auto-fetched ${count} TradeIndia leads for company ${config.companyId}`);
                        }
                    } catch (err: any) {
                        this.logger.error(`TradeIndia import failed for company ${config.companyId}: ${err.message}`);
                    }
                }
            } catch (err: any) {
                this.logger.error(`TradeIndia API call failed for credential group ${credKey}: ${err.message}`);
            }
        }
    }

    @Cron('*/5 * * * *')
    async autoFetchIndiaMartLeads() {
        const activeConfigs = await this.configRepo.find({
            where: { platform: IntegrationPlatform.INDIAMART, isActive: true },
        });

        for (const config of activeConfigs) {
            try {
                const result = await this.fetchIndiaMartLeads(config.companyId);
                if (result.count && result.count > 0) {
                    this.logger.log(`Auto-fetched ${result.count} IndiaMART leads for company ${config.companyId}`);
                }
            } catch (err: any) {
                this.logger.error(`Auto-fetch IndiaMART failed for company ${config.companyId}: ${err.message}`);
            }
        }
    }
}
