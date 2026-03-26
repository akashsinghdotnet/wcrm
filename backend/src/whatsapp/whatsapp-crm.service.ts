import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WhatsAppContact } from './entities/whatsapp-contact.entity';
import { WhatsAppList } from './entities/whatsapp-list.entity';
import { WhatsAppTag } from './entities/whatsapp-tag.entity';
import { WhatsAppTemplate } from './entities/whatsapp-template.entity';
import { WhatsAppBroadcast } from './entities/whatsapp-broadcast.entity';
import { WhatsAppBroadcastLog, MessageStatus } from './entities/whatsapp-broadcast-log.entity';
import { WhatsAppConfig } from '../whatsapp/whatsapp-config.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { ImportContactsDto } from './dto/import-contacts.dto';
import { CreateListDto } from './dto/create-list.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { BroadcastStatus } from './entities/whatsapp-broadcast.entity';
import { TemplateStatus } from './entities/whatsapp-template.entity';
import { Lead } from '../leads/lead.entity';

@Injectable()
export class WhatsAppCRMService {
    private readonly logger = new Logger(WhatsAppCRMService.name);
    constructor(
        @InjectRepository(WhatsAppConfig)
        private configRepo: Repository<WhatsAppConfig>,
        @InjectRepository(WhatsAppContact)
        private contactRepo: Repository<WhatsAppContact>,
        @InjectRepository(WhatsAppList)
        private listRepo: Repository<WhatsAppList>,
        @InjectRepository(WhatsAppTag)
        private tagRepo: Repository<WhatsAppTag>,
        @InjectRepository(WhatsAppTemplate)
        private templateRepo: Repository<WhatsAppTemplate>,
        @InjectRepository(WhatsAppBroadcast)
        private broadcastRepo: Repository<WhatsAppBroadcast>,
        @InjectRepository(WhatsAppBroadcastLog)
        private broadcastLogRepo: Repository<WhatsAppBroadcastLog>,
        @InjectRepository(Lead)
        private leadRepo: Repository<Lead>,
    ) {}

    // ==================== CONTACT MANAGEMENT ====================

    async createContact(companyId: string, dto: CreateContactDto): Promise<WhatsAppContact> {
        // Check for duplicate phone number
        const existing = await this.contactRepo.findOne({
            where: { companyId, phone: dto.phone },
        });

        if (existing) {
            throw new BadRequestException(`Contact with phone ${dto.phone} already exists`);
        }

        // Set opt-in date if opted in
        const contact = this.contactRepo.create({
            ...dto,
            companyId,
            optInDate: dto.isOptedIn ? new Date() : null,
        });

        return this.contactRepo.save(contact);
    }

    async importContacts(companyId: string, dto: ImportContactsDto): Promise<{
        imported: number;
        skipped: number;
        errors: string[];
        contactIds: string[];
    }> {
        const errors: string[] = [];
        const contactIds: string[] = [];
        let imported = 0;
        let skipped = 0;

        for (const contactData of dto.contacts) {
            try {
                // Check for duplicate if skipDuplicates is true
                if (dto.skipDuplicates) {
                    const existing = await this.contactRepo.findOne({
                        where: { companyId, phone: contactData.phone },
                    });

                    if (existing) {
                        skipped++;
                        continue;
                    }
                }

                // Create contact
                const contact = this.contactRepo.create({
                    ...contactData,
                    companyId,
                    optInSource: contactData.optInSource || dto.defaultOptInSource || 'imported',
                    optInDate: contactData.isOptedIn ? new Date() : null,
                });

                const saved = await this.contactRepo.save(contact);
                contactIds.push(saved.id);
                imported++;
            } catch (error) {
                errors.push(`Failed to import ${contactData.phone}: ${error.message}`);
            }
        }

        return { imported, skipped, errors, contactIds };
    }

