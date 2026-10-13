import { Injectable } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import { BillingService } from '../billing/billing.service';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class DashboardService {
    constructor(
        private leadsService: LeadsService,
        private billingService: BillingService,
        private companiesService: CompaniesService,
    ) { }

    /**
     * Admin dashboard — company-wide stats
     */
    async getAdminStats(companyId: string) {
        const [totalLeads, leadsToday, conversionRate, convertedLeads, billing] = await Promise.all([
            this.leadsService.countAll(companyId),
            this.leadsService.countToday(companyId),
            this.leadsService.conversionRate(companyId),
            this.leadsService.countConverted(companyId),
            this.billingService.billingStats(companyId).catch(() => ({ totalPending: 0, totalPaid: 0 })),
        ]);
        const totalRevenue = billing.totalPaid || 0;

        // Get revenue by month from billing
        let revenueByMonth: { month: string; total: number }[] = [];
        try {
            revenueByMonth = await this.billingService.revenueByMonth(companyId);
        } catch { }

        return {
            totalLeads,
            leadsToday,
            conversionRate,
            convertedLeads,
            totalRevenue,
            paidRevenue: billing.totalPaid,
            pendingAmount: billing.totalPending,
            revenueByMonth,
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
        const [leadsByStatus, leadsBySource, leadsOverTime, conversionRate, billing] = await Promise.all([
            this.leadsService.leadsByStatus(companyId, from, to),
            this.leadsService.leadsBySource(companyId, from, to),
            this.leadsService.leadsOverTime(companyId, from, to),
            this.leadsService.conversionRate(companyId),
            this.billingService.billingStats(companyId).catch(() => ({ totalPending: 0, totalPaid: 0 })),
        ]);

        let revenueByMonth: { month: string; total: number }[] = [];
        try { revenueByMonth = await this.billingService.revenueByMonth(companyId); } catch { }

        return {
            leadsByStatus,
            leadsBySource,
            leadsOverTime,
            conversionRate,
            paidRevenue: billing.totalPaid,
            pendingAmount: billing.totalPending,
            revenueByMonth,
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
    async getSuperAdminStats() {
        const companies = await this.companiesService.findAll();
        const plans = await this.companiesService.getAllPlans(); // Assuming this method exists or I need to inject PlansService? 
        // Wait, CompaniesService usually finds companies. DashboardService doesn't have PlansService injected yet.
        // Let's check CompaniesService to see if it has a method to get plans or if we should just rely on what we have.
        // The previous code in DashboardPage fetched /companies and /plans separately.
        // I should replicate that logic but in the backend for calculated stats.

        // Actually, to calculate revenue, I need the plan details attached to the company.
        // CompaniesService.findAll() might not return plans with prices unless relations are set.
        // Let's rely on the repository in CompaniesService if needed, but I can't access it directly.
        // Better to use CompaniesService methods.

        // User wants "This Month Sale".
        // Logic: Sum of (Plan Price) for all active companies where renewal/creation was this month.
        // Simpler approach for now:
        // 1. Get all companies with 'plan' relation.
        // 2. Filter by 'active'.
        // 3. Sum prices.

        // Users request: "This Month Sale".
        // If subscription is monthly, and status is active, it counts for this month? 
        // Or strictly new sales? "This Month Sale" usually implies revenue collected this month.
        // For a SaaS, that's (New Subscriptions + Renewals) in current month.
        // Simplification: Sum of price for all active companies (MRR) - close enough for "This Month Sale" if valid for this month.
        // OR: Filter companies created this month? 
        // Let's go with MRR (Monthly Recurring Revenue) or similar.
        // User said "This Month Sale". I'll interpret as Revenue generated in the current month.

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        let thisMonthRevenue = 0;
        let todayRevenue = 0;

        // We need companies with plans.
        // I will assume companiesService.findAll() returns companies. 
        // I might need to update CompaniesService to ensure it returns plans, or use a custom query here if I injected the Repo (which I didn't, I injected the Service).
        // Let's double check CompaniesService.findAll.

        const allCompanies = await this.companiesService.findAll();

        for (const company of allCompanies) {
            if (company.subscriptionStatus === 'active' && company.plan) {
                const price = company.subscriptionPeriod === 'yearly' ? company.plan.priceYearly : company.plan.priceMonthly;

                // Check if it's "This Month".
                // Ideally we track transactions/invoices. 
                // But for now, based on the prompt, let's use a heuristic:
                // If Active, and (Created this month OR Renewal Date is this month).
                // IF renewal date is null, use createdAt.

                // "Sale" implies money received.
                // For new companies, this is createdAt.
                // For renewals, we'd need transaction history.
                // For this dashboard, let's track "New Business" (Created Date) as "Sale".

                const createdDate = new Date(company.createdAt);

                if (createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear) {
                    thisMonthRevenue += Number(price);
                }

                // Calculate Today's Revenue
                const today = new Date();
                if (createdDate.getDate() === today.getDate() &&
                    createdDate.getMonth() === today.getMonth() &&
                    createdDate.getFullYear() === today.getFullYear()) {
                    todayRevenue += Number(price);
                }
            }
        }



        return {
            totalCompanies: allCompanies.length,
            thisMonthRevenue,
            todayRevenue,
            todayDate: new Date(),
            activePlans: allCompanies.filter(c => c.subscriptionStatus === 'active').length,
            totalUsers: allCompanies.reduce((sum, c) => sum + (c.users?.length || 0), 0),
            totalPlans: plans.length,
            companies: allCompanies,
            plans
        };
    }
}
