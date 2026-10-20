import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    TrendingUp, Users, Building2, Sparkles, IndianRupee,
    MessageSquare, Radio, Zap, GitFork 
} from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [staffStats, setStaffStats] = useState(null);
    const [saStats, setSaStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin_admin';
    const isCompanyUser = isAdmin || user?.role === 'staff';

    // All hooks must be defined at the top level BEFORE any early return
    const automationsCount = useMemo(() => {
        try {
            const saved = localStorage.getItem('wcrm_automations_v2');
            if (!saved) return 0;
            const list = JSON.parse(saved);
            return Array.isArray(list) ? list.filter(a => a.status === 'active' || a.status === true).length : 0;
        } catch {
            return 0;
        }
    }, []);

    const flowsCount = useMemo(() => {
        try {
            const saved = localStorage.getItem('wcrm_interactive_flows_v2');
            if (!saved) return 0;
            const list = JSON.parse(saved);
            return Array.isArray(list) ? list.filter(f => f.status === 'active').length : 0;
        } catch {
            return 0;
        }
    }, []);

    const loadData = async () => {
        try {
            if (!user) return;

            if (isSuperAdmin) {
                const response = await api.get('/dashboard/super-admin');
                setSaStats(response.data);
            }

            if (isAdmin) {
                const companyParam = user.companyId ? `?companyId=${user.companyId}` : '';
                const [statsRes, broadcastsRes] = await Promise.all([
                    api.get(`/dashboard/admin${companyParam}`).catch(() => ({ data: {} })),
                    api.get('/whatsapp-crm/broadcasts').catch(() => ({ data: [] })),
                ]);
                const broadcastList = Array.isArray(broadcastsRes?.data) 
                    ? broadcastsRes.data 
                    : (broadcastsRes?.data?.broadcasts || []);
                setStats({
                    ...(statsRes.data || {}),
                    activeBroadcasts: broadcastList.filter(b => b.status === 'active' || b.status === 'scheduled').length,
                });
            }

            if (isCompanyUser && !isAdmin) {
                const staffRes = await api.get('/dashboard/staff');
                setStaffStats(staffRes.data);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user?.id, user?.role, user?.companyId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const statCards = isAdmin ? [
        { 
            label: 'WhatsApp Chats', 
            value: (stats?.totalLeads ?? 0).toLocaleString(), 
            icon: MessageSquare, 
            color: 'emerald', 
            link: '/inbox' 
        },
        { 
            label: 'Audience Contacts', 
            value: stats?.leadsToday ? `${stats.leadsToday} New Today` : `${(stats?.totalContacts ?? stats?.totalLeads ?? 0).toLocaleString()} Active`, 
            icon: Users, 
            color: 'cyan', 
            link: '/contacts' 
        },
        { 
            label: 'Pipeline Deals', 
            value: (stats?.convertedLeads ?? 0).toLocaleString(), 
            icon: TrendingUp, 
            color: 'amber', 
            link: '/pipeline' 
        },
        { 
            label: 'Active Broadcasts', 
            value: `${stats?.activeBroadcasts ?? 0} Campaigns`, 
            icon: Radio, 
            color: 'indigo', 
            link: '/broadcasts' 
        },
        { 
            label: 'Live Automations', 
            value: `${automationsCount} Triggers`, 
            icon: Zap, 
            color: 'emerald', 
            link: '/automations' 
        },
        { 
            label: 'Interactive Flows', 
            value: `${flowsCount} Active Trees`, 
            icon: GitFork, 
            color: 'purple', 
            link: '/flows' 
        },
    ] : [];

    const colorMap = {
        indigo: { bg: 'bg-indigo-600/15', border: 'border-indigo-500/30', text: 'text-indigo-400', icon: 'bg-indigo-600/20' },
        cyan: { bg: 'bg-cyan-600/15', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: 'bg-cyan-600/20' },
        emerald: { bg: 'bg-emerald-600/15', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'bg-emerald-600/20' },
        amber: { bg: 'bg-amber-600/15', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'bg-amber-600/20' },
        purple: { bg: 'bg-purple-600/15', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'bg-purple-600/20' },
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1">
                    {isSuperAdmin ? 'Platform management overview' : 'Company overview and WhatsApp CRM metrics'}
                </p>
            </div>

            {/* Super Admin Platform Stats */}
            {isSuperAdmin && saStats && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div
                            className="bg-indigo-600/15 border border-indigo-500/30 rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer"
                            onClick={() => navigate('/companies')}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{saStats.totalCompanies}</p>
                            <p className="text-sm text-indigo-400 mt-1">Total Companies</p>
                        </div>
                        <div className="bg-cyan-600/15 border border-cyan-500/30 rounded-2xl p-5 transition-all hover:scale-[1.02]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-cyan-600/20 rounded-xl flex items-center justify-center">
                                    <IndianRupee className="w-5 h-5 text-cyan-400" />
                                </div>
                            </div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                ₹{(saStats?.todayRevenue || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-sm text-cyan-400 mt-1">Today&apos;s Sale</p>
                        </div>
                        <div className="bg-emerald-600/15 border border-emerald-500/30 rounded-2xl p-5 transition-all hover:scale-[1.02]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                                    <IndianRupee className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{(saStats?.thisMonthRevenue || 0).toLocaleString('en-IN')}</p>
                            <p className="text-sm text-emerald-400 mt-1">This Month Sale</p>
                        </div>
                        <div
                            className="bg-purple-600/15 border border-purple-500/30 rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer"
                            onClick={() => navigate('/plans')}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{saStats.activePlans}</p>
                            <p className="text-sm text-purple-400 mt-1">Active Plans</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Companies</h3>
                            {saStats.companies.length === 0 ? (
                                <p className="text-gray-400 dark:text-slate-500 text-sm">No companies registered yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(saStats?.companies || []).slice(0, 5).map((company) => (
                                        <div key={company.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-white dark:bg-slate-800 transition-colors" onClick={() => navigate(`/companies/${company.id}`)}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{company.companyName}</p>
                                                    <p className="text-xs text-gray-400 dark:text-slate-500">{company.users?.length || 0} users</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full flex-shrink-0">
                                                {company.plan?.name || 'No Plan'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Plans</h3>
                            {saStats.plans.length === 0 ? (
                                <p className="text-gray-400 dark:text-slate-500 text-sm">No plans created yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(saStats?.plans || []).map((plan) => (
                                        <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-500">{plan.adminLimit} admin · {plan.employeeLimit === -1 || plan.employeeLimit < 0 ? 'Unlimited' : plan.employeeLimit} employees</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">₹{plan.priceMonthly}/mo</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-500">₹{plan.priceYearly}/yr</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Admin Stat Cards */}
            {isAdmin && statCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statCards.map((card) => {
                        const c = colorMap[card.color];
                        return (
                            <div
                                key={card.label}
                                className={`${c.bg} border ${c.border} rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer`}
                                onClick={() => navigate(card.link)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center`}>
                                        <card.icon className={`w-5 h-5 ${c.text}`} />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                                <p className={`text-sm ${c.text} mt-1`}>{card.label}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Staff Stats */}
            {staffStats && !isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 cursor-pointer hover:bg-gray-100 dark:bg-slate-800/50 transition-colors"
                        onClick={() => navigate('/inbox')}
                    >
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Assigned WhatsApp Chats</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{staffStats.assignedLeads || 0}</p>
                    </div>
                    <div
                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 cursor-pointer hover:bg-gray-100 dark:bg-slate-800/50 transition-colors"
                        onClick={() => navigate('/contacts')}
                    >
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">WhatsApp Contacts</p>
                        <p className="text-3xl font-bold text-emerald-500">Active</p>
                    </div>
                </div>
            )}
        </div>
    );
}
