import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { CalendarDays, TrendingUp, Target, IndianRupee, Loader2, Download, Users } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'employee'
    const [employeeData, setEmployeeData] = useState([]);
    const [empLoading, setEmpLoading] = useState(false);

    const dateRange = useMemo(() => {
        const days = DATE_PRESETS[preset].days;
        if (!days) return {};
        const to = new Date().toISOString();
        const from = new Date(Date.now() - days * 86400000).toISOString();
        return { from, to };
    }, [preset]);

    useEffect(() => {
        fetchReports();
        if (activeTab === 'employee') fetchEmployeeReports();
    }, [dateRange]);

    useEffect(() => {
        if (activeTab === 'employee' && employeeData.length === 0) fetchEmployeeReports();
    }, [activeTab]);

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

    const fetchEmployeeReports = async () => {
        try {
            setEmpLoading(true);
            const params = {};
            if (dateRange.from) params.from = dateRange.from;
            if (dateRange.to) params.to = dateRange.to;
            const res = await api.get('/dashboard/employee-reports', { params });
            setEmployeeData(res.data);
        } catch {
            toast.error('Failed to load employee reports');
        } finally {
            setEmpLoading(false);
        }
    };

    const downloadEmployeeCsv = () => {
        if (!employeeData.length) return;
        const header = 'Employee,Email,Total Leads,New,Contacted,Follow Up,Converted,Lost,Conversion Rate\n';
        const rows = employeeData.map(e =>
            [e.name, e.email, e.total, e.newCount, e.contactedCount, e.followUpCount, e.convertedCount, e.lostCount, `${e.conversionRate}%`]
                .map(f => `"${f}"`).join(',')
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'employee-performance.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('CSV downloaded');
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Deep-dive into your lead performance</p>
                </div>
                <div className="flex gap-2">
                    {DATE_PRESETS.map((p, i) => (
                        <button
                            key={p.label}
                            onClick={() => setPreset(i)}
                            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${preset === i
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:bg-slate-700'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('employee')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === 'employee' ? 'bg-indigo-600 text-gray-900 dark:text-white shadow-lg shadow-indigo-600/25' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-white hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700'}`}
                >
                    <Users className="w-4 h-4" />
                    Employee Performance
                </button>
            </div>

            {activeTab === 'employee' ? (
                /* Employee Performance Tab */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Performance</h3>
                        <button
                            onClick={downloadEmployeeCsv}
                            disabled={!employeeData.length}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-sm font-medium rounded-xl transition-all border border-gray-300 dark:border-slate-700 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            Download CSV
                        </button>
                    </div>
                    {empLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : employeeData.length === 0 ? (
                        <div className="text-center text-gray-400 dark:text-slate-500 py-12">No assigned leads found</div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-slate-800">
                                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-blue-400 uppercase tracking-wider">New</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-cyan-400 uppercase tracking-wider">Contacted</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-orange-400 uppercase tracking-wider">Follow Up</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-emerald-400 uppercase tracking-wider">Converted</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-red-400 uppercase tracking-wider">Lost</th>
                                            <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Conversion %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                        {employeeData.map((emp) => (
                                            <tr key={emp.userId} className="hover:bg-gray-100 dark:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
                                                    <p className="text-xs text-gray-400 dark:text-slate-500">{emp.email}</p>
                                                </td>
                                                <td className="px-4 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">{emp.total}</td>
                                                <td className="px-4 py-4 text-center text-sm text-blue-400">{emp.newCount}</td>
                                                <td className="px-4 py-4 text-center text-sm text-cyan-400">{emp.contactedCount}</td>
                                                <td className="px-4 py-4 text-center text-sm text-orange-400">{emp.followUpCount}</td>
                                                <td className="px-4 py-4 text-center text-sm text-emerald-400 font-semibold">{emp.convertedCount}</td>
                                                <td className="px-4 py-4 text-center text-sm text-red-400">{emp.lostCount}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${emp.conversionRate >= 50 ? 'bg-emerald-500/20 text-emerald-400' : emp.conversionRate >= 20 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                                        {emp.conversionRate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            <>
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
                <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Lead Funnel</h3>
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
                <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Leads by Source</h3>
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
                <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Leads Over Time</h3>
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

                <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Revenue by Month</h3>
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
            </>
            )}
        </div>
    );
}

function KpiCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white dark:bg-slate-800 ${color}`}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
}
