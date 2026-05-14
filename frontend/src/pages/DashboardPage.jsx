import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { TrendingUp, Users, FileText, IndianRupee, CalendarDays, AlertTriangle, Clock, Building2, Sparkles, Ticket } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444'];

export default function DashboardPage() {
    const { user } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [staffStats, setStaffStats] = useState(null);
    const [saStats, setSaStats] = useState(null);
    const [recentLeads, setRecentLeads] = useState([]);
    const [followUps, setFollowUps] = useState({ overdue: [], today: [] });
    const [loading, setLoading] = useState(true);
    const [hasSmtpConfigured, setHasSmtpConfigured] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const isSuperAdmin = user.role === 'super_admin' || user.role === 'superadmin_admin';
            const isCompanyUser = user.role === 'admin' || user.role === 'manager' || user.role === 'staff';

            if (isSuperAdmin) {
                const response = await api.get('/dashboard/super-admin');
                setSaStats(response.data);
            }

            if (user.role === 'admin') {
                const hasSales = hasModule('SALES');
                const [statsRes, leadsRes, smtpRes] = await Promise.all([
                    api.get(`/dashboard/admin?companyId=${user.companyId}`),
                    hasSales ? api.get('/leads') : Promise.resolve({ data: { data: [] } }),
                    api.get('/marketing/settings').catch(() => ({ data: null }))
                ]);
                setStats(statsRes.data);
                setRecentLeads(leadsRes.data.data.slice(0, 5));
                if (!smtpRes.data?.smtpHost) {
                    setHasSmtpConfigured(false);
                }
            }

            if (isCompanyUser) {
                const hasSales = hasModule('SALES');
                const [staffRes, followUpsRes] = await Promise.all([
                    api.get('/dashboard/staff'),
                    hasSales ? api.get('/dashboard/follow-ups').catch(() => ({ data: { overdue: [], today: [] } })) : Promise.resolve({ data: { overdue: [], today: [] } }),
                ]);
                setStaffStats(staffRes.data);
                setFollowUps(followUpsRes.data);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isAdmin = user.role === 'admin';
    const isSuperAdmin = user.role === 'super_admin' || user.role === 'superadmin_admin';
    const isCompanyUser = user.role === 'admin' || user.role === 'manager' || user.role === 'staff';
    
    const hasSales = hasModule('SALES');
    const hasFinance = hasModule('FINANCE');
    const hasAppointments = hasModule('APPOINTMENTS');
    const hasEvents = hasModule('EVENTS');

    const statCards = isAdmin && stats ? [
        ...(hasSales ? [
            { label: 'Total Leads', value: stats.totalLeads || 0, icon: FileText, color: 'indigo', link: '/leads' },
            { label: 'Leads Today', value: stats.leadsToday || 0, icon: CalendarDays, color: 'cyan', link: '/leads' },
            { label: 'Conversion Rate', value: `${stats.conversionRate || 0}%`, icon: TrendingUp, color: 'emerald', link: '/reports' },
            { label: 'Converted Leads', value: stats.convertedLeads || 0, icon: Users, color: 'amber', link: '/leads?status=converted' },
        ] : []),
        ...(hasFinance ? [
            { label: 'Paid Revenue', value: `₹${(stats.paidRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'purple', link: '/invoices' },
        ] : []),
        ...(hasAppointments ? [
            { label: 'Total Appointments', value: stats.totalAppointments || 0, icon: CalendarDays, color: 'cyan', link: '/appointments' },
            { label: 'Appointments Today', value: stats.appointmentsToday || 0, icon: Clock, color: 'amber', link: '/appointments' },
            { label: 'Upcoming Appts', value: stats.upcomingAppointments || 0, icon: CalendarDays, color: 'indigo', link: '/appointments' },
        ] : []),
        ...(hasEvents && stats.eventStats ? [
            { label: 'Total Events', value: stats.eventStats.totalEvents || 0, icon: CalendarDays, color: 'emerald', link: '/events' },
            { label: 'Event Bookings', value: stats.eventStats.totalBookings || 0, icon: Ticket, color: 'indigo', link: '/events' },
            { label: 'Event Revenue', value: `₹${(stats.eventStats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'purple', link: '/events' },
        ] : []),
    ] : [];

    const colorMap = {
        indigo: { bg: 'bg-indigo-600/15', border: 'border-indigo-500/30', text: 'text-indigo-400', icon: 'bg-indigo-600/20' },
        cyan: { bg: 'bg-cyan-600/15', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: 'bg-cyan-600/20' },
        emerald: { bg: 'bg-emerald-600/15', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'bg-emerald-600/20' },
        amber: { bg: 'bg-amber-600/15', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'bg-amber-600/20' },
        purple: { bg: 'bg-purple-600/15', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'bg-purple-600/20' },
    };

    const sourceCounts = {};
    recentLeads.forEach((l) => {
        sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
    });
    const chartData = Object.entries(sourceCounts).map(([name, count]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        leads: count,
    }));

    const statusBadgeColor = {
        new: 'bg-blue-500/20 text-blue-400',
        contacted: 'bg-yellow-500/20 text-yellow-400',
        follow_up: 'bg-orange-500/20 text-orange-400',
        converted: 'bg-emerald-500/20 text-emerald-400',
        lost: 'bg-red-500/20 text-red-400',
    };

    const todayAppointmentsList = (stats?.todayAppointmentsList || staffStats?.todayAppointmentsList || []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1">
                    {isSuperAdmin ? 'Platform management overview' : isAdmin ? 'Company overview and analytics' : 'Your assigned leads and follow-ups'}
                </p>
            </div>

            {isAdmin && hasEvents && !hasSmtpConfigured && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-medium text-amber-500">Email Notifications Not Configured</h4>
                        <p className="text-sm text-amber-500/80 mt-1">Your attendees will not receive booking confirmations until you configure your SMTP settings.</p>
                        <button
                            onClick={() => navigate('/settings?tab=company-email')}
                            className="mt-2 text-sm font-medium text-amber-500 hover:text-amber-400 underline"
                        >
                            Configure SMTP Settings →
                        </button>
                    </div>
                </div>
            )}

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
                                                <p className="text-xs text-gray-400 dark:text-slate-500">{plan.adminLimit} admin · {plan.employeeLimit} employees</p>
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
                <div className="flex flex-wrap gap-4">
                    {statCards.map((card) => {
                        const c = colorMap[card.color];
                        return (
                            <div
                                key={card.label}
                                className={`flex-1 min-w-[200px] ${c.bg} border ${c.border} rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer`}
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
            {staffStats && (
                <div className="flex flex-wrap gap-4">
                    {hasSales && (
                        <>
                            <div
                                className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 cursor-pointer hover:bg-gray-100 dark:bg-slate-800/50 transition-colors"
                                onClick={() => navigate('/leads')}
                            >
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Your Assigned Leads</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{staffStats.assignedLeads || 0}</p>
                            </div>
                            <div className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Follow-ups Due Today</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{staffStats.followUpsDueToday || 0}</p>
                            </div>
                        </>
                    )}
                    {hasAppointments && !isAdmin && (
                        <>
                            <div
                                className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 cursor-pointer hover:bg-gray-100 dark:bg-slate-800/50 transition-colors"
                                onClick={() => navigate('/appointments')}
                            >
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Appointments Today</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{staffStats.appointmentsToday || 0}</p>
                            </div>
                            <div
                                className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 cursor-pointer hover:bg-gray-100 dark:bg-slate-800/50 transition-colors"
                                onClick={() => navigate('/appointments')}
                            >
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Upcoming Appointments</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{staffStats.upcomingAppointments || 0}</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Pending Billing + Follow-Ups in Grid */}
            {isCompanyUser && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Pending Billing Card */}
                    {isAdmin && stats && stats.pendingAmount > 0 && hasFinance && (
                        <div
                            className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-amber-600/15 transition-colors"
                            onClick={() => navigate('/invoices')}
                        >
                            <div>
                                <p className="text-sm text-amber-400">Pending Invoices</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
                            </div>
                            <IndianRupee className="w-8 h-8 text-amber-400/30" />
                        </div>
                    )}

                    {/* Overdue Follow-Ups */}
                    {followUps.overdue.length > 0 && (
                        <div className="bg-red-600/10 border border-red-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                <h3 className="text-base font-semibold text-red-400">Overdue Follow-Ups ({followUps.overdue.length})</h3>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {followUps.overdue.map((lead) => (
                                    <div key={lead.id} className="flex items-center justify-between p-2.5 bg-red-500/5 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors" onClick={() => navigate('/leads')}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lead.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">{lead.phone || lead.email}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-red-400 font-medium">
                                                {new Date(lead.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                            {lead.assignedUser && <p className="text-[10px] text-gray-400 dark:text-slate-500">{lead.assignedUser.name}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Today's Follow-Ups */}
                    {followUps.today.length > 0 && (
                        <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <Clock className="w-5 h-5 text-amber-400" />
                                <h3 className="text-base font-semibold text-amber-400">Today&apos;s Follow-Ups ({followUps.today.length})</h3>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {followUps.today.map((lead) => (
                                    <div key={lead.id} className="flex items-center justify-between p-2.5 bg-amber-500/5 rounded-xl cursor-pointer hover:bg-amber-500/10 transition-colors" onClick={() => navigate('/leads')}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lead.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">{lead.phone || lead.email}</p>
                                        </div>
                                        <span className="text-xs text-amber-400">{lead.notes?.slice(0, 40)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {hasSales && (chartData.length > 0 || recentLeads.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leads by Source Chart */}
                    {chartData.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Leads by Source</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: '#fff',
                                    }}
                                />
                                <Bar dataKey="leads" fill="#6366f1" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Recent Leads */}
                {recentLeads.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
                            <button onClick={() => navigate('/leads')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                        </div>
                        <div className="space-y-3">
                            {recentLeads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-white dark:bg-slate-800 transition-colors"
                                    onClick={() => navigate('/leads')}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lead.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{lead.phone || lead.email}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusBadgeColor[lead.status] || 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                        {lead.status?.replace('_', ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </div>
            )}

            {/* Today's Appointments List */}
            {hasAppointments && todayAppointmentsList.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Appointments</h3>
                        <button onClick={() => navigate('/appointments')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {todayAppointmentsList.map((appt) => (
                            <div
                                key={appt.id}
                                className="flex flex-col p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all"
                                onClick={() => navigate('/appointments')}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{appt.guestName}</h4>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{appt.meetingType?.title || 'Meeting'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full shrink-0 ${appt.status === 'booked' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                        {appt.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-auto pt-2 border-t border-gray-200 dark:border-slate-700/50">
                                    <Clock className="w-4 h-4" />
                                    {appt.startTime} - {appt.endTime}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
