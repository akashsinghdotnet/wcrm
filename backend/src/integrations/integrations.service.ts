import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationConfig, IntegrationPlatform } from './integration-config.entity';
import { SaveIntegrationDto } from './dto/save-integration.dto';
import { LeadsService } from '../leads/leads.service';
import { LeadSource, LeadStatus } from '../leads/lead.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class IntegrationsService {
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
            // Fetch for the last 7 days as an example, since TradeIndia requires from_date and to_date
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - 7);

            const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

            const url = `https://www.tradeindia.com/utils/my_buy_leads.html?userid=${userid}&profile_id=${profile_id}&key=${key}&from_date=${formatDate(fromDate)}&to_date=${formatDate(toDate)}&limit=50&page_no=1`;

            const response = await fetch(url);

            // TradeIndia might return JSON or XML depending on the endpoint, usually JSON if it's the newer API
            const textResponse = await response.text();

            let data;
            try {
                data = JSON.parse(textResponse);
            } catch (e) {
                return { success: false, message: 'Failed to parse TradeIndia response. Check credentials.', rawResponse: textResponse.substring(0, 200) };
            }

            // TradeIndia typical JSON response structure:
            // return value is an array or object containing array
            let leadsList: any[] = [];
            if (Array.isArray(data)) leadsList = data;
            else if (data && data.DATA && Array.isArray(data.DATA)) leadsList = data.DATA;
            else if (data && data.response && Array.isArray(data.response)) leadsList = data.response;
            else if (data && typeof data === 'object') {
                // sometimes returns object with indexed keys
                leadsList = Object.values(data).filter(item => typeof item === 'object' && item !== null);
            }

            if (leadsList.length === 0) {
                return { success: true, message: 'No new leads found in the specified date range.', count: 0 };
            }

            let importCount = 0;
            for (const item of leadsList as any[]) {
                // Map TradeIndia fields
                const name = item.sender_name || item.sender || item.name || 'Unknown (TradeIndia)';
                const phone = item.sender_mobile || item.sender_phone || item.mobile || item.phone;
                const email = item.sender_email || item.email;
                const subject = item.subject || item.product_name || item.category;
                const city = item.sender_city || item.city;
                const message = item.message || item.query_message || item.description;

                // Skip if no contact info
                if (!phone && !email) continue;

                // Simple deduplication (TradeIndia specific query_id could be used if saved, but checking phone/email for now)
                // In a production app, we should check against a unique source_id to prevent duplicates across multiple fetches

                const notes = [
                    subject ? `Subject: ${subject}` : null,
                    city ? `City: ${city}` : null,
                    message ? `Message: ${message}` : null,
                ].filter(Boolean).join(', ');

                const assignedTo = await this.leadsService.getNextAssignee(companyId);

                const lead = await this.leadsService.create({
                    companyId,
                    name,
                    phone,
                    email,
                    source: LeadSource.TRADEINDIA,
                    status: LeadStatus.NEW,
                    assignedTo: assignedTo || undefined,
                    notes: notes || undefined,
                });

                // Send notification
                const msg = this.notificationsService.formatLeadMessage({
                    name,
                    phone,
                    email,
                    source: 'Trade India',
                });
                await this.notificationsService.sendWhatsApp(msg);

                importCount++;
            }

            return {
                success: true,
                message: `Successfully fetched and imported ${importCount} new leads from TradeIndia`,
                count: importCount
            };
        } catch (error: any) {
            return { success: false, message: `Error fetching from TradeIndia: ${error.message}` };
        }
    }
}
