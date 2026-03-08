import { useState, useEffect, useRef } from 'react';
import { Mail, Settings, Send, Save, RefreshCw, Calendar, CheckCircle2, XCircle, Search, History, Eye, X, Paperclip } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

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

const ViewEmailModal = ({ email, onClose }) => {
    if (!email) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white">Email Details</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">To</span>
                            <span className="text-white font-medium">{email.to}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Sent At</span>
                            <span className="text-white font-medium">{new Date(email.sentAt).toLocaleString()}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-slate-500 block mb-1">Subject</span>
                            <span className="text-white font-medium">{email.subject}</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-4">
                        <span className="text-slate-500 block mb-2 text-sm">Content</span>
                        <div
                            className="bg-white text-black p-4 rounded-xl min-h-[200px] prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: email.body }}
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const BroadcastConfirmModal = ({ isOpen, onClose, onConfirm, summary }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                            <Send size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Confirm Broadcast</h3>
                            <p className="text-sm text-slate-400">Are you sure you want to send this email?</p>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 mb-6">
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Subject</span>
                            <p className="text-sm text-white font-medium truncate">{summary.subject}</p>
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Audience</span>
                            <p className="text-sm text-white font-medium">{summary.audience}</p>
                        </div>
                        {summary.manualRecipients && (
                            <div>
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Recipients</span>
                                <p className="text-sm text-white font-medium truncate">{summary.manualRecipients}</p>
                            </div>
                        )}
                        <div>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Attachments</span>
                            <p className="text-sm text-white font-medium">{summary.attachmentCount} files</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Send size={16} />
                            Send Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function MarketingPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('compose'); // compose | history | settings
    const [loading, setLoading] = useState(false);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: false,
        fromEmail: '',
        fromName: ''
    });

    // Compose State
    const [emailData, setEmailData] = useState({
        subject: '',
        body: '',
        audience: '', // Will default based on role
        manualRecipients: '',
        attachments: []
    });

    // File input ref
    const fileInputRef = useRef(null);

    // History State
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);

    useEffect(() => {
        if (activeTab === 'settings') fetchSettings();
        if (activeTab === 'history') fetchLogs();
        if (activeTab === 'compose') {
            // Set default audience
            const defaultAudience = user?.role === 'super_admin' ? 'ALL_CLIENTS' : 'LEADS';
            setEmailData(prev => ({ ...prev, audience: defaultAudience }));
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/marketing/settings');
            if (res.data) {
                setSettings({
                    smtpHost: res.data.smtpHost || '',
                    smtpPort: res.data.smtpPort || 587,
                    smtpUser: res.data.smtpUser || '',
                    smtpPassword: res.data.smtpPassword || '',
                    smtpSecure: res.data.smtpSecure || false,
                    fromEmail: res.data.fromEmail || '',
                    fromName: res.data.fromName || ''
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            // Re-using existing email logs endpoint if permissible, or we might need a specific one for marketing
            // For now assuming /email/logs exists and works (from EmailHistoryPage)
            const res = await api.get('/email/logs');
            setLogs(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/marketing/settings', settings);
            toast.success('SMTP Settings saved successfully');
        } catch (err) {
            toast.error('Failed to save settings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            setEmailData(prev => ({
                ...prev,
                attachments: [...prev.attachments, ...Array.from(e.target.files)]
            }));
        }
    };

    const removeAttachment = (index) => {
        setEmailData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const initiateBroadcast = (e) => {
        e.preventDefault();
        // Validation could go here if needed
        setShowConfirmModal(true);
    };

    const executeBroadcast = async () => {
        setShowConfirmModal(false);
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('subject', emailData.subject);
            formData.append('body', emailData.body);
            formData.append('audience', emailData.audience);
            if (emailData.manualRecipients) {
                formData.append('manualRecipients', emailData.manualRecipients);
            }

            // Append files
            emailData.attachments.forEach(file => {
                formData.append('files', file);
            });

            // Need to adjust headers for multipart? Axios usually handles this if data is FormData
            const res = await api.post('/marketing/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(`Email sent! Success: ${res.data.sent}, Failed: ${res.data.failed}`);
            setEmailData(prev => ({ ...prev, subject: '', body: '', attachments: [] }));
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Marketing & Broadcasts</h1>
                    <p className="text-slate-400">Send updates and marketing emails to your audience.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('compose')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'compose' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Compose Email
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Sent History
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        SMTP Settings
                    </div>
                </button>
            </div>

            {/* Compose Tab */}
            {activeTab === 'compose' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <form onSubmit={initiateBroadcast} className="space-y-6">
                        {/* Audience Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Audience</label>
                                <select
                                    value={emailData.audience}
                                    onChange={e => setEmailData(prev => ({ ...prev, audience: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {user?.role === 'super_admin' ? (
                                        <>
                                            <option value="ALL_CLIENTS">All System Users (Company Admins)</option>
                                            <option value="ACTIVE_CLIENTS">Active Clients Only</option>
                                            <option value="INACTIVE_CLIENTS">Inactive Clients Only</option>
                                            <option value="MANUAL">Manual Entry (Specific Emails)</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="LEADS">All Leads</option>
                                            <option value="MANUAL">Manual Entry (Specific Emails)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Manual Recipients Input */}
                        {emailData.audience === 'MANUAL' && (
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Recipients (Comma separated)
                                </label>
                                <textarea
                                    rows={3}
                                    value={emailData.manualRecipients}
                                    onChange={e => setEmailData(prev => ({ ...prev, manualRecipients: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="email1@example.com, email2@example.com"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject</label>
                            <input
                                type="text"
                                required
                                value={emailData.subject}
                                onChange={e => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. Monthly Newsletter"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Body</label>
                            <div className="quill-dark-theme rounded-xl overflow-hidden border border-slate-700">
                                <ReactQuill
                                    theme="snow"
                                    value={emailData.body}
                                    onChange={content => setEmailData(prev => ({ ...prev, body: content }))}
                                    className="bg-slate-800 text-white"
                                    style={{ minHeight: '250px' }}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
                                            [{ 'align': [] }],
                                            ['link', 'image'],
                                            ['clean']
                                        ],
                                    }}
                                />
                            </div>
                            <style>{`
                                .quill-dark-theme .ql-toolbar.ql-snow {
                                    border: none !important;
                                    border-bottom: 1px solid #334155 !important;
                                    background: #1e293b !important;
                                    padding: 8px 12px !important;
                                }
                                .quill-dark-theme .ql-container.ql-snow {
                                    border: none !important;
                                    min-height: 200px;
                                }
                                .quill-dark-theme .ql-editor {
                                    min-height: 200px;
                                    color: #e2e8f0 !important;
                                    font-size: 14px;
                                }
                                .quill-dark-theme .ql-editor.ql-blank::before {
                                    color: #64748b !important;
                                    font-style: normal !important;
                                }
                                .quill-dark-theme .ql-toolbar .ql-stroke {
                                    stroke: #94a3b8 !important;
                                }
                                .quill-dark-theme .ql-toolbar .ql-fill {
                                    fill: #94a3b8 !important;
                                }
                                .quill-dark-theme .ql-toolbar .ql-picker-label {
                                    color: #94a3b8 !important;
                                }
                                .quill-dark-theme .ql-toolbar .ql-picker-options {
                                    background: #1e293b !important;
                                    border-color: #334155 !important;
                                }
                                .quill-dark-theme .ql-toolbar .ql-picker-item {
                                    color: #e2e8f0 !important;
                                }
                                .quill-dark-theme .ql-toolbar .ql-picker-item:hover {
                                    color: #818cf8 !important;
                                }
                                .quill-dark-theme .ql-toolbar button:hover .ql-stroke,
                                .quill-dark-theme .ql-toolbar button.ql-active .ql-stroke {
                                    stroke: #818cf8 !important;
                                }
                                .quill-dark-theme .ql-toolbar button:hover .ql-fill,
                                .quill-dark-theme .ql-toolbar button.ql-active .ql-fill {
                                    fill: #818cf8 !important;
                                }
                                .quill-dark-theme .ql-toolbar button:hover,
                                .quill-dark-theme .ql-toolbar button.ql-active {
                                    color: #818cf8 !important;
                                }
                                .quill-dark-theme .ql-snow .ql-picker-label::before {
                                    color: #94a3b8 !important;
                                }
                            `}</style>
                        </div>

                        {/* Attachments */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">Attachments</label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                >
                                    <Paperclip size={14} /> Add Files
                                </button>
                            </div>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            {emailData.attachments.length > 0 && (
                                <div className="space-y-2">
                                    {emailData.attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                                            <span className="text-sm text-slate-300 truncate max-w-[200px]">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="text-slate-400 hover:text-red-400"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-800">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25"
                            >
                                <Send className="w-4 h-4" />
                                {loading ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/50">
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Recipient</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {logsLoading ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500">Loading logs...</td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-500">No sent email history found.</td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4">
                                                <StatusBadge status={log.status} />
                                                {log.status === 'failed' && (
                                                    <div className="mt-1 text-xs text-red-400 max-w-[200px] truncate" title={log.errorMessage}>
                                                        {log.errorMessage}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-white">{log.to}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-slate-300">{log.subject}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Calendar size={14} />
                                                    {new Date(log.sentAt).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => setSelectedEmail(log)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                                                    title="View Content"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">SMTP Configuration</h3>
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">SMTP Host</label>
                                <input
                                    type="text"
                                    required
                                    value={settings.smtpHost}
                                    onChange={e => setSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="smtp.example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">SMTP Port</label>
                                <input
                                    type="number"
                                    required
                                    value={settings.smtpPort}
                                    onChange={e => setSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="587"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">SMTP Username</label>
                                <input
                                    type="text"
                                    required
                                    value={settings.smtpUser}
                                    onChange={e => setSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">SMTP Password</label>
                                <input
                                    type="password"
                                    required
                                    value={settings.smtpPassword}
                                    onChange={e => setSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pb-2">
                            <input
                                type="checkbox"
                                id="smtpSecure"
                                checked={settings.smtpSecure}
                                onChange={e => setSettings(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="smtpSecure" className="text-sm font-medium text-slate-300">
                                Use Secure Connection (SSL/TLS - Port 465)
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">From Email</label>
                                <input
                                    type="email"
                                    required
                                    value={settings.fromEmail}
                                    onChange={e => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="marketing@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">From Name</label>
                                <input
                                    type="text"
                                    value={settings.fromName}
                                    onChange={e => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="My Company"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-800">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Email Detail Modal */}
            <ViewEmailModal
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
            />

            {/* Broadcast Confirmation Modal */}
            <BroadcastConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={executeBroadcast}
                summary={{
                    subject: emailData.subject,
                    audience: emailData.audience,
                    manualRecipients: emailData.manualRecipients,
                    attachmentCount: emailData.attachments.length
                }}
            />
        </div>
    );
}
