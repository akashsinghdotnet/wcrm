import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Lead, LeadSource, LeadStatus } from './lead.entity';
import { Activity, ActivityType } from './activity.entity';
import { LeadAssignmentRule } from './lead-assignment-rule.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UsersService } from '../users/users.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class LeadsService {
    private readonly logger = new Logger(LeadsService.name);
    // Tracks the last assigned index per company for round-robin
    private roundRobinIndex: Map<string, number> = new Map();

    constructor(
        @InjectRepository(Lead)
        private leadsRepository: Repository<Lead>,
        @InjectRepository(Activity)
        private activityRepository: Repository<Activity>,
        @InjectRepository(LeadAssignmentRule)
        private assignmentRuleRepo: Repository<LeadAssignmentRule>,
        private usersService: UsersService,
        @Inject(forwardRef(() => WhatsAppService))
        private whatsAppService: WhatsAppService,
        @Inject(forwardRef(() => EmailService))
        private emailService: EmailService,
    ) { }

    async notifyAssignee(lead: Lead) {
        if (!lead || !lead.assignedTo) return;
        try {
            const assignee = await this.usersService.findById(lead.assignedTo);
            if (assignee && assignee.email) {
                const assigneeName = `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.name || assignee.email;
                await this.emailService.sendLeadAssignmentEmail(
                    assignee.email,
                    assigneeName,
                    lead,
                    lead.companyId,
                ).catch((err) => {
                    this.logger.error(`Error sending lead assignment email: ${err.message}`);
                });
            }
        } catch (err) {
            this.logger.error(`Failed to notify assignee for lead ${lead.id}: ${err.message}`);
        }
    }

    async create(createLeadDto: CreateLeadDto, options?: { skipAutoReply?: boolean }): Promise<Lead> {
        // Auto-assign lead via round-robin if assignedTo is not explicitly passed
        if (!createLeadDto.assignedTo && createLeadDto.companyId) {
            try {
                const nextAssignee = await this.getNextAssignee(createLeadDto.companyId, createLeadDto.source);
                if (nextAssignee) {
                    createLeadDto.assignedTo = nextAssignee;
                }
            } catch { }
        }

        const lead = this.leadsRepository.create(createLeadDto);
        const savedLead = await this.leadsRepository.save(lead);

        // Notify assigned user via email asynchronously
        if (savedLead.assignedTo) {
            this.notifyAssignee(savedLead).catch(() => { });
        }

        // Trigger WhatsApp auto-reply asynchronously (fire and forget)
        // Skip if the lead was created FROM an inbound WhatsApp message to prevent reply loops
        if (savedLead.phone && savedLead.companyId && !options?.skipAutoReply) {
            this.whatsAppService.triggerAutoReply(
                savedLead.companyId,
                savedLead.id,
                savedLead.phone,
                savedLead.name,
            ).catch(() => { });
        }

        return savedLead;
    }

    /**
     * List leads with optional filters.
     * Staff users only see leads assigned to them.
     */
    /**
     * List leads with optional filters and pagination.
     * Staff users only see leads assigned to them.
     */
    async findAll(filters: FilterLeadsDto, requestingUser?: any): Promise<{ data: Lead[]; total: number; page: number; limit: number }> {
        const page = filters.page ? Number(filters.page) : 1;
        const limit = filters.limit ? Number(filters.limit) : 10;
        const skip = (page - 1) * limit;

        const query = this.leadsRepository.createQueryBuilder('lead')
            .leftJoinAndSelect('lead.assignedUser', 'assignedUser')
            .leftJoinAndSelect('lead.lastUpdatedByUser', 'lastUpdatedByUser')
            .orderBy('lead.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        // STRICT ISOLATION: Non-Super Admins can ONLY see their own company's leads
        if (requestingUser && requestingUser.role !== 'super_admin') {
            query.andWhere('lead.companyId = :companyId', { companyId: requestingUser.companyId });
        } else if (filters.companyId) {
            // Super Admins can filter by companyId if provided
            query.andWhere('lead.companyId = :companyId', { companyId: filters.companyId });
        }

        if (filters.status) {
            query.andWhere('lead.status = :status', { status: filters.status });
        }

        if (filters.source) {
            query.andWhere('lead.source = :source', { source: filters.source });
        }

        if (filters.assignedTo) {
            query.andWhere('lead.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
        }

        if (filters.assigned === 'true') {
            query.andWhere('lead.assignedTo IS NOT NULL');
        }

        if (filters.dateFrom && filters.dateTo) {
            // Append time components so BETWEEN covers the full day range
            const from = filters.dateFrom.length === 10 ? `${filters.dateFrom} 00:00:00` : filters.dateFrom;
            const to = filters.dateTo.length === 10 ? `${filters.dateTo} 23:59:59` : filters.dateTo;
            query.andWhere('lead.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom: from,
                dateTo: to,
            });
        } else if (filters.dateFrom) {
            const from = filters.dateFrom.length === 10 ? `${filters.dateFrom} 00:00:00` : filters.dateFrom;
            query.andWhere('lead.createdAt >= :dateFrom', { dateFrom: from });
        } else if (filters.dateTo) {
            const to = filters.dateTo.length === 10 ? `${filters.dateTo} 23:59:59` : filters.dateTo;
            query.andWhere('lead.createdAt <= :dateTo', { dateTo: to });
        }

        // Staff members can only see their own assigned leads
        if (requestingUser && requestingUser.role === 'staff') {
            query.andWhere('lead.assignedTo = :userId', { userId: requestingUser.userId });
        }

        const [data, total] = await query.getManyAndCount();

        return { data, total, page, limit };
    }

    async findOne(id: string): Promise<Lead> {
        const lead = await this.leadsRepository.findOne({
            where: { id },
            relations: ['company', 'assignedUser'],
        });
        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }
        return lead;
    }

    async update(id: string, updateLeadDto: UpdateLeadDto, userId?: string): Promise<Lead> {
        const lead = await this.findOne(id);

        // Set default follow-up date (24h from now) when status is changed to follow_up without followUpDate
        if (updateLeadDto.status === LeadStatus.FOLLOW_UP && !updateLeadDto.followUpDate && !lead.followUpDate) {
            updateLeadDto.followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }

        // Prevent clearing follow-up date when lead status is already follow_up
        if (lead.status === LeadStatus.FOLLOW_UP && lead.followUpDate && !updateLeadDto.followUpDate && updateLeadDto.hasOwnProperty('followUpDate')) {
            throw new BadRequestException('Cannot clear follow-up date while status is Follow Up. Please change status first.');
        }

        // Resolve user name for activity logging
        let userName = '';
        if (userId) {
            try {
                const updater = await this.usersService.findById(userId);
                userName = updater?.name || updater?.email?.split('@')[0] || '';
            } catch { }
        }

        // Auto-log status change
        if (updateLeadDto.status && updateLeadDto.status !== lead.status) {
            const byText = userName ? ` by ${userName}` : '';
            await this.activityRepository.save(this.activityRepository.create({
                leadId: id,
                userId: userId || undefined,
                type: ActivityType.STATUS_CHANGE,
                content: `Status changed from ${lead.status} to ${updateLeadDto.status}${byText}`,
            }));
        }

        // Auto-log reassignment
        if (updateLeadDto.assignedTo && updateLeadDto.assignedTo !== lead.assignedTo) {
            await this.activityRepository.save(this.activityRepository.create({
                leadId: id,
                userId: userId || undefined,
                type: ActivityType.ASSIGNMENT,
                content: `Lead reassigned to ${updateLeadDto.assignedTo}`,
            }));
        }

        // Set lastUpdatedBy
        if (userId) {
            (updateLeadDto as any).lastUpdatedBy = userId;
        }

        // Remove TypeORM relation cache conflict by directly patching the DB row
        if (Object.keys(updateLeadDto).length > 0) {
            await this.leadsRepository.update(id, updateLeadDto);
        }

        const updatedLead = await this.findOne(id);
        if (updateLeadDto.assignedTo && updateLeadDto.assignedTo !== lead.assignedTo) {
            this.notifyAssignee(updatedLead).catch(() => { });
        }
        return updatedLead;
    }

    async remove(id: string): Promise<Lead> {
        const lead = await this.findOne(id);
        return this.leadsRepository.remove(lead);
    }

    async bulkUpdate(ids: string[], updateDto: UpdateLeadDto, user: any): Promise<void> {
        const leads = await this.leadsRepository.find({ where: { id: In(ids) } });

        // Validate follow-up date is required when status is follow_up
        if (updateDto.status === LeadStatus.FOLLOW_UP && !updateDto.followUpDate) {
            throw new BadRequestException('Please choose follow-up date and time to set status to Follow Up');
        }

        // Resolve user name
        let userName = '';
        if (user?.userId) {
            try {
                const updater = await this.usersService.findById(user.userId);
                userName = updater?.name || updater?.email?.split('@')[0] || '';
            } catch { }
        }

        // Track activities for each lead
        const activities: Activity[] = [];
        for (const lead of leads) {
            if (updateDto.status && updateDto.status !== lead.status) {
                const byText = userName ? ` by ${userName}` : '';
                activities.push(this.activityRepository.create({
                    leadId: lead.id,
                    userId: user.userId,
                    type: ActivityType.STATUS_CHANGE,
                    content: `Status changed from ${lead.status} to ${updateDto.status}${byText}`,
                }));
            }
            if (updateDto.assignedTo && updateDto.assignedTo !== lead.assignedTo) {
                activities.push(this.activityRepository.create({
                    leadId: lead.id,
                    userId: user.userId,
                    type: ActivityType.ASSIGNMENT,
                    content: `Lead reassigned to ${updateDto.assignedTo}`,
                }));
            }
        }

        if (activities.length > 0) {
            await this.activityRepository.save(activities);
        }

        // Set lastUpdatedBy
        if (user?.userId) {
            (updateDto as any).lastUpdatedBy = user.userId;
        }

        await this.leadsRepository.update({ id: In(ids) }, updateDto);

        // Notify new assignees if assignedTo changed in bulk
        if (updateDto.assignedTo) {
            for (const id of ids) {
                this.findOne(id).then(l => this.notifyAssignee(l)).catch(() => { });
            }
        }
    }

    async bulkDelete(ids: string[]): Promise<void> {
        await this.leadsRepository.delete({ id: In(ids) });
    }

    /**
     * Round-robin auto-assignment with source-based rule override.
     * If source-based rules exist for the given source, rotate round-robin among those assigned users.
     * Otherwise, fall back to round-robin across active staff.
     */
    async getNextAssignee(companyId: string, source?: string): Promise<string | null> {
        // Check source-based assignment rules first
        if (source) {
            const sourceRules = await this.assignmentRuleRepo.find({
                where: { companyId, source: source as LeadSource, isActive: true },
            });
            if (sourceRules.length > 0) {
                const key = `${companyId}:${source}`;
                const currentIndex = this.roundRobinIndex.get(key) || 0;
                const nextIndex = currentIndex % sourceRules.length;
                this.roundRobinIndex.set(key, nextIndex + 1);
                return sourceRules[nextIndex].assignedTo;
            }
        }

        // Fall back to general round-robin across active staff
        const staff = await this.usersService.findActiveStaff(companyId);
        if (staff.length === 0) {
            return null;
        }

        const currentIndex = this.roundRobinIndex.get(companyId) || 0;
        const nextIndex = currentIndex % staff.length;
        this.roundRobinIndex.set(companyId, nextIndex + 1);

        return staff[nextIndex].id;
    }

    // ------- Assignment Rule CRUD -------

    async getAssignmentRules(companyId: string): Promise<LeadAssignmentRule[]> {
        return this.assignmentRuleRepo.find({
            where: { companyId },
            relations: ['assignedUser'],
            order: { createdAt: 'DESC' },
        });
    }

    async createAssignmentRule(companyId: string, source: string, assignedTo: string): Promise<LeadAssignmentRule> {
        // Find existing rule for specific source and assignee combination
        let rule = await this.assignmentRuleRepo.findOne({
            where: { companyId, source: source as LeadSource, assignedTo },
        });
        if (rule) {
            rule.isActive = true;
        } else {
            rule = this.assignmentRuleRepo.create({
                companyId,
                source: source as LeadSource,
                assignedTo,
                isActive: true,
            });
        }
        return this.assignmentRuleRepo.save(rule);
    }

    async deleteAssignmentRule(id: string): Promise<void> {
        const rule = await this.assignmentRuleRepo.findOne({ where: { id } });
        if (!rule) throw new NotFoundException('Assignment rule not found');
        await this.assignmentRuleRepo.remove(rule);
    }

    async verifyCompanyExists(companyId: string): Promise<boolean> {
        const result = await this.leadsRepository.manager.query('SELECT id FROM companies WHERE id = ? LIMIT 1', [companyId]);
        return Array.isArray(result) && result.length > 0;
    }

    async findByPhoneOrEmail(companyId: string, phone?: string, email?: string): Promise<Lead | null> {
        if (!phone && !email) return null;
        const conditions: any[] = [];
        if (phone) conditions.push({ companyId, phone });
        if (email) conditions.push({ companyId, email });
        return this.leadsRepository.findOne({ where: conditions });
    }

    async findByNoteContent(companyId: string, noteSubstring: string): Promise<Lead | null> {
        return this.leadsRepository
            .createQueryBuilder('lead')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere('lead.notes LIKE :note', { note: `%${noteSubstring}%` })
            .getOne();
    }


    // ------- Dashboard helper methods -------

    async countAll(companyId: string): Promise<number> {
        return this.leadsRepository.count({ where: { companyId } });
    }

    async countToday(companyId: string): Promise<number> {
        const { todayStart, todayEnd } = this.getTodayBoundsIST();

        return this.leadsRepository.count({
            where: {
                companyId,
                createdAt: Between(todayStart, todayEnd),
            },
        });
    }

    async conversionRate(companyId: string): Promise<number> {
        const total = await this.countAll(companyId);
        if (total === 0) return 0;

        const converted = await this.leadsRepository.count({
            where: { companyId, status: LeadStatus.CONVERTED },
        });

        return Math.round((converted / total) * 100 * 100) / 100; // e.g. 23.45%
    }

    async countConverted(companyId: string): Promise<number> {
        return this.leadsRepository.count({
            where: { companyId, status: LeadStatus.CONVERTED },
        });
    }

    async countAssigned(userId: string): Promise<number> {
        return this.leadsRepository.count({ where: { assignedTo: userId } });
    }

    private getTodayBoundsIST(): { todayStart: Date; todayEnd: Date } {
        // Use IST (UTC+5:30) for date boundaries regardless of server timezone
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istNow = new Date(now.getTime() + istOffset);
        const istDateStr = istNow.toISOString().split('T')[0]; // YYYY-MM-DD in IST
        const todayStart = new Date(`${istDateStr}T00:00:00+05:30`);
        const todayEnd = new Date(`${istDateStr}T23:59:59.999+05:30`);
        return { todayStart, todayEnd };
    }

    async followUpsDueToday(userId: string): Promise<Lead[]> {
        const { todayStart, todayEnd } = this.getTodayBoundsIST();

        return this.leadsRepository.find({
            where: {
                assignedTo: userId,
                followUpDate: Between(todayStart, todayEnd),
            },
            order: { followUpDate: 'ASC' },
        });
    }

    async overdueFollowUps(companyId: string, userId?: string): Promise<Lead[]> {
        const { todayStart } = this.getTodayBoundsIST();

        const qb = this.leadsRepository.createQueryBuilder('lead')
            .leftJoinAndSelect('lead.assignedUser', 'assignedUser')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere('lead.followUpDate < :todayStart', { todayStart })
            .andWhere('lead.status NOT IN (:...done)', { done: [LeadStatus.CONVERTED, LeadStatus.LOST] })
            .orderBy('lead.followUpDate', 'ASC')
            .limit(20);

        if (userId) {
            qb.andWhere('lead.assignedTo = :userId', { userId });
        }

        return qb.getMany();
    }

    async companyFollowUpsToday(companyId: string): Promise<Lead[]> {
        const { todayStart, todayEnd } = this.getTodayBoundsIST();

        return this.leadsRepository.find({
            where: {
                companyId,
                followUpDate: Between(todayStart, todayEnd),
            },
            relations: ['assignedUser'],
            order: { followUpDate: 'ASC' },
            take: 20,
        });
    }

    // ------- Activity methods -------

    async addActivity(dto: CreateActivityDto): Promise<Activity> {
        const activity = this.activityRepository.create(dto);
        return this.activityRepository.save(activity);
    }

    async getActivities(leadId: string): Promise<Activity[]> {
        return this.activityRepository.find({
            where: { leadId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    // ------- CSV methods -------

    async exportCsv(companyId: string): Promise<string> {
        const leads = await this.leadsRepository.find({ where: { companyId }, order: { createdAt: 'DESC' } });
        const header = 'name,phone,email,source,status,notes,city,state,createdAt\n';
        const rows = leads.map((l) => {
            const fields = [
                l.name,
                l.phone || '',
                l.email || '',
                l.source,
                l.status,
                (l.notes || '').replace(/"/g, '""'),
                l.city || '',
                l.state || '',
                l.createdAt?.toISOString() || ''
            ];
            return fields.map((f) => `"${f}"`).join(',');
        }).join('\n');
        return header + rows;
    }

    async importFromCsv(csvText: string, companyId: string): Promise<{ imported: number; errors: string[] }> {
        const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) return { imported: 0, errors: ['No data rows found'] };

        // Parse header
        const headerLine = lines[0].toLowerCase();
        const delimiter = this.detectDelimiter(headerLine);
        const headers = this.parseCsvLine(headerLine, delimiter).map(h => 
            h.trim()
             .replace(/^\ufeff/, '')
             .replace(/^["']|["']$/g, '')
             .trim()
        );

        // Helper to match column headers using common aliases
        const findColumnIndex = (aliases: string[]): number => {
            for (const alias of aliases) {
                const idx = headers.indexOf(alias);
                if (idx !== -1) return idx;
            }
            return -1;
        };

        const nameIdx = findColumnIndex(['name', 'full name', 'fullname', 'lead name', 'lead_name']);
        const phoneIdx = findColumnIndex(['phone', 'phone_number', 'phone number', 'mobile', 'mobile_number', 'mobile number', 'contact', 'contact_number', 'contact number', 'tel', 'telephone']);
        const emailIdx = findColumnIndex(['email', 'email_address', 'email address', 'mail', 'email id', 'email_id']);
        const designationIdx = findColumnIndex(['designation', 'job_title', 'job title', 'job_position', 'job position', 'title', 'role', 'position']);
        const companyNameIdx = findColumnIndex(['company_name', 'company name', 'company', 'organization', 'organization_name', 'organization name', 'org', 'business_name', 'business name']);
        const websiteIdx = findColumnIndex(['website', 'url', 'web', 'site', 'company_website', 'company website', 'domain']);
        const addressIdx = findColumnIndex(['address', 'company_address', 'company address', 'street', 'street_address', 'street address', 'location_address']);
        const sourceIdx = findColumnIndex(['source', 'lead_source', 'lead source']);
        const statusIdx = findColumnIndex(['status', 'lead_status', 'lead status']);
        const notesIdx = findColumnIndex(['notes', 'note', 'remark', 'remarks', 'comment', 'comments', 'description']);
        const cityIdx = findColumnIndex(['city', 'town', 'location', 'lead city', 'lead_city']);
        const stateIdx = findColumnIndex(['state', 'region', 'province', 'lead state', 'lead_state']);

        if (nameIdx === -1) return { imported: 0, errors: ['Missing required "name" column'] };

        const errors: string[] = [];
        const leadsToCreate: Partial<Lead>[] = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const fields = this.parseCsvLine(lines[i], delimiter).map(f =>
                    f.trim()
                     .replace(/^["']|["']$/g, '')
                     .trim()
                );
                const name = fields[nameIdx];
                if (!name) { errors.push(`Row ${i + 1}: missing name`); continue; }

                let phone = phoneIdx >= 0 ? fields[phoneIdx] || undefined : undefined;
                if (phone) {
                    phone = phone.replace(/^(p|tel|phone):/i, '').trim();
                }

                leadsToCreate.push({
                    companyId,
                    name,
                    phone,
                    email: emailIdx >= 0 ? fields[emailIdx] || undefined : undefined,
                    designation: designationIdx >= 0 ? fields[designationIdx] || undefined : undefined,
                    companyName: companyNameIdx >= 0 ? fields[companyNameIdx] || undefined : undefined,
                    website: websiteIdx >= 0 ? fields[websiteIdx] || undefined : undefined,
                    address: addressIdx >= 0 ? fields[addressIdx] || undefined : undefined,
                    source: sourceIdx >= 0 ? (fields[sourceIdx] as any) || 'manual' : 'manual',
                    status: statusIdx >= 0 ? (fields[statusIdx] as any) || 'new' : 'new',
                    notes: notesIdx >= 0 ? fields[notesIdx] || undefined : undefined,
                    city: cityIdx >= 0 ? fields[cityIdx] || undefined : undefined,
                    state: stateIdx >= 0 ? fields[stateIdx] || undefined : undefined,
                });
            } catch {
                errors.push(`Row ${i + 1}: parse error`);
            }
        }

        if (leadsToCreate.length > 0) {
            await this.leadsRepository.save(this.leadsRepository.create(leadsToCreate));
        }
        return { imported: leadsToCreate.length, errors };
    }

    private detectDelimiter(line: string): string {
        const delimiters = [',', ';', '\t'];
        let bestDelimiter = ',';
        let maxCount = -1;

        for (const d of delimiters) {
            let count = 0;
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') { i++; }
                    else { inQuotes = !inQuotes; }
                } else if (ch === d && !inQuotes) {
                    count++;
                }
            }
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = d;
            }
        }
        return bestDelimiter;
    }

    private parseCsvLine(line: string, delimiter: string = ','): string[] {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === delimiter && !inQuotes) {
                fields.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        fields.push(current);
        return fields;
    }

    // ------- Reports methods -------

    async leadsByStatus(companyId: string, from?: string, to?: string) {
        const qb = this.leadsRepository.createQueryBuilder('lead')
            .select('lead.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('lead.companyId = :companyId', { companyId })
            .groupBy('lead.status');
        if (from) qb.andWhere('lead.createdAt >= :from', { from });
        if (to) qb.andWhere('lead.createdAt <= :to', { to });
        return qb.getRawMany();
    }

    async leadsBySource(companyId: string, from?: string, to?: string) {
        const qb = this.leadsRepository.createQueryBuilder('lead')
            .select('lead.source', 'source')
            .addSelect('COUNT(*)', 'count')
            .where('lead.companyId = :companyId', { companyId })
            .groupBy('lead.source');
        if (from) qb.andWhere('lead.createdAt >= :from', { from });
        if (to) qb.andWhere('lead.createdAt <= :to', { to });
        return qb.getRawMany();
    }

    async leadsOverTime(companyId: string, from?: string, to?: string) {
        const qb = this.leadsRepository.createQueryBuilder('lead')
            .select("TO_CHAR(lead.createdAt, 'YYYY-MM-DD')", 'date')
            .addSelect('COUNT(*)', 'count')
            .where('lead.companyId = :companyId', { companyId })
            .groupBy("TO_CHAR(lead.createdAt, 'YYYY-MM-DD')")
            .orderBy("TO_CHAR(lead.createdAt, 'YYYY-MM-DD')", 'ASC');
        if (from) qb.andWhere('lead.createdAt >= :from', { from });
        if (to) qb.andWhere('lead.createdAt <= :to', { to });
        return qb.getRawMany();
    }

    async employeePerformance(companyId: string, from?: string, to?: string) {
        const qb = this.leadsRepository.createQueryBuilder('lead')
            .select('lead.assignedTo', 'assignedTo')
            .addSelect('COUNT(*)', 'total')
            .addSelect("SUM(CASE WHEN lead.status = 'new' THEN 1 ELSE 0 END)", 'newCount')
            .addSelect("SUM(CASE WHEN lead.status = 'contacted' THEN 1 ELSE 0 END)", 'contactedCount')
            .addSelect("SUM(CASE WHEN lead.status = 'follow_up' THEN 1 ELSE 0 END)", 'followUpCount')
            .addSelect("SUM(CASE WHEN lead.status = 'converted' THEN 1 ELSE 0 END)", 'convertedCount')
            .addSelect("SUM(CASE WHEN lead.status = 'lost' THEN 1 ELSE 0 END)", 'lostCount')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere('lead.assignedTo IS NOT NULL')
            .groupBy('lead.assignedTo');

        if (from) qb.andWhere('lead.createdAt >= :from', { from });
        if (to) qb.andWhere('lead.createdAt <= :to', { to });

        const rawData = await qb.getRawMany();

        // Resolve user names
        const result: any[] = [];
        for (const row of rawData) {
            let userName = '';
            let userEmail = '';
            try {
                const u = await this.usersService.findById(row.assignedTo);
                userName = u?.name || '';
                userEmail = u?.email || '';
            } catch { }
            result.push({
                userId: row.assignedTo,
                name: userName || userEmail?.split('@')[0] || 'Unknown',
                email: userEmail,
                total: parseInt(row.total),
                newCount: parseInt(row.newCount),
                contactedCount: parseInt(row.contactedCount),
                followUpCount: parseInt(row.followUpCount),
                convertedCount: parseInt(row.convertedCount),
                lostCount: parseInt(row.lostCount),
                conversionRate: parseInt(row.total) > 0
                    ? Math.round((parseInt(row.convertedCount) / parseInt(row.total)) * 100 * 100) / 100
                    : 0,
            });
        }

        return result.sort((a, b) => b.total - a.total);
    }

    async search(companyId: string, query: string): Promise<Lead[]> {
        return this.leadsRepository.createQueryBuilder('lead')
            .leftJoinAndSelect('lead.assignedUser', 'assignedUser')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere('(lead.name LIKE :q OR lead.email LIKE :q OR lead.phone LIKE :q)', { q: `%${query}%` })
            .limit(10)
            .getMany();
    }
}
