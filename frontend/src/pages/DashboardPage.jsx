import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { TrendingUp, Users, FileText, IndianRupee, CalendarDays, AlertTriangle, Clock, Building2, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444'];

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [staffStats, setStaffStats] = useState(null);
    const [saStats, setSaStats] = useState(null);
    const [recentLeads, setRecentLeads] = useState([]);
    const [followUps, setFollowUps] = useState({ overdue: [], today: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const isSuperAdmin = user.role === 'super_admin' || user.role === 'superadmin_admin';
            const isCompanyUser = user.role === 'admin' || user.role === 'staff';

            if (isSuperAdmin) {
                const response = await api.get('/dashboard/super-admin');
                setSaStats(response.data);
            }

            if (user.role === 'admin') {
                const [statsRes, leadsRes] = await Promise.all([
                    api.get(`/dashboard/admin?companyId=${user.companyId}`),
                    api.get('/leads'),
                ]);
                setStats(statsRes.data);
                setRecentLeads(leadsRes.data.data.slice(0, 5));
            }

            if (isCompanyUser) {
                const [staffRes, followUpsRes] = await Promise.all([
                    api.get('/dashboard/staff'),
                    api.get('/dashboard/follow-ups').catch(() => ({ data: { overdue: [], today: [] } })),
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
    const isCompanyUser = user.role === 'admin' || user.role === 'staff';

    const statCards = isAdmin && stats ? [
        { label: 'Total Leads', value: stats.totalLeads, icon: FileText, color: 'indigo', link: '/leads' },
        { label: 'Leads Today', value: stats.leadsToday, icon: CalendarDays, color: 'cyan', link: '/leads' },
        { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'emerald', link: '/reports' },
        { label: 'Converted Leads', value: stats.convertedLeads, icon: Users, color: 'amber', link: '/leads?status=converted' },
        { label: 'Paid Revenue', value: `₹${(stats.paidRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'purple', link: '/invoices' },
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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-400 mt-1">
                    {isSuperAdmin ? 'Platform management overview' : isAdmin ? 'Company overview and analytics' : 'Your assigned leads and follow-ups'}
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
                            <p className="text-2xl font-bold text-white">{saStats.totalCompanies}</p>
                            <p className="text-sm text-indigo-400 mt-1">Total Companies</p>
                        </div>
                        <div className="bg-cyan-600/15 border border-cyan-500/30 rounded-2xl p-5 transition-all hover:scale-[1.02]">
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-10 h-10 bg-cyan-600/20 rounded-xl flex items-center justify-center">
                                    <IndianRupee className="w-5 h-5 text-cyan-400" />
                                </div>
                            </div>
                            <p className="text-lg font-bold text-white">
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
                            <p className="text-2xl font-bold text-white">₹{(saStats?.thisMonthRevenue || 0).toLocaleString('en-IN')}</p>
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
                            <p className="text-2xl font-bold text-white">{saStats.activePlans}</p>
                            <p className="text-sm text-purple-400 mt-1">Active Plans</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Recent Companies</h3>
                            {saStats.companies.length === 0 ? (
                                <p className="text-slate-500 text-sm">No companies registered yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(saStats?.companies || []).slice(0, 5).map((company) => (
                                        <div key={company.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => navigate(`/companies/${company.id}`)}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                                                    <Building2 className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{company.companyName}</p>
                                                    <p className="text-xs text-slate-500">{company.users?.length || 0} users</p>
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

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Available Plans</h3>
                            {saStats.plans.length === 0 ? (
                                <p className="text-slate-500 text-sm">No plans created yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(saStats?.plans || []).map((plan) => (
                                        <div key={plan.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white">{plan.name}</p>
                                                <p className="text-xs text-slate-500">{plan.adminLimit} admin · {plan.employeeLimit} employees</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-white">₹{plan.priceMonthly}/mo</p>
                                                <p className="text-xs text-slate-500">₹{plan.priceYearly}/yr</p>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                                <p className="text-2xl font-bold text-white">{card.value}</p>
                                <p className={`text-sm ${c.text} mt-1`}>{card.label}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Staff Stats */}
            {staffStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 cursor-pointer hover:bg-slate-800/50 transition-colors"
                        onClick={() => navigate('/leads')}
                    >
                        <p className="text-sm text-slate-400 mb-1">Your Assigned Leads</p>
                        <p className="text-3xl font-bold text-white">{staffStats.assignedLeads}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <p className="text-sm text-slate-400 mb-1">Follow-ups Due Today</p>
                        <p className="text-3xl font-bold text-white">{staffStats.followUpsDueToday}</p>
                    </div>
                </div>
            )}

            {/* Pending Billing + Follow-Ups in Grid */}
            {isCompanyUser && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Pending Billing Card */}
                    {isAdmin && stats && stats.pendingAmount > 0 && (
                        <div
                            className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-amber-600/15 transition-colors"
                            onClick={() => navigate('/invoices')}
                        >
                            <div>
                                <p className="text-sm text-amber-400">Pending Invoices</p>
                                <p className="text-2xl font-bold text-white mt-1">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
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
                                            <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                                            <p className="text-xs text-slate-400">{lead.phone || lead.email}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-red-400 font-medium">
                                                {new Date(lead.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                            {lead.assignedUser && <p className="text-[10px] text-slate-500">{lead.assignedUser.name}</p>}
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
                                            <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                                            <p className="text-xs text-slate-400">{lead.phone || lead.email}</p>
                                        </div>
                                        <span className="text-xs text-amber-400">{lead.notes?.slice(0, 40)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Leads by Source Chart */}
                {chartData.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
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
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Recent Leads</h3>
                            <button onClick={() => navigate('/leads')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                        </div>
                        <div className="space-y-3">
                            {recentLeads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors"
                                    onClick={() => navigate('/leads')}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                                        <p className="text-xs text-slate-400">{lead.phone || lead.email}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${statusBadgeColor[lead.status] || 'bg-slate-700 text-slate-300'}`}>
                                        {lead.status?.replace('_', ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
