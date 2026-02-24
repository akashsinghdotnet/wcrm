import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { CalendarDays, TrendingUp, Target, IndianRupee, Loader2 } from 'lucide-react';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = { new: '#3b82f6', contacted: '#06b6d4', follow_up: '#f59e0b', converted: '#10b981', lost: '#ef4444' };

const DATE_PRESETS = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'All Time', days: null },
];

export default function ReportsPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preset, setPreset] = useState(1); // Default: 30 days

    const dateRange = useMemo(() => {
        const days = DATE_PRESETS[preset].days;
        if (!days) return {};
        const to = new Date().toISOString();
        const from = new Date(Date.now() - days * 86400000).toISOString();
        return { from, to };
    }, [preset]);

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = {};
            if (dateRange.from) params.from = dateRange.from;
            if (dateRange.to) params.to = dateRange.to;
            const res = await api.get('/dashboard/reports', { params });
            setData(res.data);
        } catch {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const totalLeads = data.leadsByStatus?.reduce((a, b) => a + parseInt(b.count), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Reports & Analytics</h2>
                    <p className="text-slate-400 mt-1">Deep-dive into your lead performance</p>
                </div>
                <div className="flex gap-2">
                    {DATE_PRESETS.map((p, i) => (
                        <button
                            key={p.label}
                            onClick={() => setPreset(i)}
                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${preset === i
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard icon={Target} label="Total Leads" value={totalLeads} color="text-blue-400" />
                <KpiCard icon={TrendingUp} label="Conversion Rate" value={`${data.conversionRate}%`} color="text-emerald-400" />
                <KpiCard icon={IndianRupee} label="Paid Revenue" value={`₹${(data.paidRevenue || 0).toLocaleString('en-IN')}`} color="text-green-400" />
                <KpiCard icon={CalendarDays} label="Pending Invoices" value={`₹${(data.pendingAmount || 0).toLocaleString('en-IN')}`} color="text-amber-400" />
            </div>

            {/* Charts Row 1: Funnel + Source Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Funnel */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-4">Lead Funnel</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.leadsByStatus} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis type="category" dataKey="status" tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                                {data.leadsByStatus?.map((entry, i) => (
                                    <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Source Pie */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-4">Leads by Source</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={data.leadsBySource}
                                dataKey="count"
                                nameKey="source"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ source, count }) => `${source?.replace('_', ' ')} (${count})`}
                            >
                                {data.leadsBySource?.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2: Leads over time + Revenue by month */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-4">Leads Over Time</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={data.leadsOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
                            <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-white font-semibold mb-4">Revenue by Month</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.revenueByMonth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                            <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-slate-800 ${color}`}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    );
}
