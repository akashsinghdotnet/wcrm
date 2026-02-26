import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Lead, LeadStatus } from './lead.entity';
import { Activity, ActivityType } from './activity.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class LeadsService {
    // Tracks the last assigned index per company for round-robin
    private roundRobinIndex: Map<string, number> = new Map();

    constructor(
        @InjectRepository(Lead)
        private leadsRepository: Repository<Lead>,
        @InjectRepository(Activity)
        private activityRepository: Repository<Activity>,
        private usersService: UsersService,
    ) { }

    async create(createLeadDto: CreateLeadDto): Promise<Lead> {
        const lead = this.leadsRepository.create(createLeadDto);
        return this.leadsRepository.save(lead);
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
            .leftJoinAndSelect('lead.client', 'client')
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

        if (filters.dateFrom && filters.dateTo) {
            query.andWhere('lead.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
            });
        } else if (filters.dateFrom) {
            query.andWhere('lead.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
        } else if (filters.dateTo) {
            query.andWhere('lead.createdAt <= :dateTo', { dateTo: filters.dateTo });
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
            relations: ['company', 'client', 'assignedUser'],
        });
        if (!lead) {
            throw new NotFoundException(`Lead with ID ${id} not found`);
        }
        return lead;
    }

    async update(id: string, updateLeadDto: UpdateLeadDto, userId?: string): Promise<Lead> {
        const lead = await this.findOne(id);

        // Auto-log status change
        if (updateLeadDto.status && updateLeadDto.status !== lead.status) {
            await this.activityRepository.save(this.activityRepository.create({
                leadId: id,
                userId: userId || undefined,
                type: ActivityType.STATUS_CHANGE,
                content: `Status changed from ${lead.status} to ${updateLeadDto.status}`,
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

        // Remove TypeORM relation cache conflict by directly patching the DB row
        if (Object.keys(updateLeadDto).length > 0) {
            await this.leadsRepository.update(id, updateLeadDto);
        }
        return this.findOne(id);
    }

    async remove(id: string): Promise<Lead> {
        const lead = await this.findOne(id);
        return this.leadsRepository.remove(lead);
    }

    async bulkUpdate(ids: string[], updateDto: UpdateLeadDto, user: any): Promise<void> {
        const leads = await this.leadsRepository.find({ where: { id: In(ids) } });

        // Track activities for each lead
        const activities: Activity[] = [];
        for (const lead of leads) {
            if (updateDto.status && updateDto.status !== lead.status) {
                activities.push(this.activityRepository.create({
                    leadId: lead.id,
                    userId: user.userId,
                    type: ActivityType.STATUS_CHANGE,
                    content: `Status changed from ${lead.status} to ${updateDto.status}`,
                }));
            }
            if (updateDto.assignedTo && updateDto.assignedTo !== lead.assignedTo) {
                activities.push(this.activityRepository.create({
                    leadId: lead.id,
                    userId: user.userId,
                    type: ActivityType.ASSIGNMENT,
                    content: `Lead reassigned to ${updateDto.assignedTo}`, // ideally name, but ID for now is ok
                }));
            }
        }

        if (activities.length > 0) {
            await this.activityRepository.save(activities);
        }

        await this.leadsRepository.update({ id: In(ids) }, updateDto);
    }

    async bulkDelete(ids: string[]): Promise<void> {
        await this.leadsRepository.delete({ id: In(ids) });
    }

    /**
     * Round-robin auto-assignment: picks the next active staff member for a company.
     * Cycles through all active staff so leads spread evenly.
     */
    async getNextAssignee(companyId: string): Promise<string | null> {
        const staff = await this.usersService.findActiveStaff(companyId);
        if (staff.length === 0) {
            return null;
        }

        const currentIndex = this.roundRobinIndex.get(companyId) || 0;
        const nextIndex = currentIndex % staff.length;
        this.roundRobinIndex.set(companyId, nextIndex + 1);

        return staff[nextIndex].id;
    }

    // ------- Dashboard helper methods -------

    async countAll(companyId: string): Promise<number> {
        return this.leadsRepository.count({ where: { companyId } });
    }

    async countToday(companyId: string): Promise<number> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

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

    async countAssigned(userId: string): Promise<number> {
        return this.leadsRepository.count({ where: { assignedTo: userId } });
    }

    async followUpsDueToday(userId: string): Promise<Lead[]> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        return this.leadsRepository.find({
            where: {
                assignedTo: userId,
                followUpDate: Between(todayStart, todayEnd),
            },
            order: { followUpDate: 'ASC' },
        });
    }

    async overdueFollowUps(companyId: string, userId?: string): Promise<Lead[]> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

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
        const header = 'name,phone,email,source,status,notes,createdAt\n';
        const rows = leads.map((l) => {
            const fields = [l.name, l.phone || '', l.email || '', l.source, l.status, (l.notes || '').replace(/"/g, '""'), l.createdAt?.toISOString() || ''];
            return fields.map((f) => `"${f}"`).join(',');
        }).join('\n');
        return header + rows;
    }

    async importFromCsv(csvText: string, companyId: string): Promise<{ imported: number; errors: string[] }> {
        const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) return { imported: 0, errors: ['No data rows found'] };

        // Parse header
        const headerLine = lines[0].toLowerCase();
        const headers = this.parseCsvLine(headerLine);

        const nameIdx = headers.indexOf('name');
        const phoneIdx = headers.indexOf('phone');
        const emailIdx = headers.indexOf('email');
        const sourceIdx = headers.indexOf('source');
        const statusIdx = headers.indexOf('status');
        const notesIdx = headers.indexOf('notes');

        if (nameIdx === -1) return { imported: 0, errors: ['Missing required "name" column'] };

        const errors: string[] = [];
        const leadsToCreate: Partial<Lead>[] = [];

        for (let i = 1; i < lines.length; i++) {
            try {
                const fields = this.parseCsvLine(lines[i]);
                const name = fields[nameIdx]?.trim();
                if (!name) { errors.push(`Row ${i + 1}: missing name`); continue; }

                leadsToCreate.push({
                    companyId,
                    name,
                    phone: phoneIdx >= 0 ? fields[phoneIdx]?.trim() : undefined,
                    email: emailIdx >= 0 ? fields[emailIdx]?.trim() : undefined,
                    source: sourceIdx >= 0 ? (fields[sourceIdx]?.trim() as any) || 'manual' : 'manual',
                    status: statusIdx >= 0 ? (fields[statusIdx]?.trim() as any) || 'new' : 'new',
                    notes: notesIdx >= 0 ? fields[notesIdx]?.trim() : undefined,
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

    private parseCsvLine(line: string): string[] {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === ',' && !inQuotes) {
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

    async search(companyId: string, query: string): Promise<Lead[]> {
        return this.leadsRepository.createQueryBuilder('lead')
            .leftJoinAndSelect('lead.assignedUser', 'assignedUser')
            .where('lead.companyId = :companyId', { companyId })
            .andWhere('(lead.name ILIKE :q OR lead.email ILIKE :q OR lead.phone ILIKE :q)', { q: `%${query}%` })
            .limit(10)
            .getMany();
    }
}
