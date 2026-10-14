import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
    Eye, EyeOff, MessageCircle, CheckCircle, XCircle, Loader2, 
    Copy, Check, Zap, RefreshCw, ExternalLink, ShieldCheck, 
    Smartphone, Settings2, Info, ChevronDown, ChevronUp, 
    AlertCircle, Sparkles, Building, Play, Phone, X, ListFilter, Send,
    Plus, Trash2, Clock, FileText
} from 'lucide-react';

export default function WhatsAppSettings() {
    const { user } = useAuth();
    const { config } = useConfig() || {};
    // Manual form state
    const [form, setForm] = useState({ 
        phoneNumberId: '', 
        accessToken: '', 
        businessAccountId: '' 
    });

    // Template creation modal & management state
    const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        category: 'MARKETING',
        language: 'en_US',
        headerText: '',
        bodyText: '',
        footerText: '',
    });
    const [submittingTemplate, setSubmittingTemplate] = useState(false);
    const [deletingTemplate, setDeletingTemplate] = useState(null);

    // Available phone numbers from Meta
    const [availableNumbers, setAvailableNumbers] = useState([]);
    const [loadingNumbers, setLoadingNumbers] = useState(false);
    const [showPhoneSelector, setShowPhoneSelector] = useState(false);
    const [manualTokenInput, setManualTokenInput] = useState('');

    // Test message modal state
    const [showTestModal, setShowTestModal] = useState(false);
    const [testRecipient, setTestRecipient] = useState('');
    const [testMessage, setTestMessage] = useState('Hello from Wcrm! WhatsApp Business API is live and working 🎉');
    const [sendingTest, setSendingTest] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [configured, setConfigured] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    // Auto-reply state
    const [autoReply, setAutoReply] = useState({
        autoReplyEnabled: false,
        autoReplyTemplateName: '',
        autoReplyTemplateLanguage: '',
        autoReplyVariableMapping: {},
        autoReplyDelaySec: 0,
    });
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [savingAutoReply, setSavingAutoReply] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // Webhook URL
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const apiOrigin = apiBase.replace(/\/api\/?$/, '') || window.location.origin;
    const webhookUrl = `${apiOrigin}/api/whatsapp/webhook`;
    const verifyToken = 'wcrm';

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedField(null), 2000);
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get(`/whatsapp/config?companyId=${user.companyId}`);
            if (res.data) {
                setForm({
                    phoneNumberId: res.data.phoneNumberId || '',
                    accessToken: res.data.accessToken || '',
                    businessAccountId: res.data.businessAccountId || '',
                });
                setAutoReply({
                    autoReplyEnabled: res.data.autoReplyEnabled || false,
                    autoReplyTemplateName: res.data.autoReplyTemplateName || '',
                    autoReplyTemplateLanguage: res.data.autoReplyTemplateLanguage || '',
                    autoReplyVariableMapping: res.data.autoReplyVariableMapping || {},
                    autoReplyDelaySec: res.data.autoReplyDelaySec || 0,
                });
                if (res.data.phoneNumberId && res.data.accessToken) {
                    setConfigured(true);
                }
            }
        } catch {
            // No config yet
        } finally {
            setLoading(false);
        }
    };

    // Save manual form
    const handleSaveManual = async (e) => {
        e.preventDefault();
        if (!form.phoneNumberId || !form.accessToken) {
            toast.error('Phone Number ID and Access Token are required');
            return;
        }
        setSaving(true);
        try {
            await api.post('/whatsapp/config', {
                companyId: user.companyId,
                ...form,
            });
            toast.success('WhatsApp configuration saved');
            setConfigured(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    // Test connection for either mode
    const handleTestConnection = async () => {
        const phoneId = form.phoneNumberId;
        const token = form.accessToken;

        if (!phoneId || !token) {
            toast.error('No WhatsApp credentials configured yet');
            return;
        }
        setTesting(true);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v21.0/${phoneId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await res.json();
            if (res.ok && data.id) {
                toast.success(`Connected! Phone: ${data.display_phone_number || data.id}`);
            } else {
                toast.error(data.error?.message || 'Connection test failed. Check your token permissions.');
            }
        } catch {
            toast.error('Connection test failed. Check your network or credentials.');
        } finally {
            setTesting(false);
        }
    };

    // Send a live test WhatsApp message
    const handleSendTestMessage = async (e) => {
        e.preventDefault();
        if (!testRecipient) {
            toast.error('Please enter a recipient mobile number with country code');
            return;
        }
        setSendingTest(true);
        try {
            const cleanPhone = testRecipient.replace(/[^0-9]/g, '');
            const res = await api.post('/whatsapp/send', {
                to: cleanPhone,
                message: testMessage,
                type: 'text'
            });
            if (res.data?.status === 'failed') {
                const err = res.data?.errorDetail || 'Failed to deliver message';
                if (err.includes('recipient phone number is not in allowed list') || err.includes('131030')) {
                    toast.error('Recipient not in allowed list! For test numbers, add your personal phone in Meta API Setup > "To: Manage list".', { duration: 6000 });
                } else {
                    toast.error(`Meta API: ${err}`, { duration: 5000 });
                }
            } else {
                toast.success('Test WhatsApp message sent successfully!');
                setShowTestModal(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send test message');
        } finally {
            setSendingTest(false);
        }
    };

    // Disconnect WhatsApp
    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect this WhatsApp number? Inbound & outbound messages will stop until reconnected.')) return;
        try {
            await api.post('/whatsapp/disconnect');
            setForm({ phoneNumberId: '', accessToken: '', businessAccountId: '' });
            setConfigured(false);
            toast.success('WhatsApp disconnected successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to disconnect');
        }
    };

    // Submit template directly to Meta for review
    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        const cleanName = templateForm.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!cleanName) {
            toast.error('Template name is required (lowercase letters, numbers, and underscores only)');
            return;
        }
        if (!templateForm.bodyText.trim()) {
            toast.error('Template message body is required');
            return;
        }

        setSubmittingTemplate(true);
        try {
            const res = await api.post('/whatsapp/templates/create', {
                ...templateForm,
                name: cleanName,
            });
            toast.success(res.data?.message || `Template "${cleanName}" submitted to Meta for approval!`, { duration: 5000 });
            setShowCreateTemplateModal(false);
            setTemplateForm({
                name: '',
                category: 'MARKETING',
                language: 'en_US',
                headerText: '',
                bodyText: '',
                footerText: '',
            });
            fetchTemplates();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit template to Meta');
        } finally {
            setSubmittingTemplate(false);
        }
    };

    // Delete template from Meta & DB
    const handleDeleteTemplate = async (templateName) => {
        if (!window.confirm(`Delete template "${templateName}" from Meta Business Account and Wcrm?`)) return;
        setDeletingTemplate(templateName);
        try {
            await api.delete(`/whatsapp/templates/${encodeURIComponent(templateName)}`);
            toast.success(`Template "${templateName}" deleted`);
            fetchTemplates();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete template');
        } finally {
            setDeletingTemplate(null);
        }
    };

    // Fetch available phone numbers from Meta
    const handleFetchPhoneNumbers = async (overrideToken) => {
        const tokenToUse = overrideToken || form.accessToken || '';
        if (!tokenToUse && !overrideToken) {
            setShowPhoneSelector(true);
            return;
        }
        setLoadingNumbers(true);
        try {
            const res = await api.get(`/whatsapp/available-numbers?token=${encodeURIComponent(tokenToUse)}`);
            if (res.data?.numbers && res.data.numbers.length > 0) {
                setAvailableNumbers(res.data.numbers);
                setShowPhoneSelector(true);
                toast.success(`Found ${res.data.numbers.length} registered WhatsApp phone number(s)!`);
            } else {
                setAvailableNumbers([]);
                setShowPhoneSelector(true);
                toast('No registered phone numbers found for this token', { icon: 'ℹ️' });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch phone numbers from Meta');
        } finally {
            setLoadingNumbers(false);
        }
    };

    // Connect selected phone number
    const handleSelectPhoneNumber = async (numberItem) => {
        try {
            toast.loading(`Connecting ${numberItem.displayPhoneNumber || numberItem.id}...`, { id: 'select-phone' });
            await api.post('/whatsapp/select-number', {
                phoneNumberId: numberItem.id,
                wabaId: numberItem.wabaId,
                accessToken: form.accessToken || manualTokenInput.trim() || undefined
            });
            toast.dismiss('select-phone');
            toast.success(`Connected phone number: ${numberItem.displayPhoneNumber || numberItem.id}!`);
            setShowPhoneSelector(false);
            fetchConfig();
        } catch (err) {
            toast.dismiss('select-phone');
            toast.error(err.response?.data?.message || 'Failed to connect selected phone number');
        }
    };

    // Fetch approved & pending templates from Meta
    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const res = await api.get('/whatsapp/templates');
            setTemplates(res.data || []);
            if (autoReply.autoReplyTemplateName) {
                const found = (res.data || []).find(
                    t => t.name === autoReply.autoReplyTemplateName && t.language === autoReply.autoReplyTemplateLanguage
                );
                if (found) setSelectedTemplate(found);
            }
        } catch (err) {
            // Silently handle if not connected yet
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        setAutoReply(prev => ({
            ...prev,
            autoReplyTemplateName: template.name,
            autoReplyTemplateLanguage: template.language,
            autoReplyVariableMapping: {},
        }));
    };

    const handleSaveAutoReply = async () => {
        if (autoReply.autoReplyEnabled && !autoReply.autoReplyTemplateName) {
            toast.error('Please select a template before enabling auto-reply');
            return;
        }
        setSavingAutoReply(true);
        try {
            await api.patch('/whatsapp/auto-reply', autoReply);
            toast.success('Auto-reply settings saved');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save auto-reply settings');
        } finally {
            setSavingAutoReply(false);
        }
    };

    const getTemplateBody = (template) => {
        if (!template?.components) return '';
        const body = template.components.find(c => c.type === 'BODY');
        return body?.text || '';
    };

    const getTemplateVariables = (template) => {
        const body = getTemplateBody(template);
        const matches = body.match(/\{\{(\d+)\}\}/g);
        return matches ? [...new Set(matches)].map(m => m.replace(/[{}]/g, '')) : [];
    };

    const VARIABLE_OPTIONS = [
        { value: 'lead_name', label: 'Lead Name' },
        { value: 'company_name', label: 'Company Name' },
    ];

    if (loading) {
        return <div className="text-gray-500 dark:text-slate-400 text-sm p-8 text-center">Loading WhatsApp integration settings...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Direct Meta Cloud API Notice */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-emerald-400 text-sm">Direct Meta Cloud API Connection</p>
                    <p className="text-slate-400">
                        In the Community Edition, your server communicates directly with Meta's Official WhatsApp Cloud API without any intermediary proxy. Configure your Phone Number ID and Permanent System User Access Token from your Meta Developer Console below.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manual WhatsApp Business API Credentials</h3>
                                <p className="text-xs text-gray-400 dark:text-slate-500">
                                    Directly specify your Phone Number ID and Permanent System User Access Token.
                                </p>
                            </div>
                            {configured && (
                                <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">
                                    <CheckCircle size={12} /> Connected
                                </span>
                            )}
                        </div>

                        {/* Setup Guide */}
                        <div className="bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-medium text-gray-600 dark:text-slate-300">Setup Guide</h4>
                            <ol className="text-xs text-gray-500 dark:text-slate-400 space-y-1.5 list-decimal list-inside">
                                <li>Go to <span className="text-indigo-400">Meta Business Suite</span> &gt; WhatsApp &gt; API Setup</li>
                                <li>Copy your <span className="text-gray-900 dark:text-white font-medium">Phone Number ID</span> and <span className="text-gray-900 dark:text-white font-medium">Permanent Access Token</span></li>
                                <li>Paste them below and click <span className="text-indigo-400">Save Configuration</span></li>
                                <li>In Meta, set the Webhook URL and Verify Token from the section below</li>
                            </ol>
                        </div>

                        {/* Config Form */}
                        <form onSubmit={handleSaveManual} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                                    Phone Number ID <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.phoneNumberId}
                                    onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value.trim() })}
                                    placeholder="e.g., 1049283719283"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Found in Meta App Dashboard &gt; WhatsApp &gt; API Setup</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                                    Permanent Access Token <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showToken ? 'text' : 'password'}
                                        value={form.accessToken}
                                        onChange={(e) => setForm({ ...form, accessToken: e.target.value.trim() })}
                                        placeholder="EAAB..."
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white"
                                    >
                                        {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Generate a permanent token from Meta Business Settings &gt; System Users</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                                    WhatsApp Business Account ID (WABA ID)
                                </label>
                                <input
                                    type="text"
                                    value={form.businessAccountId}
                                    onChange={(e) => setForm({ ...form, businessAccountId: e.target.value.trim() })}
                                    placeholder="e.g., 382910482910"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Required for template synchronization and analytics</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                                    {saving ? 'Saving...' : 'Save Configuration'}
                                </button>
                                {configured && (
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing}
                                        className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700 rounded-xl font-medium text-sm transition-all flex items-center gap-2"
                                    >
                                        {testing ? <Loader2 size={16} className="animate-spin" /> : null}
                                        Test Connection
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Webhook Settings Box */}
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Webhook Configuration</h4>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Configure these values in Meta App Dashboard &gt; WhatsApp &gt; Configuration</p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Callback URL</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={webhookUrl}
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-mono text-xs"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(webhookUrl, 'url')}
                                        className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-slate-400 transition-colors"
                                    >
                                        {copiedField === 'url' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Verify Token</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={verifyToken}
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-mono text-xs"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(verifyToken, 'token')}
                                        className="p-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-600 dark:text-slate-400 transition-colors"
                                    >
                                        {copiedField === 'token' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

            {/* SECTION 1: WHATSAPP MESSAGE TEMPLATES & META APPROVALS */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center text-emerald-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp Message Templates & Meta Approvals</h3>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                    Meta Cloud API
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Create, submit, and track pre-approved templates directly with Meta without leaving Wcrm.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchTemplates}
                            disabled={loadingTemplates}
                            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700 rounded-xl font-medium text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw size={14} className={loadingTemplates ? "animate-spin" : ""} />
                            Sync Meta Status
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateTemplateModal(true)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer"
                        >
                            <Plus size={14} />
                            Create & Submit Template
                        </button>
                    </div>
                </div>

                {/* Status Counter Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">Total Templates</span>
                        <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{templates.length}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">Approved by Meta</span>
                        <div className="text-lg font-bold text-emerald-400 mt-0.5">
                            {templates.filter(t => (t.status || '').toLowerCase() === 'approved').length}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <span className="text-[10px] uppercase font-bold text-amber-400">Pending Review</span>
                        <div className="text-lg font-bold text-amber-400 mt-0.5">
                            {templates.filter(t => (t.status || '').toLowerCase() === 'pending').length}
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                        <span className="text-[10px] uppercase font-bold text-rose-400">Rejected</span>
                        <div className="text-lg font-bold text-rose-400 mt-0.5">
                            {templates.filter(t => (t.status || '').toLowerCase() === 'rejected').length}
                        </div>
                    </div>
                </div>

                {/* Templates List */}
                {templates.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-gray-50 dark:bg-slate-800/30 border border-dashed border-gray-300 dark:border-slate-700/60 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">No Message Templates Found</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                                Click "Create & Submit Template" above to draft your first WhatsApp message template and submit it directly to Meta for approval.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCreateTemplateModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
                        >
                            <Plus size={14} /> Create First Template
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                        {templates.map((tpl) => {
                            const status = (tpl.status || 'approved').toLowerCase();
                            const isApproved = status === 'approved';
                            const isPending = status === 'pending';
                            const isRejected = status === 'rejected';

                            return (
                                <div
                                    key={`${tpl.name}-${tpl.language}`}
                                    className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 flex flex-col justify-between gap-3 hover:border-gray-300 dark:hover:border-slate-600 transition-all"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                                                    {tpl.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                                                        {tpl.category || 'marketing'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                                                        {tpl.language || 'en_US'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {isApproved && (
                                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                                                    <CheckCircle size={11} /> Approved
                                                </span>
                                            )}
                                            {isPending && (
                                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                                                    <Clock size={11} /> Pending Review
                                                </span>
                                            )}
                                            {isRejected && (
                                                <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold flex items-center gap-1 shrink-0">
                                                    <AlertCircle size={11} /> Rejected
                                                </span>
                                            )}
                                        </div>

                                        {/* Body Preview */}
                                        <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-3 font-mono bg-white dark:bg-black/20 p-2.5 rounded-lg border border-gray-200 dark:border-white/5">
                                            {tpl.bodyText || getTemplateBody(tpl)}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/5">
                                        <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                            {isApproved ? 'Ready for cold outbound & broadcasts' : 'Waiting for Meta review (usually ~15 mins)'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTemplate(tpl.name)}
                                            disabled={deletingTemplate === tpl.name}
                                            className="text-gray-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                            title="Delete Template from Meta"
                                        >
                                            {deletingTemplate === tpl.name ? (
                                                <Loader2 size={13} className="animate-spin text-rose-400" />
                                            ) : (
                                                <Trash2 size={13} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2: INSTANT FIRST-MESSAGE AUTO-REPLY */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Instant First-Message Auto-Reply</h3>
                            <p className="text-xs text-gray-400 dark:text-slate-500">Automatically reply with an approved Meta template on new inbound customer messages</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoReply.autoReplyEnabled}
                            onChange={(e) => setAutoReply({ ...autoReply, autoReplyEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>

                {/* Template picker for auto-reply */}
                <div className="space-y-3 pt-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400">
                        Select Auto-Reply Template (Approved Templates Only)
                    </label>
                    {templates.filter(t => (t.status || '').toLowerCase() === 'approved').length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-slate-500 italic p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700">
                            No approved templates found. Create a template above and submit it to Meta for approval first.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {templates.filter(t => (t.status || '').toLowerCase() === 'approved').map(tpl => (
                                <button
                                    key={`autoreply-${tpl.name}-${tpl.language}`}
                                    type="button"
                                    onClick={() => handleSelectTemplate(tpl)}
                                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                                        selectedTemplate?.name === tpl.name && selectedTemplate?.language === tpl.language
                                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                                            : 'bg-gray-50 dark:bg-slate-800/60 border-gray-200 dark:border-slate-700/60 text-gray-700 dark:text-slate-300 hover:border-gray-400'
                                    }`}
                                >
                                    <div className="font-semibold truncate">{tpl.name}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">{tpl.category} • {tpl.language}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview & Save */}
                {selectedTemplate && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 space-y-2">
                        <span className="text-[11px] uppercase font-bold text-gray-400 dark:text-slate-400">Template Preview</span>
                        <p className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-line font-mono bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-800">
                            {selectedTemplate.bodyText || getTemplateBody(selectedTemplate)}
                        </p>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSaveAutoReply}
                        disabled={savingAutoReply}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        {savingAutoReply ? <Loader2 size={14} className="animate-spin" /> : null}
                        {savingAutoReply ? 'Saving...' : 'Save Auto-Reply Settings'}
                    </button>
                </div>
            </div>

            {/* CREATE & SUBMIT TEMPLATE TO META MODAL */}
            {showCreateTemplateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Create & Submit WhatsApp Template to Meta</h3>
                                    <p className="text-xs text-slate-400">Submitted directly to Meta Graph API for automated review</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateTemplateModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTemplate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Form Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Template Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. welcome_offer_v1"
                                        value={templateForm.name}
                                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-800 border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Lowercase letters, numbers, and underscores only.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                            Category *
                                        </label>
                                        <select
                                            value={templateForm.category}
                                            onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                                            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="MARKETING">Marketing</option>
                                            <option value="UTILITY">Utility</option>
                                            <option value="AUTHENTICATION">Authentication</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                            Language *
                                        </label>
                                        <select
                                            value={templateForm.language}
                                            onChange={(e) => setTemplateForm({ ...templateForm, language: e.target.value })}
                                            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                                        >
                                            <option value="en_US">English (US)</option>
                                            <option value="en_GB">English (UK)</option>
                                            <option value="hi">Hindi (hi)</option>
                                            <option value="es">Spanish (es)</option>
                                            <option value="fr">French (fr)</option>
                                            <option value="ar">Arabic (ar)</option>
                                            <option value="pt_BR">Portuguese (pt_BR)</option>
                                            <option value="de">German (de)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Header Text (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Exclusive Offer Inside 🎉"
                                        value={templateForm.headerText}
                                        onChange={(e) => setTemplateForm({ ...templateForm, headerText: e.target.value })}
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                            Message Body *
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const count = (templateForm.bodyText.match(/\{\{\d+\}\}/g) || []).length + 1;
                                                setTemplateForm({ ...templateForm, bodyText: `${templateForm.bodyText} {{${count}}}` });
                                            }}
                                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
                                        >
                                            + Add Variable {"{{n}}"}
                                        </button>
                                    </div>
                                    <textarea
                                        rows={4}
                                        required
                                        placeholder="Hi {{1}}, welcome to our service! We are delighted to have you on board."
                                        value={templateForm.bodyText}
                                        onChange={(e) => setTemplateForm({ ...templateForm, bodyText: e.target.value })}
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Use {"{{1}}"}, {"{{2}}"} for placeholders (e.g. customer name, order number).
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Footer Text (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Reply STOP to unsubscribe"
                                        value={templateForm.footerText}
                                        onChange={(e) => setTemplateForm({ ...templateForm, footerText: e.target.value })}
                                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Right Column: WhatsApp Live Preview */}
                            <div className="flex flex-col justify-between space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                                        Live WhatsApp Preview
                                    </label>

                                    {/* Phone Screen Mock */}
                                    <div className="rounded-2xl bg-slate-950 border border-white/15 p-4 shadow-inner space-y-3">
                                        {/* Mock WhatsApp header */}
                                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                                            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                                                W
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white leading-tight">
                                                    {form.phoneNumberId ? `+${form.phoneNumberId}` : 'Your Business'}
                                                </div>
                                                <div className="text-[10px] text-emerald-400">WhatsApp Official Business</div>
                                            </div>
                                        </div>

                                        {/* Message Bubble */}
                                        <div className="bg-[#0b3b2c] border border-emerald-500/20 rounded-2xl rounded-tl-sm p-3.5 space-y-2 max-w-[90%] shadow-lg">
                                            {templateForm.headerText && (
                                                <div className="font-bold text-xs text-emerald-100 border-b border-emerald-400/20 pb-1">
                                                    {templateForm.headerText}
                                                </div>
                                            )}
                                            <p className="text-xs text-white whitespace-pre-line leading-relaxed">
                                                {templateForm.bodyText || 'Your template message body will preview here...'}
                                            </p>
                                            {templateForm.footerText && (
                                                <p className="text-[10px] text-emerald-300/70 border-t border-emerald-400/10 pt-1">
                                                    {templateForm.footerText}
                                                </p>
                                            )}
                                            <div className="flex justify-end items-center gap-1 text-[9px] text-emerald-300/60">
                                                <span>12:00 PM</span>
                                                <span>✓✓</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300 space-y-1">
                                    <div className="font-semibold flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Meta Approval Information:
                                    </div>
                                    <p className="text-slate-400 leading-relaxed">
                                        Once submitted, Meta's automated AI review system evaluates the template against WhatsApp messaging policies. Most standard templates are approved within minutes!
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateTemplateModal(false)}
                                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingTemplate || !templateForm.name.trim() || !templateForm.bodyText.trim()}
                                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                                    >
                                        {submittingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        {submittingTemplate ? 'Submitting to Meta...' : 'Submit to Meta for Review'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Phone Number Selector Modal */}
            {showPhoneSelector && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Select WhatsApp Phone Number</h3>
                                    <p className="text-xs text-slate-400">Choose which phone number to link to Wcrm</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPhoneSelector(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* If no numbers discovered yet or want to fetch directly with token */}
                        {availableNumbers.length === 0 ? (
                            <div className="space-y-4">
                                <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                                    <div className="font-semibold flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5" /> Fetch numbers from Meta:
                                    </div>
                                    <p className="text-slate-400 text-[11px]">
                                        Enter your Meta Access Token (System User Token or Temporary Token from Meta App Dashboard &gt; WhatsApp &gt; API Setup) to automatically discover your registered phone numbers:
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                        Meta Access Token
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="EAAB... (Paste token here)"
                                        value={manualTokenInput}
                                        onChange={(e) => setManualTokenInput(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-800 border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500"
                                    />
                                    <button
                                        type="button"
                                        disabled={loadingNumbers || !manualTokenInput.trim()}
                                        onClick={() => handleFetchPhoneNumbers(manualTokenInput.trim())}
                                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                                    >
                                        {loadingNumbers ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Fetch Phone Numbers from Meta
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                <p className="text-xs text-slate-400">
                                    Found <strong className="text-emerald-400 font-bold">{availableNumbers.length}</strong> registered number(s). Click "Connect" to activate:
                                </p>
                                {availableNumbers.map((num) => (
                                    <div
                                        key={num.id}
                                        className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                            form.phoneNumberId === num.id
                                                ? 'bg-emerald-950/30 border-emerald-500/50'
                                                : 'bg-black/40 border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <strong className="text-white text-sm font-mono">{num.displayPhoneNumber}</strong>
                                                {form.phoneNumberId === num.id && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                                        Currently Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                                <span>{num.verifiedName || 'Business Profile'}</span>
                                                <span>•</span>
                                                <span className="font-mono text-slate-500">ID: {num.id}</span>
                                            </div>
                                            <div className="flex items-center gap-2 pt-1 text-[10px]">
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                                                    Rating: {num.qualityRating || 'GREEN'}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                                    {num.status || 'VERIFIED'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectPhoneNumber(num)}
                                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shrink-0 transition-all shadow-md cursor-pointer"
                                        >
                                            {form.phoneNumberId === num.id ? 'Re-Connect' : 'Connect'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setAvailableNumbers([]);
                                    setManualTokenInput('');
                                }}
                                className="text-xs text-slate-400 hover:text-white transition-colors"
                            >
                                {availableNumbers.length > 0 ? 'Fetch with another token →' : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPhoneSelector(false)}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Test WhatsApp Message Modal */}
            {showTestModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <Send className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Send Test WhatsApp</h3>
                                    <p className="text-xs text-slate-400">Dispatch a live test message from {form.phoneNumberId || 'your connected number'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowTestModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSendTestMessage} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Recipient Phone Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., +919876543210 (with country code)"
                                    value={testRecipient}
                                    onChange={(e) => setTestRecipient(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-800 border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Include full country code without spaces (e.g. 919876543210 for India).
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                    Message Body
                                </label>
                                <textarea
                                    rows={3}
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-[11px] text-blue-300 space-y-1">
                                <div className="font-semibold flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" /> Note for Meta Test Numbers:
                                </div>
                                <p className="text-slate-400">
                                    If your connected number is a Meta test sandbox number (+1 555...), your recipient number must first be added to the allowed test list in Meta Developer Portal &gt; WhatsApp &gt; API Setup &gt; "To: Manage phone numbers list". Real registered business numbers can message any phone.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTestModal(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingTest || !testRecipient}
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                                >
                                    {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    {sendingTest ? 'Sending...' : 'Send WhatsApp Message'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
