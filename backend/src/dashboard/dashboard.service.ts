import { Injectable } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class DashboardService {
    constructor(
        private leadsService: LeadsService,
    ) { }

    /**
     * Admin dashboard — CRM stats
     */
    async getAdminStats(companyId: string) {
        const [totalLeads, leadsToday, conversionRate, convertedLeads] = await Promise.all([
            this.leadsService.countAll(companyId),
            this.leadsService.countToday(companyId),
            this.leadsService.conversionRate(companyId),
            this.leadsService.countConverted(companyId),
        ]);

        return {
            totalLeads,
            leadsToday,
            conversionRate,
            convertedLeads,
            totalRevenue: 0,
            paidRevenue: 0,
            pendingAmount: 0,
            revenueByMonth: [],
        };
    }

    /**
     * Staff dashboard — personal stats for the logged-in user
     */
    async getStaffStats(companyId: string, userId: string) {
        const [assignedLeads, followUpsDueToday] = await Promise.all([
            this.leadsService.countAssigned(userId).catch(() => 0),
            this.leadsService.followUpsDueToday(userId).catch(() => []),
        ]);

        return {
            assignedLeads,
            followUpsDueToday: followUpsDueToday.length,
            followUps: followUpsDueToday,
        };
    }

    /**
     * Reports — aggregated lead analytics with date range
     */
    async getReports(companyId: string, from?: string, to?: string) {
        const [leadsByStatus, leadsBySource, leadsOverTime, conversionRate] = await Promise.all([
            this.leadsService.leadsByStatus(companyId, from, to),
            this.leadsService.leadsBySource(companyId, from, to),
            this.leadsService.leadsOverTime(companyId, from, to),
            this.leadsService.conversionRate(companyId),
        ]);

        return {
            leadsByStatus,
            leadsBySource,
            leadsOverTime,
            conversionRate,
            paidRevenue: 0,
            pendingAmount: 0,
            revenueByMonth: [],
        };
    }

    /**
     * Employee performance reports
     */
    async getEmployeeReports(companyId: string, from?: string, to?: string) {
        return this.leadsService.employeePerformance(companyId, from, to);
    }

    /**
     * Global search across leads
     */
    async search(companyId: string, query: string) {
        if (!query || query.length < 2) return { leads: [], clients: [] };

        const leads = await this.leadsService.search(companyId, query);

        return { leads, clients: [] };
    }

    /**
     * Follow-up reminders: overdue + today, scoped by role
     */
    async getFollowUps(companyId: string, userId: string, role: string) {
        const isAdmin = role === 'admin';
        const [overdue, today] = await Promise.all([
            this.leadsService.overdueFollowUps(companyId, isAdmin ? undefined : userId),
            isAdmin
                ? this.leadsService.companyFollowUpsToday(companyId)
                : this.leadsService.followUpsDueToday(userId),
        ]);

        return { overdue, today };
    }
}
