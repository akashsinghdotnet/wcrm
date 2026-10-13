import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Loader2, Shuffle, RefreshCcw, UserCheck } from 'lucide-react';

const SOURCE_OPTIONS = [
    { value: 'meta_ads', label: 'Meta Ads' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'justdial', label: 'JustDial' },
    { value: 'indiamart', label: 'IndiaMart' },
    { value: 'tradeindia', label: 'TradeIndia' },
    { value: 'website', label: 'Website' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'manual', label: 'Manual' },
];

export default function LeadAssignmentSettings() {
    const [rules, setRules] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [saving, setSaving] = useState(false);
    const [assignmentMode, setAssignmentMode] = useState('round_robin');
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [rulesRes, usersRes] = await Promise.all([
                api.get('/leads/assignment-rules'),
                api.get('/users'),
            ]);
            setRules(rulesRes.data);
            setUsers(usersRes.data);
            setEmployees(usersRes.data.filter(u => u.isActive && u.role !== 'super_admin'));
        } catch {
            toast.error('Failed to load assignment rules');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!source || !assignedTo) return;
        setSaving(true);
        try {
            await api.post('/leads/assignment-rules', { source, assignedTo });
            toast.success('Assignment rule saved');
            setSource('');
            setAssignedTo('');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this assignment rule?')) return;
        try {
            await api.delete(`/leads/assignment-rules/${id}`);
            toast.success('Rule deleted');
            loadData();
        } catch {
            toast.error('Failed to delete rule');
        }
    };

    // Sources already assigned
    const usedSources = rules.map(r => r.source);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Lead Distribution Mode */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-indigo-400" />
                    Lead Distribution
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">Choose how incoming leads are assigned to your team</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => { setAssignmentMode('round_robin'); toast.success('Round-robin assignment enabled'); }}
                        className={`p-4 rounded-xl border text-left transition-all ${assignmentMode === 'round_robin'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:border-slate-600 bg-gray-100 dark:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${assignmentMode === 'round_robin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                <RefreshCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Round Robin</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Auto-assign to team members in rotation</p>
                            </div>
                        </div>
                        {assignmentMode === 'round_robin' && (
                            <div className="mt-3 pt-3 border-t border-indigo-500/20">
                                <p className="text-xs text-indigo-300">Active employees in rotation:</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {employees.length > 0 ? employees.map(e => (
                                        <span key={e.id} className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 text-xs rounded-md">
                                            {e.name || e.email.split('@')[0]}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-gray-400 dark:text-slate-500">No active employees found</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => { setAssignmentMode('manual'); toast.success('Manual assignment enabled'); }}
                        className={`p-4 rounded-xl border text-left transition-all ${assignmentMode === 'manual'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:border-slate-600 bg-gray-100 dark:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${assignmentMode === 'manual' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">Manual Assignment</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Admin assigns leads manually</p>
                            </div>
                        </div>
                        {assignmentMode === 'manual' && (
                            <div className="mt-3 pt-3 border-t border-indigo-500/20">
                                <p className="text-xs text-indigo-300">New leads land as unassigned. Admins assign from the Leads page.</p>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Source-Based Auto-Assignment Rules */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Source-Based Auto-Assignment</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Assign leads from specific sources to specific employees. Leads without a matching rule will use the distribution mode above.
                </p>
            </div>

            {/* Add Rule Form */}
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Lead Source</label>
                    <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Source</option>
                        {SOURCE_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Assign To</label>
                    <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Employee</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.name || u.email} ({u.role})
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="submit"
                    disabled={!source || !assignedTo || saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Add Rule'}
                </button>
            </form>

            {/* Rules Table */}
            {rules.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-slate-500 py-8 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-2xl">
                    No assignment rules configured. All leads will use round-robin assignment.
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Assigned Employee</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                            {rules.map((rule) => {
                                const sourceLabel = SOURCE_OPTIONS.find(s => s.value === rule.source)?.label || rule.source;
                                return (
                                    <tr key={rule.id} className="hover:bg-gray-100 dark:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-400">
                                                {sourceLabel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {rule.assignedUser?.name || rule.assignedUser?.email || rule.assignedTo}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${rule.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                                {rule.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