    async getContacts(companyId: string, filters?: {
        listId?: string;
        tagId?: string;
        optedIn?: boolean;
        search?: string;
    }): Promise<any[]> {
        // Get WhatsApp-specific contacts
        const query = this.contactRepo.createQueryBuilder('contact')
            .leftJoinAndSelect('contact.lists', 'list')
            .leftJoinAndSelect('contact.tags', 'tag')
            .where('contact.companyId = :companyId', { companyId });

        if (filters?.listId) query.andWhere('list.id = :listId', { listId: filters.listId });
        if (filters?.tagId) query.andWhere('tag.id = :tagId', { tagId: filters.tagId });
        if (filters?.optedIn !== undefined) query.andWhere('contact.isOptedIn = :optedIn', { optedIn: filters.optedIn });
        if (filters?.search) {
            query.andWhere(
                '(contact.name ILIKE :search OR contact.phone ILIKE :search OR contact.email ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        const contacts = await query.getMany();

        // Also include leads as virtual contacts (unless filter is applied for lists/tags)
        if (!filters?.listId && !filters?.tagId) {
            const leadQuery: any = { companyId };
            if (filters?.search) {
                // can't use ILIKE easily here — filter post-fetch
            }
            const leads = await this.leadRepo.find({ where: leadQuery });
            const existingPhones = new Set(contacts.map(c => c.phone));

            for (const lead of leads) {
                if (!lead.phone) continue;
                if (existingPhones.has(lead.phone)) continue; // already in contacts
                if (filters?.search) {
                    const q = filters.search.toLowerCase();
                    if (!lead.name?.toLowerCase().includes(q) &&
                        !lead.phone?.toLowerCase().includes(q) &&
                        !lead.email?.toLowerCase().includes(q)) continue;
                }
                // Present lead as a contact with source='lead'
                contacts.push({
                    id: `lead_${lead.id}`,
                    companyId,
                    name: lead.name,
                    phone: lead.phone,
                    email: lead.email,
                    isOptedIn: false,
                    isOptedOut: false,
                    lists: [{ id: 'leads', name: 'Leads', color: '#22c55e' }],
                    tags: [],
                    source: 'lead',
                    leadId: lead.id,
                    createdAt: lead.createdAt,
                } as any);
                existingPhones.add(lead.phone);
            }
        }

        return contacts;
    }

    async updateContactOptIn(id: string, optedIn: boolean, source?: string): Promise<WhatsAppContact> {
        const contact = await this.contactRepo.findOne({ where: { id } });
        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        contact.isOptedIn = optedIn;
        if (optedIn) {
            contact.optInDate = new Date();
            contact.optInSource = source || contact.optInSource;
            contact.isOptedOut = false;
            contact.optOutDate = null;
        } else {
            contact.isOptedOut = true;
            contact.optOutDate = new Date();
        }

        return this.contactRepo.save(contact);
    }

    async deleteContact(id: string): Promise<void> {
        await this.contactRepo.delete(id);
    }

    // ==================== LIST MANAGEMENT ====================

    async createList(companyId: string, dto: CreateListDto): Promise<WhatsAppList> {
        const list = this.listRepo.create({
            ...dto,
            companyId,
        });

        const savedList = await this.listRepo.save(list);

        // Add contacts to list if provided
        if (dto.contactIds && dto.contactIds.length > 0) {
            await this.addContactsToList(savedList.id, dto.contactIds);
        }

        return savedList;
    }

    async getLists(companyId: string): Promise<WhatsAppList[]> {
        return this.listRepo.find({
            where: { companyId },
            relations: ['contacts'],
        });
    }

    async addContactsToList(listId: string, contactIds: string[]): Promise<void> {
        const list = await this.listRepo.findOne({
            where: { id: listId },
            relations: ['contacts'],
        });

        if (!list) {
            throw new NotFoundException('List not found');
        }

        const contacts = await this.contactRepo.find({
            where: { id: In(contactIds) },
        });

        // Merge existing and new contacts
        const existingIds = new Set(list.contacts.map(c => c.id));
        const newContacts = contacts.filter(c => !existingIds.has(c.id));

        list.contacts = [...list.contacts, ...newContacts];
        await this.listRepo.save(list);
    }

    async removeContactsFromList(listId: string, contactIds: string[]): Promise<void> {
        const list = await this.listRepo.findOne({
            where: { id: listId },
            relations: ['contacts'],
        });

        if (!list) {
            throw new NotFoundException('List not found');
        }

        list.contacts = list.contacts.filter(c => !contactIds.includes(c.id));
        await this.listRepo.save(list);
    }

    async deleteList(id: string): Promise<void> {
        await this.listRepo.delete(id);
    }

    // ==================== TAG MANAGEMENT ====================

    async createTag(companyId: string, dto: CreateTagDto): Promise<WhatsAppTag> {
        const tag = this.tagRepo.create({
            ...dto,
            companyId,
        });

        return this.tagRepo.save(tag);
    }

    async getTags(companyId: string): Promise<WhatsAppTag[]> {
        return this.tagRepo.find({
            where: { companyId },
            relations: ['contacts'],
        });
    }

    async addTagsToContact(contactId: string, tagIds: string[]): Promise<void> {
        const contact = await this.contactRepo.findOne({
            where: { id: contactId },
            relations: ['tags'],
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        const tags = await this.tagRepo.find({
            where: { id: In(tagIds) },
        });

        // Merge tags
        const existingIds = new Set(contact.tags.map(t => t.id));
        const newTags = tags.filter(t => !existingIds.has(t.id));

        contact.tags = [...contact.tags, ...newTags];
        await this.contactRepo.save(contact);
    }

    async removeTagsFromContact(contactId: string, tagIds: string[]): Promise<void> {
        const contact = await this.contactRepo.findOne({
            where: { id: contactId },
            relations: ['tags'],
        });

        if (!contact) {
            throw new NotFoundException('Contact not found');
        }

        contact.tags = contact.tags.filter(t => !tagIds.includes(t.id));
        await this.contactRepo.save(contact);
    }

    async deleteTag(id: string): Promise<void> {
        await this.tagRepo.delete(id);
    }

    // ==================== TEMPLATE MANAGEMENT ====================

    async createTemplate(companyId: string, dto: CreateTemplateDto): Promise<WhatsAppTemplate> {
        const template = this.templateRepo.create({
            ...dto,
            companyId,
        });

        return this.templateRepo.save(template);
    }

    async getTemplates(companyId: string): Promise<WhatsAppTemplate[]> {
        // Auto-sync from Meta API before returning
        await this.syncTemplatesFromMeta(companyId);
        return this.templateRepo.find({
            where: { companyId },
            order: { name: 'ASC' },
        });
    }

    /**
     * Fetch approved templates from Meta and upsert into local DB.
     * Inlined here to avoid circular dependency with WhatsAppService.
     */
    private async syncTemplatesFromMeta(companyId: string): Promise<void> {
        try {
            const config = await this.configRepo.findOne({ where: { companyId } });
            if (!config?.businessAccountId || !config?.accessToken) {
                this.logger.warn(`Template sync skipped for ${companyId}: missing businessAccountId or token`);
                return;
            }
            const response = await fetch(
                `https://graph.facebook.com/v21.0/${config.businessAccountId}/message_templates?status=APPROVED&limit=100`,
                { headers: { 'Authorization': `Bearer ${config.accessToken}` } }
            );
            if (!response.ok) {
                this.logger.warn(`Meta templates API returned ${response.status}`);
                return;
            }
            const data = await response.json();
            for (const t of (data.data || [])) {
                const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
                const bodyText = bodyComp?.text || t.name;
                const vars = (bodyText.match(/\{\{\d+\}\}/g) || []).map((_: any, i: number) => `var${i + 1}`);
                const existing = await this.templateRepo.findOne({ where: { companyId, name: t.name } });
                if (existing) {
                    existing.content = bodyText;
                    existing.status = TemplateStatus.APPROVED;
                    existing.language = t.language || existing.language;
                    existing.variables = vars.length ? vars : existing.variables;
                    await this.templateRepo.save(existing);
                } else {
                    await this.templateRepo.save(this.templateRepo.create({
                        companyId, name: t.name, content: bodyText,
                        language: t.language || 'en',
                        status: TemplateStatus.APPROVED,
                        category: (t.category?.toLowerCase() as any) || 'marketing',
                        variables: vars,
                    }));
                }
            }
            this.logger.log(`Synced ${(data.data || []).length} templates for company ${companyId}`);
        } catch (err: any) {
            this.logger.warn(`Template sync failed: ${err.message}`);
        }
    }

    async getApprovedTemplates(companyId: string): Promise<WhatsAppTemplate[]> {
        return this.templateRepo.find({
            where: { companyId, status: TemplateStatus.APPROVED },
        });
    }

    // ==================== BROADCAST MANAGEMENT ====================

    async createBroadcast(companyId: string, userId: string, dto: CreateBroadcastDto): Promise<WhatsAppBroadcast> {
        // Get target contacts based on target type
        const contacts = await this.getTargetContacts(
            companyId,
            dto.targetType || 'lists_tags',
            dto.targetListIds || [],
            dto.targetTagIds || [],
            dto.targetContactIds || [],
            dto.onlyOptedIn !== false // Default to true
        );

        if (contacts.length === 0) {
            throw new BadRequestException('No eligible contacts found for this broadcast');
        }

        // Create broadcast
        const broadcast = this.broadcastRepo.create({
            ...dto,
            companyId,
            createdBy: userId,
            totalRecipients: contacts.length,
            status: dto.scheduledAt ? BroadcastStatus.SCHEDULED : BroadcastStatus.DRAFT,
        });

        const savedBroadcast = await this.broadcastRepo.save(broadcast);

        // Create broadcast logs for each contact
        const logs = contacts.map(contact => this.broadcastLogRepo.create({
            broadcastId: savedBroadcast.id,
            contactId: contact.id,
            phone: contact.phone,
            status: MessageStatus.PENDING,
        }));

        await this.broadcastLogRepo.save(logs);

        return savedBroadcast;
    }

    private async getTargetContacts(
        companyId: string,
        targetType: string,
        listIds: string[],
        tagIds: string[],
        contactIds: string[],
        onlyOptedIn: boolean
    ): Promise<WhatsAppContact[]> {
        const query = this.contactRepo.createQueryBuilder('contact')
            .leftJoinAndSelect('contact.lists', 'list')
            .leftJoinAndSelect('contact.tags', 'tag')
            .where('contact.companyId = :companyId', { companyId });

        // Filter by opted-in status (CRITICAL for compliance)
        if (onlyOptedIn) {
            query.andWhere('contact.isOptedIn = true');
            query.andWhere('contact.isOptedOut = false');
        }

        // Handle different target types
        if (targetType === 'all') {
            // Send to all contacts (already filtered by opt-in above)
            return query.getMany();
        } else if (targetType === 'unorganized') {
            // Send to contacts not in any list or tag
            query.andWhere('list.id IS NULL');
            query.andWhere('tag.id IS NULL');
            return query.getMany();
        } else {
            // targetType === 'lists_tags' - Send to specific lists/tags
            const conditions: string[] = [];

            if (listIds.length > 0) {
                conditions.push('list.id IN (:...listIds)');
            }

            if (tagIds.length > 0) {
                conditions.push('tag.id IN (:...tagIds)');
            }

            if (contactIds.length > 0) {
                conditions.push('contact.id IN (:...contactIds)');
            }

            if (conditions.length > 0) {
                query.andWhere(`(${conditions.join(' OR ')})`, { listIds, tagIds, contactIds });
            }

            return query.getMany();
        }
    }

    async getBroadcasts(companyId: string): Promise<WhatsAppBroadcast[]> {
        return this.broadcastRepo.find({
            where: { companyId },
            relations: ['creator', 'template'],
            order: { createdAt: 'DESC' },
        });
    }

    async getBroadcastLogs(broadcastId: string): Promise<WhatsAppBroadcastLog[]> {
        return this.broadcastLogRepo.find({
            where: { broadcastId },
            relations: ['contact'],
        });
    }

    async sendBroadcast(broadcastId: string): Promise<void> {
        const broadcast = await this.broadcastRepo.findOne({
            where: { id: broadcastId },
            relations: ['template'],
        });

        if (!broadcast) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.status !== BroadcastStatus.DRAFT && broadcast.status !== BroadcastStatus.SCHEDULED) {
            throw new BadRequestException('Broadcast cannot be sent in current status');
        }

        // Update broadcast status
        broadcast.status = BroadcastStatus.SENDING;
        broadcast.startedAt = new Date();
        await this.broadcastRepo.save(broadcast);

        // Get pending logs
        const logs = await this.broadcastLogRepo.find({
            where: { broadcastId, status: MessageStatus.PENDING },
        });

        // TODO: Integrate with actual WhatsApp API to send messages
        // For now, we'll mark them as sent (you'll need to implement the actual sending logic)

        // This is where you would call the WhatsApp Business API
        // Example: await this.whatsappService.sendMessage(log.phone, broadcast.message);

        // Update logs (simulated for now)
        for (const log of logs) {
            log.status = MessageStatus.SENT;
            log.sentAt = new Date();
        }

        await this.broadcastLogRepo.save(logs);

        // Update broadcast
        broadcast.status = BroadcastStatus.SENT;
        broadcast.sentCount = logs.length;
        broadcast.completedAt = new Date();
        await this.broadcastRepo.save(broadcast);
    }

    // ==================== COMPLIANCE & ANALYTICS ====================

    async getOptInStats(companyId: string): Promise<{
        total: number;
        optedIn: number;
        optedOut: number;
        pending: number;
    }> {
        const total = await this.contactRepo.count({ where: { companyId } });
        const optedIn = await this.contactRepo.count({ where: { companyId, isOptedIn: true } });
        const optedOut = await this.contactRepo.count({ where: { companyId, isOptedOut: true } });
        const pending = total - optedIn - optedOut;

        return { total, optedIn, optedOut, pending };
    }

    async getBroadcastStats(broadcastId: string): Promise<{
        total: number;
        sent: number;
        delivered: number;
        read: number;
        failed: number;
    }> {
        const total = await this.broadcastLogRepo.count({ where: { broadcastId } });
        const sent = await this.broadcastLogRepo.count({ where: { broadcastId, status: MessageStatus.SENT } });
        const delivered = await this.broadcastLogRepo.count({ where: { broadcastId, status: MessageStatus.DELIVERED } });
        const read = await this.broadcastLogRepo.count({ where: { broadcastId, status: MessageStatus.READ } });
        const failed = await this.broadcastLogRepo.count({ where: { broadcastId, status: MessageStatus.FAILED } });

        return { total, sent, delivered, read, failed };
    }
}
