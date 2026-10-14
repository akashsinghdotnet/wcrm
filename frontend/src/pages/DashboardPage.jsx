import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    TrendingUp, Users,
    MessageSquare, Radio, Zap, GitFork 
} from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [staffStats, setStaffStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            if (user?.role === 'admin' || user?.role === 'manager') {
                const statsRes = await api.get(`/dashboard/admin?companyId=${user.companyId || ''}`);
                setStats(statsRes.data);
            } else {
                const staffRes = await api.get('/dashboard/staff');
                setStaffStats(staffRes.data);
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

    const isAdmin = user?.role === 'admin' || user?.role === 'manager';

    const statCards = [
        { label: 'WhatsApp Chats', value: stats?.totalLeads || 0, icon: MessageSquare, color: 'emerald', link: '/inbox' },
        { label: 'Audience Contacts', value: stats?.leadsToday ? `${stats.leadsToday} New` : 'Active', icon: Users, color: 'cyan', link: '/contacts' },
        { label: 'Pipeline Deals', value: stats?.convertedLeads || 0, icon: TrendingUp, color: 'amber', link: '/pipeline' },
        { label: 'Active Broadcasts', value: 'Campaigns', icon: Radio, color: 'indigo', link: '/broadcasts' },
        { label: 'Live Automations', value: 'Triggers', icon: Zap, color: 'emerald', link: '/automations' },
        { label: 'Interactive Flows', value: 'Active Trees', icon: GitFork, color: 'purple', link: '/flows' },
    ];

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
                    Company overview and WhatsApp CRM metrics
                </p>
            </div>

            {/* Admin / Manager Stat Cards */}
            {isAdmin && (
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
