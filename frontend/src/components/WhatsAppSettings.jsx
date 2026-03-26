import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, MessageCircle, CheckCircle, XCircle, Loader2, Copy, Check, Zap, RefreshCw } from 'lucide-react';

export default function WhatsAppSettings() {
    const { user } = useAuth();
    const [form, setForm] = useState({ phoneNumberId: '', accessToken: '', businessAccountId: '' });
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

    // Webhook URL must point to the backend API, not the frontend
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const apiOrigin = apiBase.replace(/\/api\/?$/, '') || window.location.origin;
    const webhookUrl = `${apiOrigin}/api/whatsapp/webhook`;
    const verifyToken = 'magnet-crm';

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
                setConfigured(true);
            }
        } catch {
            // No config yet
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
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

    const handleTestConnection = async () => {
        if (!form.phoneNumberId || !form.accessToken) {
            toast.error('Save your configuration first');
            return;
        }
        setTesting(true);
        try {
            const res = await fetch(
                `https://graph.facebook.com/v21.0/${form.phoneNumberId}`,
                {
                    headers: { Authorization: `Bearer ${form.accessToken}` },
                }
            );
            const data = await res.json();
            if (res.ok && data.id) {
                toast.success(`Connected! Phone: ${data.display_phone_number || data.id}`);
            } else {
                toast.error(data.error?.message || 'Connection failed. Check your credentials.');
            }
        } catch {
            toast.error('Connection failed. Check your credentials.');
        } finally {
            setTesting(false);
        }
    };

    const fetchTemplates = async () => {
        if (!form.businessAccountId) {
            toast.error('Business Account ID is required to fetch templates');
            return;
        }
        setLoadingTemplates(true);
        try {
            const res = await api.get('/whatsapp/templates');
            setTemplates(res.data || []);
            if (res.data?.length === 0) {
                toast('No approved templates found', { icon: '📋' });
            } else {
                toast.success(`Found ${res.data.length} approved templates`);
            }
            // If auto-reply already has a template set, find it
            if (autoReply.autoReplyTemplateName) {
                const found = (res.data || []).find(
                    t => t.name === autoReply.autoReplyTemplateName && t.language === autoReply.autoReplyTemplateLanguage
                );
                if (found) setSelectedTemplate(found);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch templates');
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

    // Get template body text for preview
    const getTemplateBody = (template) => {
        if (!template?.components) return '';
        const body = template.components.find(c => c.type === 'BODY');
        return body?.text || '';
    };

    // Count variables in template body ({{1}}, {{2}}, etc.)
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
        return <div className="text-gray-500 dark:text-slate-400 text-sm p-8 text-center">Loading WhatsApp settings...</div>;
    }

    return (
        <div className="max-w-2xl space-y-6">
            {/* WhatsApp Business API Config */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">WhatsApp Business API</h3>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Connect your WhatsApp Business account to chat with leads directly from the CRM</p>
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
                        <li>Optionally add your <span className="text-gray-900 dark:text-white font-medium">Business Account ID</span></li>
                        <li>In Meta &gt; WhatsApp &gt; Configuration, set the <span className="text-gray-900 dark:text-white font-medium">Callback URL</span> and <span className="text-gray-900 dark:text-white font-medium">Verify Token</span> shown below</li>
                        <li>Subscribe to the <span className="text-gray-900 dark:text-white font-medium">messages</span> webhook field</li>
                    </ol>

                    {/* Webhook URL */}
                    <div className="mt-3 space-y-2">
                        <div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Callback / Webhook URL</span>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 px-3 py-2 rounded-lg text-green-400 text-xs break-all">{webhookUrl}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                                    className="p-2 bg-gray-200 dark:bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-white transition-colors cursor-pointer flex-shrink-0"
                                    title="Copy webhook URL"
                                >
                                    {copiedField === 'webhook' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Verify Token */}
                        <div>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Verify Token</span>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 px-3 py-2 rounded-lg text-amber-400 text-xs">{verifyToken}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(verifyToken, 'verify')}
                                    className="p-2 bg-gray-200 dark:bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-white transition-colors cursor-pointer flex-shrink-0"
                                    title="Copy verify token"
                                >
                                    {copiedField === 'verify' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Phone Number ID <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={form.phoneNumberId}
                            onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g. 1234567890123456"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Access Token <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={form.accessToken}
                                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                                placeholder="EAAxxxxxxx..."
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white cursor-pointer"
                            >
                                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Business Account ID <span className="text-amber-400 text-xs">(Required for Auto-Reply)</span></label>
                        <input
                            type="text"
                            value={form.businessAccountId}
                            onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g. 9876543210123456"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full sm:flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-green-600/25 cursor-pointer justify-center flex items-center"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing || !form.phoneNumberId || !form.accessToken}
                            className="w-full sm:w-auto px-6 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-white border border-gray-300 dark:border-slate-700 rounded-xl font-medium transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {testing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Test
                        </button>
                    </div>
                </form>
            </div>

            {/* Auto-Reply Settings */}
            {configured && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Auto-Reply to New Leads</h3>
                            <p className="text-xs text-gray-400 dark:text-slate-500">Automatically send a WhatsApp template message when a new lead is created</p>
                        </div>
                        {/* Toggle */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={autoReply.autoReplyEnabled}
                            onClick={() => {
                                const newVal = !autoReply.autoReplyEnabled;
                                setAutoReply(prev => ({ ...prev, autoReplyEnabled: newVal }));
                            }}
                            className={`ml-auto relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${autoReply.autoReplyEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${autoReply.autoReplyEnabled ? 'translate-x-7' : 'translate-x-0.5'}`}
                            />
                        </button>
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchTemplates}
                                disabled={loadingTemplates || !form.businessAccountId}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl font-medium transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                            >
                                {loadingTemplates ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                {templates.length > 0 ? 'Refresh Templates' : 'Fetch My Templates'}
                            </button>
                            {!form.businessAccountId && (
                                <span className="text-xs text-amber-400">Add Business Account ID above first</span>
                            )}
                        </div>

                        {/* Templates List */}
                        {templates.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300">Select Template</label>
                                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                    {templates.map((t, i) => {
                                        const isSelected = autoReply.autoReplyTemplateName === t.name && autoReply.autoReplyTemplateLanguage === t.language;
                                        const body = getTemplateBody(t);
                                        return (
                                            <button
                                                key={`${t.name}-${t.language}-${i}`}
                                                onClick={() => handleSelectTemplate(t)}
                                                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-green-500/10 border-green-500/40 ring-1 ring-green-500/20'
                                                        : 'bg-gray-100 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700/50 hover:border-gray-400 dark:border-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                        isSelected ? 'border-green-400 bg-green-400' : 'border-gray-400 dark:border-slate-600'
                                                    }`}>
                                                        {isSelected && <Check size={10} className="text-slate-900" />}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded">{t.language}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded ml-auto">{t.category}</span>
                                                </div>
                                                {body && (
                                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5 ml-6 line-clamp-2">{body}</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Selected Template Preview & Variable Mapping */}
                        {selectedTemplate && (
                            <div className="bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 rounded-xl p-4 space-y-3">
                                <h4 className="text-sm font-medium text-gray-600 dark:text-slate-300">Template Preview</h4>
                                <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg p-3">
                                    <p className="text-sm text-green-300 whitespace-pre-wrap">{getTemplateBody(selectedTemplate)}</p>
                                </div>

                                {/* Variable Mapping */}
                                {getTemplateVariables(selectedTemplate).length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Map Template Variables</h5>
                                        {getTemplateVariables(selectedTemplate).map(varNum => (
                                            <div key={varNum} className="flex items-center gap-3">
                                                <span className="text-xs text-amber-400 font-mono w-12 flex-shrink-0">{`{{${varNum}}}`}</span>
                                                <select
                                                    value={autoReply.autoReplyVariableMapping?.[varNum] || ''}
                                                    onChange={(e) => {
                                                        setAutoReply(prev => ({
                                                            ...prev,
                                                            autoReplyVariableMapping: {
                                                                ...prev.autoReplyVariableMapping,
                                                                [varNum]: e.target.value,
                                                            },
                                                        }));
                                                    }}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                                                >
                                                    <option value="">-- Select field --</option>
                                                    {VARIABLE_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                    <option value="_custom">Custom Text</option>
                                                </select>
                                                {autoReply.autoReplyVariableMapping?.[varNum] === '_custom' && (
                                                    <input
                                                        type="text"
                                                        placeholder="Enter text..."
                                                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        onChange={(e) => {
                                                            setAutoReply(prev => ({
                                                                ...prev,
                                                                autoReplyVariableMapping: {
                                                                    ...prev.autoReplyVariableMapping,
                                                                    [varNum]: e.target.value || '_custom',
                                                                },
                                                            }));
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Delay */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Send Delay</label>
                            <select
                                value={autoReply.autoReplyDelaySec}
                                onChange={(e) => setAutoReply(prev => ({ ...prev, autoReplyDelaySec: Number(e.target.value) }))}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                            >
                                <option value={0}>Instantly</option>
                                <option value={10}>After 10 seconds</option>
                                <option value={30}>After 30 seconds</option>
                                <option value={60}>After 1 minute</option>
                                <option value={120}>After 2 minutes</option>
                                <option value={300}>After 5 minutes</option>
                            </select>
                        </div>

                        {/* Save Auto-Reply */}
                        <button
                            onClick={handleSaveAutoReply}
                            disabled={savingAutoReply}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-gray-900 dark:text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-amber-600/25 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {savingAutoReply ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                            {savingAutoReply ? 'Saving...' : 'Save Auto-Reply Settings'}
                        </button>

                        {/* Status indicator */}
                        {autoReply.autoReplyEnabled && autoReply.autoReplyTemplateName && (
                            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                                <p className="text-xs text-green-300">
                                    Auto-reply is <span className="font-semibold">active</span>. Template "<span className="font-medium">{autoReply.autoReplyTemplateName}</span>" will be sent to every new lead with a phone number{autoReply.autoReplyDelaySec > 0 ? ` after ${autoReply.autoReplyDelaySec >= 60 ? `${autoReply.autoReplyDelaySec / 60} minute(s)` : `${autoReply.autoReplyDelaySec} seconds`}` : ' instantly'}.
                                </p>
                            </div>
                        )}

                        {autoReply.autoReplyEnabled && !autoReply.autoReplyTemplateName && (
                            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                <XCircle size={14} className="text-amber-400 flex-shrink-0" />
                                <p className="text-xs text-amber-300">Auto-reply is enabled but no template is selected. Fetch your templates and select one above.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
