import { Injectable, forwardRef, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationPlatform } from './integration-config.entity';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { LeadsService } from '../leads/leads.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
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

        const saved = await this.configRepo.save(config);

        // If it's a Meta integration and is active, automatically subscribe the page to the app
        if (saved.platform === IntegrationPlatform.META && saved.isActive) {
            const { accessToken, pageId, appSecret } = saved.credentials || {};
            if (accessToken && pageId) {
                let appsecretProof = '';
                if (appSecret) {
                    appsecretProof = crypto
                        .createHmac('sha256', appSecret)
                        .update(accessToken)
                        .digest('hex');
                }
                await this.subscribePageToApp(pageId, accessToken, appsecretProof);
            }
        }

        return saved;
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

    // FACEBOOK / META ADS
    // ──────────────────────────────────────────────────────────────────────────

    private async subscribePageToApp(pageId: string, accessToken: string, appSecret: string): Promise<string> {
        try {
            // Generate initial appsecret_proof for the User Access Token if appSecret is present
            let userAppsecretProof = '';
            if (appSecret) {
                userAppsecretProof = crypto
                    .createHmac('sha256', appSecret)
                    .update(accessToken)
                    .digest('hex');
            }

            let pageAccessToken = accessToken;
            try {
                const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}` +
                    (userAppsecretProof ? `&appsecret_proof=${userAppsecretProof}` : '');
                const accountsResponse = await fetch(accountsUrl, { signal: AbortSignal.timeout(5000) });
                if (accountsResponse.ok) {
                    const accountsData = await accountsResponse.json();
                    const pageAccount = accountsData.data?.find((acc: any) => String(acc.id) === String(pageId));
                    if (pageAccount && pageAccount.access_token) {
                        pageAccessToken = pageAccount.access_token;
                        this.logger.log(`Exchanged User Access Token for Page Access Token for page ${pageId}`);
                    }
                }
            } catch (e: any) {
                this.logger.warn(`Failed to fetch page access token from /me/accounts: ${e.message}`);
            }

            // Recalculate appsecret_proof for the Page Access Token (which is different from the User Access Token)
            let pageAppsecretProof = '';
            if (appSecret) {
                pageAppsecretProof = crypto
                    .createHmac('sha256', appSecret)
                    .update(pageAccessToken)
                    .digest('hex');
            }

            const subUrl = `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${pageAccessToken}` +
                (pageAppsecretProof ? `&appsecret_proof=${pageAppsecretProof}` : '');
            const subResponse = await fetch(subUrl, { method: 'POST', signal: AbortSignal.timeout(10000) });
            const subData = await subResponse.json();

            if (!subResponse.ok || subData.error) {
                this.logger.error(`Failed to subscribe page ${pageId} to app webhooks: ${JSON.stringify(subData)}`);
                return ` Note: Failed to associate Page with Developer App automatically. Error: ${subData.error?.message || 'Unknown error'}.`;
            } else {
                this.logger.log(`Successfully subscribed page ${pageId} to app webhooks: ${JSON.stringify(subData)}`);
                return ` Page associated and subscribed to App successfully.`;
            }
        } catch (err: any) {
            this.logger.error(`Error subscribing page ${pageId} to app webhooks: ${err.message}`);
            return ` Note: Error subscribing page to webhooks: ${err.message}`;
        }
    }

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

            // Automatically subscribe the Page to our App's Webhooks
            const subscriptionStatus = await this.subscribePageToApp(pageId, accessToken, appSecret || '');

            const pageName = data.name || 'Facebook Page';
            if (hasLeadsRetrieval) {
                return { 
                    success: true, 
                    message: `Successfully connected to Page "${pageName}"! leads_retrieval permission is active.${subscriptionStatus}` 
                };
            } else {
                return { 
                    success: true, 
                    message: `Connected to Page "${pageName}", but "leads_retrieval" permission was not found or not granted. Ensure your Page Access Token has leads_retrieval permissions.${subscriptionStatus}` 
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
        const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'wcrm';
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

        // Ensure credentials are parsed objects if they were loaded as strings
        for (const cfg of allMetaConfigs) {
            if (typeof cfg.credentials === 'string') {
                try {
                    cfg.credentials = JSON.parse(cfg.credentials);
                } catch {
                    cfg.credentials = {};
                }
            }
        }

        const config = allMetaConfigs.find(c => {
            const stored = String(c.credentials?.pageId || '').trim();
            const incoming = String(pageId || '').trim();
            return stored === incoming;
        });
        if (!config) {
            this.logger.warn(`No active Meta integration found for pageId ${pageId}. Available pageIds: ${allMetaConfigs.map(c => {
                const creds = typeof c.credentials === 'string' ? JSON.parse(c.credentials) : c.credentials;
                return String(creds?.pageId || '').trim();
            }).join(', ')}`);
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



    /**
     * Exchange central Facebook App authorization code for long-lived access tokens
     * and retrieve the list of managed Facebook Pages.
     */
    async exchangeMetaCodeAndGetPages(code: string) {
        const appId = (process.env.META_CENTRAL_APP_ID || '').replace(/[\"\\']/g, '').trim();
        const appSecret = (process.env.META_CENTRAL_APP_SECRET || '').replace(/[\"\\']/g, '').trim();
        const redirectUri = process.env.META_REDIRECT_URI || 'https://api.wcrm.si/api/integrations/meta/callback';

        if (!appId || !appSecret) {
            throw new Error('Central Facebook App credentials (META_CENTRAL_APP_ID, META_CENTRAL_APP_SECRET) are not configured on the server.');
        }

        // 1. Exchange authorization code for short-lived access token
        const tokenExchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
        const tokenRes = await fetch(tokenExchangeUrl);
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            throw new Error(`Token exchange failed: ${tokenData.error.message}`);
        }

        const shortLivedToken = tokenData.access_token;

        // 2. Exchange short-lived token for a long-lived user access token (60 days)
        const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
        const longLivedRes = await fetch(longLivedUrl);
        const longLivedData = await longLivedRes.json();

        if (longLivedData.error) {
            throw new Error(`Failed to generate long-lived token: ${longLivedData.error.message}`);
        }

        const longLivedToken = longLivedData.access_token;

        // Debug permissions
        try {
            const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${longLivedToken}`);
            const permData = await permRes.json();
            this.logger.log(`exchangeMetaCodeAndGetPages: Token Permissions: ${JSON.stringify(permData.data || permData)}`);
        } catch (err: any) {
            this.logger.error(`exchangeMetaCodeAndGetPages: Failed to fetch permissions: ${err.message}`);
        }

        // 3. Fetch managed pages list and their Page Access Tokens (which will be permanent because they were generated from a long-lived token)
        const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`;
        const accountsRes = await fetch(accountsUrl);
        const accountsData = await accountsRes.json();

        if (accountsData.error) {
            throw new Error(`Failed to fetch pages: ${accountsData.error.message}`);
        }

        const pages = (accountsData.data || []).map((page: any) => ({
            id: page.id,
            name: page.name,
            accessToken: page.access_token,
            userAccessToken: longLivedToken,
        }));
        this.logger.log(`exchangeMetaCodeAndGetPages: Found ${pages.length} pages: ${JSON.stringify(pages.map(p => ({ id: p.id, name: p.name })))}`);
        return pages;
    }

    /**
     * Subscribe selected Facebook Page to Wcrm webhook
     * and save page credentials in integration config.
     */
    async subscribeMetaPage(data: {
        companyId: string;
        pageId: string;
        pageAccessToken: string;
        pageName: string;
        userAccessToken: string;
    }) {
        const appId = (process.env.META_CENTRAL_APP_ID || '').replace(/[\"\\']/g, '').trim();
        const appSecret = (process.env.META_CENTRAL_APP_SECRET || '').replace(/[\"\\']/g, '').trim();

        this.logger.log(`Subscribing Meta Page: pageId=${data.pageId}, pageName=${data.pageName}, appSecretLen=${appSecret.length}, appSecretStart=${appSecret.substring(0, 4)}, tokenLen=${data.pageAccessToken?.length}, tokenStart=${data.pageAccessToken?.substring(0, 8)}`);

        // Generate appsecret_proof for page subscription request if appSecret is present
        let pageAppsecretProof = '';
        if (appSecret) {
            pageAppsecretProof = crypto
                .createHmac('sha256', appSecret)
                .update(data.pageAccessToken)
                .digest('hex');
        }

        // 1. Subscribe page to leadgen Webhook
        const subscribeUrl = `https://graph.facebook.com/v21.0/${data.pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${data.pageAccessToken}` +
            (pageAppsecretProof ? `&appsecret_proof=${pageAppsecretProof}` : '');

        const subRes = await fetch(subscribeUrl, { method: 'POST' });
        const subData = await subRes.json();

        if (subData.error) {
            throw new Error(`Failed to subscribe page to webhooks: ${subData.error.message}`);
        }

        // 2. Save the configuration in the database
        const credentials = {
            appId,
            appSecret, // Save central app secret so webhook proof logic works
            accessToken: data.pageAccessToken, // Save page access token as accessToken so the lead fetcher uses it
            pageId: data.pageId,
            pageName: data.pageName,
            userAccessToken: data.userAccessToken,
        };

        let config = await this.configRepo.findOne({
            where: { companyId: data.companyId, platform: IntegrationPlatform.META },
        });

        if (config) {
            config.credentials = credentials;
            config.isActive = true;
        } else {
            config = this.configRepo.create({
                companyId: data.companyId,
                platform: IntegrationPlatform.META,
                credentials,
                isActive: true,
            });
        }

        return this.configRepo.save(config);
    }
}
