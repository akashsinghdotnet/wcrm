import { useState, useEffect } from 'react';
import { Send, Calendar, Users, CheckCircle, XCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function WhatsAppBroadcastPage() {
    const [broadcasts, setBroadcasts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [lists, setLists] = useState([]);
    const [tags, setTags] = useState([]);
    const [showComposer, setShowComposer] = useState(false);
    const [selectedBroadcast, setSelectedBroadcast] = useState(null);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [broadcastStats, setBroadcastStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        name: '',
        templateId: '',
        message: '',
        targetListIds: [],
        targetTagIds: [],
        targetContactIds: [],
        onlyOptedIn: true,
        scheduledAt: '',
    });

    const [preview, setPreview] = useState({
        totalRecipients: 0,
        optedInCount: 0,
        optedOutCount: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [broadcastsRes, templatesRes, listsRes, tagsRes] = await Promise.all([
                api.get('/whatsapp-crm/broadcasts'),
                api.get('/whatsapp-crm/templates/approved'),
                api.get('/whatsapp-crm/lists'),
                api.get('/whatsapp-crm/tags'),
            ]);

            setBroadcasts(broadcastsRes.data);
            setTemplates(templatesRes.data);
            setLists(listsRes.data);
            setTags(tagsRes.data);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBroadcast = async (e) => {
        e.preventDefault();

        if (!form.templateId && !form.message) {
            toast.error('Please select a template or enter a message');
            return;
        }

        if (form.targetListIds.length === 0 && form.targetTagIds.length === 0 && form.targetContactIds.length === 0) {
            toast.error('Please select at least one target (list, tag, or contacts)');
            return;
        }

        try {
            await api.post('/whatsapp-crm/broadcasts', form);
            toast.success('Broadcast created successfully');
            setShowComposer(false);
            setForm({
                name: '',
                templateId: '',
                message: '',
                targetListIds: [],
                targetTagIds: [],
                targetContactIds: [],
                onlyOptedIn: true,
                scheduledAt: '',
            });
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create broadcast');
        }
    };

    const handleSendBroadcast = async (broadcastId) => {
        if (!confirm('Are you sure you want to send this broadcast? This cannot be undone.')) {
            return;
        }

        try {
            await api.post(`/whatsapp-crm/broadcasts/${broadcastId}/send`);
            toast.success('Broadcast sent successfully!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send broadcast');
        }
    };

    const handleViewStats = async (broadcast) => {
        try {
            const statsRes = await api.get(`/whatsapp-crm/broadcasts/${broadcast.id}/stats`);
            setBroadcastStats(statsRes.data);
            setSelectedBroadcast(broadcast);
            setShowStatsModal(true);
        } catch (err) {
            toast.error('Failed to load stats');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: { bg: 'bg-slate-700', text: 'text-slate-300', label: 'Draft', icon: Clock },
            scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Scheduled', icon: Calendar },
            sending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Sending', icon: Send },
            sent: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Sent', icon: CheckCircle },
            failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed', icon: XCircle },
        };

        const badge = badges[status] || badges.draft;
        const Icon = badge.icon;

        return (
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${badge.bg} ${badge.text} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Send className="w-8 h-8 text-green-400" />
                            WhatsApp Broadcasts
                        </h1>
                        <p className="text-slate-400 mt-1">Send bulk messages to your opted-in contacts</p>
                    </div>
                    <button
                        onClick={() => setShowComposer(true)}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 font-medium"
                    >
                        <Send className="w-5 h-5" />
                        New Broadcast
                    </button>
                </div>

                {/* Compliance Notice */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-yellow-400 font-medium mb-1">Meta Compliance Notice</h3>
                        <p className="text-sm text-yellow-300/80">
                            All broadcasts require Meta-approved templates. Messages are only sent to opted-in contacts.
                            Maintain your quality rating to avoid restrictions. Learn more about{' '}
                            <a href="https://business.whatsapp.com/policy" target="_blank" rel="noopener noreferrer" className="underline">
                                WhatsApp Business Policy
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Broadcasts List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Template</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Recipients</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Progress</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td>
                                </tr>
                            ) : broadcasts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No broadcasts yet. Click "New Broadcast" to create one.
                                    </td>
                                </tr>
                            ) : (
                                broadcasts.map(broadcast => (
                                    <tr key={broadcast.id} className="hover:bg-slate-700/50">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium">{broadcast.name}</div>
                                            <div className="text-xs text-slate-400 mt-1">By {broadcast.creator?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {broadcast.template?.name || 'Custom Message'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                <span className="text-white font-medium">{broadcast.totalRecipients}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(broadcast.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {broadcast.status === 'sent' || broadcast.status === 'sending' ? (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-400">Sent</span>
                                                        <span className="text-green-400">{broadcast.sentCount}/{broadcast.totalRecipients}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                                        <div
                                                            className="bg-green-500 h-2 rounded-full"
                                                            style={{ width: `${(broadcast.sentCount / broadcast.totalRecipients) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(broadcast.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewStats(broadcast)}
                                                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                    Stats
                                                </button>
                                                {broadcast.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleSendBroadcast(broadcast.id)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                                    >
                                                        Send
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Broadcast Composer Modal */}
            {showComposer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-800 rounded-2xl max-w-4xl w-full p-6 border border-slate-700 my-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Create Broadcast</h2>
                        <form onSubmit={handleCreateBroadcast}>
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Broadcast Name *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            required
                                            placeholder="e.g., March Promotion Campaign"
                                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Template (Meta-approved only)
                                        </label>
                                        <select
                                            value={form.templateId}
                                            onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">Select Template</option>
                                            {templates.map(template => (
                                                <option key={template.id} value={template.id}>
                                                    {template.name} ({template.category})
                                                </option>
                                            ))}
                                        </select>
                                        {templates.length === 0 && (
                                            <p className="text-xs text-yellow-400 mt-1">
                                                No approved templates found. Create and get templates approved from Meta first.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Message (if no template)
                                        </label>
                                        <textarea
                                            value={form.message}
                                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                                            rows={4}
                                            placeholder="Enter your message..."
                                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Schedule (optional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={form.scheduledAt}
                                            onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Leave empty to send immediately</p>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Lists</label>
                                        <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-900 rounded-xl p-3 border border-slate-700">
                                            {lists.map(list => (
                                                <label key={list.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.targetListIds.includes(list.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setForm({ ...form, targetListIds: [...form.targetListIds, list.id] });
                                                            } else {
                                                                setForm({ ...form, targetListIds: form.targetListIds.filter(id => id !== list.id) });
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-green-600"
                                                    />
                                                    <span className="text-sm text-slate-300">{list.name}</span>
                                                    <span className="text-xs text-slate-500 ml-auto">
                                                        ({list.contacts?.length || 0} contacts)
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Target Tags</label>
                                        <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-900 rounded-xl p-3 border border-slate-700">
                                            {tags.map(tag => (
                                                <label key={tag.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.targetTagIds.includes(tag.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setForm({ ...form, targetTagIds: [...form.targetTagIds, tag.id] });
                                                            } else {
                                                                setForm({ ...form, targetTagIds: form.targetTagIds.filter(id => id !== tag.id) });
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-green-600"
                                                    />
                                                    <span className="text-sm text-slate-300">{tag.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.onlyOptedIn}
                                                onChange={(e) => setForm({ ...form, onlyOptedIn: e.target.checked })}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-green-600 mt-0.5"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-green-400 block">Only send to opted-in contacts</span>
                                                <span className="text-xs text-green-300/70 block mt-1">
                                                    ✓ Recommended for Meta compliance. Excludes opted-out contacts.
                                                </span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                        <h4 className="text-sm font-medium text-slate-300 mb-3">Estimated Recipients</h4>
                                        <div className="text-3xl font-bold text-green-400 mb-1">
                                            {form.targetListIds.length + form.targetTagIds.length > 0 ? '~' : '0'} contacts
                                        </div>
                                        <p className="text-xs text-slate-500">Will be calculated when broadcast is created</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setShowComposer(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    {form.scheduledAt ? 'Schedule Broadcast' : 'Create Broadcast'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {showStatsModal && broadcastStats && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-6 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-6">Broadcast Statistics</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-slate-300 mb-2">{selectedBroadcast?.name}</h3>
                                <p className="text-sm text-slate-500">Created {new Date(selectedBroadcast?.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                    <div className="text-slate-400 text-sm mb-1">Total Recipients</div>
                                    <div className="text-2xl font-bold text-white">{broadcastStats.total}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-green-500/20">
                                    <div className="text-slate-400 text-sm mb-1">Sent</div>
                                    <div className="text-2xl font-bold text-green-400">{broadcastStats.sent}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                                    <div className="text-slate-400 text-sm mb-1">Delivered</div>
                                    <div className="text-2xl font-bold text-blue-400">{broadcastStats.delivered}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-purple-500/20">
                                    <div className="text-slate-400 text-sm mb-1">Read</div>
                                    <div className="text-2xl font-bold text-purple-400">{broadcastStats.read}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-red-500/20">
                                    <div className="text-slate-400 text-sm mb-1">Failed</div>
                                    <div className="text-2xl font-bold text-red-400">{broadcastStats.failed}</div>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                    <div className="text-slate-400 text-sm mb-1">Success Rate</div>
                                    <div className="text-2xl font-bold text-white">
                                        {broadcastStats.total > 0
                                            ? ((broadcastStats.delivered / broadcastStats.total) * 100).toFixed(1)
                                            : 0}%
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowStatsModal(false)}
                            className="w-full mt-6 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
