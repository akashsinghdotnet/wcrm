import { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function WhatsAppTemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        name: '',
        content: '',
        category: 'marketing',
        language: 'en',
        variables: [],
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get('/whatsapp-crm/templates');
            setTemplates(res.data);
        } catch (err) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/whatsapp-crm/templates', form);
            toast.success('Template created. Submit to Meta for approval.');
            setShowModal(false);
            setForm({ name: '', content: '', category: 'marketing', language: 'en', variables: [] });
            loadTemplates();
        } catch (err) {
            toast.error('Failed to create template');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending Approval' },
            approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Approved' },
            rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rejected' },
        };

        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;

        return (
            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${badge.bg} ${badge.text} flex items-center gap-1 w-fit`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <FileText className="w-8 h-8 text-green-400" />
                            Message Templates
                        </h1>
                        <p className="text-slate-400 mt-1">Manage Meta-approved message templates for broadcasts</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Template
                    </button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                    <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-blue-400 font-medium mb-1">Template Approval Required</h3>
                        <p className="text-sm text-blue-300/80">
                            All broadcast templates must be approved by Meta before use.{' '}
                            <a
                                href="https://business.facebook.com/wa/manage/message-templates/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                            >
                                Submit templates for approval
                            </a>{' '}
                            in your WhatsApp Business Manager.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-slate-500">Loading...</div>
                ) : templates.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-500">
                        No templates yet. Click "New Template" to create one.
                    </div>
                ) : (
                    templates.map(template => (
                        <div key={template.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                                {getStatusBadge(template.status)}
                            </div>
                            <div className="mb-4">
                                <div className="text-xs text-slate-500 mb-1">Category</div>
                                <div className="text-sm text-slate-300 capitalize">{template.category}</div>
                            </div>
                            <div className="mb-4">
                                <div className="text-xs text-slate-500 mb-1">Content</div>
                                <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded-lg font-mono whitespace-pre-wrap">
                                    {template.content}
                                </div>
                            </div>
                            {template.variables && template.variables.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-xs text-slate-500 mb-1">Variables</div>
                                    <div className="flex flex-wrap gap-1">
                                        {template.variables.map((variable, index) => (
                                            <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                                {variable}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="text-xs text-slate-500">
                                Created {new Date(template.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Template Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-6 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-6">Create Message Template</h2>
                        <form onSubmit={handleCreateTemplate}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Template Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                        placeholder="e.g., monthly_newsletter"
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Use lowercase and underscores only</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Category *</label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                        >
                                            <option value="marketing">Marketing</option>
                                            <option value="utility">Utility</option>
                                            <option value="authentication">Authentication</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Language *</label>
                                        <select
                                            value={form.language}
                                            onChange={(e) => setForm({ ...form, language: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                        >
                                            <option value="en">English</option>
                                            <option value="hi">Hindi</option>
                                            <option value="mr">Marathi</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Message Content *</label>
                                    <textarea
                                        value={form.content}
                                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                                        required
                                        rows={6}
                                        placeholder="Hello {{name}}, your order {{order_id}} has been confirmed..."
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Use {{"{{"}}variable{{"}}"}} for dynamic content</p>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-300">
                                    <strong>Important:</strong> After creating the template here, you must submit it to Meta for approval
                                    through your WhatsApp Business Manager. Only approved templates can be used for broadcasts.
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                                >
                                    Create Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
