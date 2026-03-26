import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, XCircle, Search, RefreshCw, Calendar } from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';

const StatusBadge = ({ status }) => {
    if (status === 'sent') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={12} /> Sent
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle size={12} /> Failed
        </span>
    );
};

export default function EmailHistoryPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/email/logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.to.toLowerCase().includes(search.toLowerCase()) ||
        log.subject.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout title="Email History">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email History</h1>
                        <p className="text-gray-500 dark:text-slate-400">Log of all system-sent emails</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg transition-colors border border-gray-300 dark:border-slate-700"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by recipient or subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Recipient</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Subject</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-400 dark:text-slate-500">Loading logs...</td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-400 dark:text-slate-500">No email logs found</td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-100 dark:bg-slate-800/50 transition-colors">
                                            <td className="p-4">
                                                <StatusBadge status={log.status} />
                                                {log.status === 'failed' && (
                                                    <div className="mt-1 text-xs text-red-400 max-w-[200px] truncate" title={log.errorMessage}>
                                                        {log.errorMessage}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{log.to}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-gray-600 dark:text-slate-300">{log.subject}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                                    <Calendar size={14} />
                                                    {new Date(log.sentAt).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
