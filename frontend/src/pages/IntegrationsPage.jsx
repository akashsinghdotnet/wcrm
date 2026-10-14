import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Plug, Copy, Check, Globe, MessageSquare, Settings,
    BarChart3, RefreshCcw, Shuffle, UserCheck, ExternalLink, Shield,
    ChevronDown, ChevronUp, Code, BookOpen, Info, X, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLATFORM_CREDENTIALS = {
    meta: [],
    website: [],
};

const INTEGRATIONS = [
    {
        id: 'meta',
        name: 'Meta / Facebook Ads',
        description: 'Capture leads from Facebook & Instagram ad forms automatically via direct webhook or middleware.',
        color: 'from-blue-600 to-indigo-600',
        iconBg: 'bg-blue-500/10 border-blue-500/20',
        iconColor: 'text-blue-400',
        webhookPath: '/api/webhooks/meta',
        fields: [
            { name: 'companyId', required: true, description: 'Your Company ID (must be included)' },
            { name: 'name', required: true, description: 'Lead Full Name' },
            { name: 'phone', required: false, description: 'Lead Phone Number' },
            { name: 'email', required: false, description: 'Lead Email Address' },
        ],
        setupSteps: [
            '1. Click the "Configure" button on the Meta / Facebook Ads integration card.',
            '2. Click the "Connect to Facebook" button in the configuration modal.',
            '3. A popup will open requesting authorization. Log in and select the Facebook Pages you want to connect.',
            '4. Select your preferred Facebook Page from the dropdown list and click "Save".',
            '5. That\'s it! The CRM will automatically register the page webhooks and start importing new leads instantly in real time.'
        ],
    },
    {
        id: 'website',
        name: 'Website Form (WordPress / Webhook)',
        description: 'Connect your website contact form or WordPress plugin to auto-create leads and trigger instant WhatsApp automations.',
        color: 'from-violet-500 to-purple-500',
        iconBg: 'bg-violet-500/10 border-violet-500/20',
        iconColor: 'text-violet-400',
        webhookPath: '/api/webhooks/website',
        fields: [
            { name: 'companyId', required: true, description: 'Your Company ID (must be included)' },
            { name: 'name', required: true, description: 'Contact name' },
            { name: 'phone', required: false, description: 'Phone number' },
            { name: 'email', required: false, description: 'Email address' },
            { name: 'message', required: false, description: 'Message or enquiry text' },
        ],
        setupSteps: [
            'Enable this integration by toggling the switch on',
            'Click "Guide" to see the embeddable form code and live preview',
            'Click "Copy Form Code" to copy the ready-to-use HTML snippet',
            'Paste the code into your website (works with WordPress, Shopify, Wix, React, plain HTML, or any CMS)',
            'Customize the form styles (colors, fonts) to match your website design',
            'Form submissions will automatically create leads in your CRM and assign them via round-robin',
        ],
    },
];

export default function IntegrationsPage({ embedded = false }) {
    const { user } = useAuth();
    const [copiedId, setCopiedId] = useState(null);
    const [copiedSample, setCopiedSample] = useState(null);
    const [assignmentMode, setAssignmentMode] = useState('round_robin');
    const [employees, setEmployees] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [integrationConfigs, setIntegrationConfigs] = useState({});
    const [configModalPlatform, setConfigModalPlatform] = useState(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});
    const [credentialForm, setCredentialForm] = useState({});
    const [allowedIntegrations, setAllowedIntegrations] = useState(null);

    // Centralized Meta OAuth states
    const [pagesList, setPagesList] = useState([]);
    const [selectedPageId, setSelectedPageId] = useState('');

    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin_admin';

    // Webhook URLs must point to the backend API, not the frontend
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    // Extract origin from full API URL (e.g. "https://api.wcrm.si/api" → "https://api.wcrm.si")
    const baseUrl = apiBase.replace(/\/api\/?$/, '') || window.location.origin;

    useEffect(() => {
        loadEmployees();
        loadIntegrationConfigs();
        loadCompanyPlan();
    }, []);

    const loadCompanyPlan = async () => {
        if (!user.companyId || isSuperAdmin) {
            setAllowedIntegrations(INTEGRATIONS.map(i => i.id));
            return;
        }
        try {
            const res = await api.get(`/companies/${user.companyId}`);
            if (res.data && res.data.plan) {
                setAllowedIntegrations(res.data.plan.integrations || []);
            } else {
                setAllowedIntegrations([]);
            }
        } catch {
            setAllowedIntegrations([]);
        }
    };

    const loadEmployees = async () => {
        try {
            const res = await api.get(`/users?companyId=${user.companyId}`);
            setEmployees(res.data.filter(u => u.isActive && u.role !== 'super_admin'));
        } catch { }
    };

    const loadIntegrationConfigs = async () => {
        try {
            const res = await api.get(`/integrations?companyId=${user.companyId}`);
            const configMap = {};
            res.data.forEach(c => { configMap[c.platform] = c; });
            setIntegrationConfigs(configMap);
        } catch { }
    };

    const toggleIntegration = async (id) => {
        const current = integrationConfigs[id];
        const newActive = !current?.isActive;
        try {
            await api.patch(`/integrations/${id}/toggle`, {
                companyId: user.companyId,
                isActive: newActive,
            });
            toast.success(newActive ? 'Integration enabled' : 'Integration disabled');
            loadIntegrationConfigs();
        } catch {
            toast.error('Failed to update integration');
        }
    };

    const openConfigModal = (platform) => {
        const existing = integrationConfigs[platform]?.credentials || {};
        setCredentialForm({ ...existing });
        setShowPasswords({});
        setConfigModalPlatform(platform);

        if (platform === 'meta') {
            setPagesList([]);
            setSelectedPageId(existing.pageId || '');
        }
    };

    const handleFacebookConnect = async () => {
        setTesting(true);
        const toastId = toast.loading('Opening Facebook login...');
        try {
            const res = await api.get('/integrations/meta/oauth-url');
            toast.dismiss(toastId);
            
            const width = 600, height = 650;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;
            
            const popup = window.open(
                res.data.url,
                'Facebook OAuth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            if (!popup) {
                toast.error('Popup blocked! Please allow popups for this site.');
                setTesting(false);
                return;
            }

            const handleMessage = (event) => {
                if (event.data && event.data.type === 'META_OAUTH_SUCCESS') {
                    window.removeEventListener('message', handleMessage);
                    setPagesList(event.data.pages || []);
                    toast.success('Retrieved Facebook pages successfully!');
                } else if (event.data && event.data.type === 'META_OAUTH_FAILED') {
                    window.removeEventListener('message', handleMessage);
                    toast.error(`Facebook login failed: ${event.data.error}`);
                }
            };

            window.addEventListener('message', handleMessage);
        } catch (err) {
            toast.error('Failed to get Facebook auth link', { id: toastId });
        } finally {
            setTesting(false);
        }
    };

    const saveCredentials = async () => {
        setSaving(true);
        try {
            if (configModalPlatform === 'meta') {
                if (!selectedPageId) {
                    toast.error('Please select a Facebook page first');
                    setSaving(false);
                    return;
                }
                
                let pageObj = pagesList.find(p => p.id === selectedPageId);
                
                if (!pageObj && credentialForm.pageId === selectedPageId) {
                    pageObj = {
                        id: credentialForm.pageId,
                        accessToken: credentialForm.accessToken,
                        name: credentialForm.pageName || credentialForm.pageId,
                        userAccessToken: credentialForm.userAccessToken || '',
                    };
                }

                if (!pageObj) {
                    toast.error('Please connect your Facebook account to retrieve page tokens.');
                    setSaving(false);
                    return;
                }

                await api.post('/integrations/meta/subscribe', {
                    companyId: user.companyId,
                    pageId: pageObj.id,
                    pageAccessToken: pageObj.accessToken,
                    pageName: pageObj.name,
                    userAccessToken: pageObj.userAccessToken,
                });
            } else {
                await api.post('/integrations', {
                    companyId: user.companyId,
                    platform: configModalPlatform,
                    credentials: credentialForm,
                    isActive: integrationConfigs[configModalPlatform]?.isActive ?? true,
                });
            }
            toast.success('Credentials saved');
            setConfigModalPlatform(null);
            loadIntegrationConfigs();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save credentials');
        } finally {
            setSaving(false);
        }
    };

    const testMetaConnection = async () => {
        setTesting(true);
        const toastId = toast.loading('Testing Meta connection...');
        try {
            const res = await api.post('/integrations/meta/test', credentialForm);
            if (res.data.success) {
                toast.success(res.data.message, { id: toastId });
            } else {
                toast.error(`Connection failed: ${res.data.message}`, { id: toastId });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to connect to Meta API', { id: toastId });
        } finally {
            setTesting(false);
        }
    };

    const isActive = (id) => integrationConfigs[id]?.isActive || false;
    const hasCredentials = (id) => {
        const creds = integrationConfigs[id]?.credentials;
        return creds && Object.values(creds).some(v => v);
    };

    const getStatusInfo = (id) => {
        const active = isActive(id);
        const hasCreds = hasCredentials(id);
        const platformCreds = PLATFORM_CREDENTIALS[id] || [];
        if (!active) return { label: 'Inactive', color: 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400' };
        if (platformCreds.length === 0 || hasCreds) return { label: 'Connected', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
        return { label: 'Needs Setup', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' };
    };

    const needsCompanyIdInUrl = (id) => ['website'].includes(id);

    const getFullWebhookUrl = (integration) => {
        const base = `${baseUrl}${integration.webhookPath}`;
        if (needsCompanyIdInUrl(integration.id)) {
            return `${base}?companyId=${user.companyId}`;
        }
        return base;
    };

    const copyWebhook = (integration) => {
        const url = getFullWebhookUrl(integration);
        navigator.clipboard.writeText(url);
        setCopiedId(integration.id);
        toast.success('Webhook URL copied');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getSamplePayload = (integration) => {
        const sample = { companyId: user.companyId };
        integration.fields.forEach(f => {
            if (f.name === 'companyId') return;
            if (f.name === 'name') sample.name = 'John Doe';
            else if (f.name === 'email') sample.email = 'john@example.com';
            else if (f.name === 'phone') sample.phone = '+919876543210';
            else if (f.name === 'message') sample.message = 'I am interested in your services';
            else if (f.name === 'category') sample.category = 'Product Category';
            else if (f.name === 'city') sample.city = 'Mumbai';
            else sample[f.name] = '';
        });
        return JSON.stringify(sample, null, 2);
    };

    const copySamplePayload = (integration) => {
        navigator.clipboard.writeText(getSamplePayload(integration));
        setCopiedSample(integration.id);
        toast.success('Sample payload copied');
        setTimeout(() => setCopiedSample(null), 2000);
    };

    const getWebsiteCodeSample = () => {
        return `<!-- Wcrm Lead Capture Form — Paste this anywhere in your website -->
<div id="wcrm-form-wrapper">
  <form id="wcrm-lead-form" onsubmit="return submitWcrmForm(event)">
    <h3 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">Get in Touch</h3>
    <div style="margin-bottom:12px;">
      <input type="text" id="mcf-name" name="name" placeholder="Your Name *" required
        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:12px;">
      <input type="email" id="mcf-email" name="email" placeholder="Email Address"
        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:12px;">
      <input type="tel" id="mcf-phone" name="phone" placeholder="Phone Number"
        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;" />
    </div>
    <div style="margin-bottom:16px;">
      <textarea id="mcf-message" name="message" placeholder="Your Message" rows="3"
        style="width:100%;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
    </div>
    <!-- Honeypot spam protection (hidden from users) -->
    <input type="text" name="_honey" style="display:none !important;" tabindex="-1" autocomplete="off" />
    <button type="submit" id="mcf-submit-btn"
      style="width:100%;padding:12px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s;">
      Submit
    </button>
    <div id="mcf-status" style="margin-top:12px;text-align:center;font-size:13px;display:none;"></div>
  </form>
</div>
<script>
function submitWcrmForm(e) {
  e.preventDefault();
  var form = document.getElementById('wcrm-lead-form');
  var btn = document.getElementById('mcf-submit-btn');
  var status = document.getElementById('mcf-status');
  // Check honeypot
  if (form._honey && form._honey.value) return false;
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  btn.style.background = '#6366f1';
  status.style.display = 'none';
  fetch("${baseUrl}/api/webhooks/website", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId: "${user.companyId}",
      name: document.getElementById('mcf-name').value,
      email: document.getElementById('mcf-email').value || undefined,
      phone: document.getElementById('mcf-phone').value || undefined,
      message: document.getElementById('mcf-message').value || undefined
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      status.style.color = '#16a34a';
      status.textContent = 'Thank you! We will get back to you soon.';
      status.style.display = 'block';
      form.reset();
    } else {
      status.style.color = '#dc2626';
      status.textContent = 'Something went wrong. Please try again.';
      status.style.display = 'block';
    }
  })
  .catch(function() {
    status.style.color = '#dc2626';
    status.textContent = 'Network error. Please try again.';
    status.style.display = 'block';
  })
  .finally(function() {
    btn.disabled = false;
    btn.textContent = 'Submit';
    btn.style.background = '#4f46e5';
  });
  return false;
}
</script>`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            {!embedded && (
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Plug className="w-6 h-6 text-indigo-400" />
                        Integrations
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Connect external lead sources, configure credentials, and manage lead distribution</p>
                </div>
            )}

            {/* Integrations List */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-400" />
                    Lead Sources
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {INTEGRATIONS.map((integration) => {
                        const isAllowed = isSuperAdmin || (allowedIntegrations && allowedIntegrations.includes(integration.id));
                        
                        // If not allowed, we can either hide it or show it as locked. Let's hide it if not super admin to keep the UI clean
                        // If we want to upsell, we could show it grayed out. But hiding is simpler and matches the feature/module behavior.
                        if (!isAllowed) {
                            return null;
                        }

                        const active = isActive(integration.id);
                        const isExpanded = expandedId === integration.id;
                        const status = getStatusInfo(integration.id);
                        const platformCreds = PLATFORM_CREDENTIALS[integration.id] || [];
                        return (
                            <div
                                key={integration.id}
                                className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${active ? 'border-gray-300 dark:border-slate-700' : 'border-gray-200 dark:border-slate-800 opacity-70'}`}
                            >
                                {/* Color header bar */}
                                <div className={`h-1.5 bg-gradient-to-r ${integration.color}`} />

                                <div className="p-5">
                                    {/* Header Row */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${integration.iconBg}`}>
                                                <Plug className={`w-5 h-5 ${integration.iconColor}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">{integration.name}</h4>
                                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mt-0.5">{integration.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {active && (platformCreds.length > 0 || integration.id === 'meta') && (
                                                <button
                                                    onClick={() => openConfigModal(integration.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 rounded-lg transition-all border border-gray-300 dark:border-slate-700"
                                                >
                                                    <Settings className="w-3.5 h-3.5" />
                                                    Configure
                                                </button>
                                            )}
                                            {active && (
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    Guide
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleIntegration(integration.id)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${active ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Webhook URL & Company ID (shown when active) */}
                                    {active && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Combined Webhook URL (with companyId for platforms that need it) */}
                                            <div className={`bg-black/30 rounded-xl p-3 ${needsCompanyIdInUrl(integration.id) ? 'md:col-span-2' : ''}`}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">
                                                        {needsCompanyIdInUrl(integration.id) ? 'Ready-to-use Webhook URL (includes your Company ID)' : 'Webhook URL'}
                                                    </span>
                                                    <button
                                                        onClick={() => copyWebhook(integration)}
                                                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        title="Copy webhook URL"
                                                    >
                                                        {copiedId === integration.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-slate-300 font-mono break-all">
                                                    {getFullWebhookUrl(integration)}
                                                </p>
                                                {needsCompanyIdInUrl(integration.id) && (
                                                    <p className="text-[10px] text-emerald-400 mt-1.5">✓ Company ID is already included — just copy and paste this URL directly</p>
                                                )}
                                            </div>

                                            {/* Separate Company ID box only for platforms that don't embed it */}
                                            {!needsCompanyIdInUrl(integration.id) && (
                                                <div className="bg-black/30 rounded-xl p-3">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Company ID</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(user.companyId);
                                                                toast.success('Company ID copied');
                                                            }}
                                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                            title="Copy company ID"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-slate-300 font-mono break-all">
                                                        {user.companyId}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Show Verify Token for Meta integration */}
                                            {integration.id === 'meta' && (
                                                <div className="bg-black/30 rounded-xl p-3 md:col-span-2">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Verify Token (for Facebook Webhook setup)</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText('wcrm');
                                                                toast.success('Verify token copied');
                                                            }}
                                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                            title="Copy verify token"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-slate-300 font-mono">
                                                        wcrm
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Expanded Setup Guide */}
                                    {active && isExpanded && (
                                        <div className="mt-4 space-y-4 border-t border-gray-200 dark:border-slate-800 pt-4">
                                            {/* Setup Steps */}
                                            <div>
                                                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <Info className="w-4 h-4 text-indigo-400" />
                                                    Setup Instructions
                                                </h5>
                                                <ol className="space-y-2">
                                                    {integration.setupSteps.map((step, idx) => (
                                                        <li key={idx} className="flex gap-3 text-sm">
                                                            <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-gray-600 dark:text-slate-300">{step}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>

                                            {/* Accepted Fields */}
                                            <div>
                                                {integration.fields.length > 0 && (
                                                <>
                                                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-indigo-400" />
                                                    Accepted Fields
                                                </h5>
                                                <div className="bg-black/20 rounded-xl overflow-hidden">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-gray-200 dark:border-slate-800">
                                                                <th className="text-left px-3 py-2 text-gray-400 dark:text-slate-500 font-medium">Field</th>
                                                                <th className="text-left px-3 py-2 text-gray-400 dark:text-slate-500 font-medium">Required</th>
                                                                <th className="text-left px-3 py-2 text-gray-400 dark:text-slate-500 font-medium">Description</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800/50">
                                                            {integration.fields.map((field) => (
                                                                <tr key={field.name}>
                                                                    <td className="px-3 py-2 font-mono text-indigo-300">{field.name}</td>
                                                                    <td className="px-3 py-2">
                                                                        {field.required ? (
                                                                            <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-medium">Required</span>
                                                                        ) : (
                                                                            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded text-[10px] font-medium">Optional</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{field.description}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                </>
                                                )}
                                                {integration.id === 'meta' && (
                                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                                                        <h5 className="text-sm font-semibold text-blue-400 mb-2">How it works</h5>
                                                        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                                            Facebook sends lead events directly to your CRM webhook. When someone fills your Lead Ad form,
                                                            Facebook notifies your CRM with the lead ID. Your CRM then fetches the complete lead details
                                                            (name, phone, email) using the Facebook Graph API and your Page Access Token.
                                                            The lead is automatically created and assigned via round-robin. No middleware needed!
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sample Payload (hidden for Meta since it uses native webhook) */}
                                            {integration.fields.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <Code className="w-4 h-4 text-indigo-400" />
                                                        Sample JSON Payload
                                                    </h5>
                                                    <button
                                                        onClick={() => copySamplePayload(integration)}
                                                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                                    >
                                                        {copiedSample === integration.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        Copy
                                                    </button>
                                                </div>
                                                <pre className="bg-black/30 rounded-xl p-4 text-xs text-gray-600 dark:text-slate-300 font-mono overflow-x-auto whitespace-pre">
                                                    {getSamplePayload(integration)}
                                                </pre>
                                            </div>
                                            )}

                                            {/* Website-specific embeddable form */}
                                            {integration.id === 'website' && (
                                                <div className="space-y-4">
                                                    {/* Live Preview */}
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                            <Eye className="w-4 h-4 text-indigo-400" />
                                                            Form Preview
                                                        </h5>
                                                        <div className="bg-white rounded-xl p-6 max-w-md">
                                                            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>Get in Touch</h3>
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <input type="text" placeholder="Your Name *" disabled
                                                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }} />
                                                            </div>
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <input type="email" placeholder="Email Address" disabled
                                                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }} />
                                                            </div>
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <input type="tel" placeholder="Phone Number" disabled
                                                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }} />
                                                            </div>
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <textarea placeholder="Your Message" rows={3} disabled
                                                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }} />
                                                            </div>
                                                            <button disabled
                                                                style={{ width: '100%', padding: '12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'default' }}>
                                                                Submit
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Embeddable Code */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                                <Code className="w-4 h-4 text-indigo-400" />
                                                                Embeddable HTML Code
                                                            </h5>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(getWebsiteCodeSample());
                                                                    toast.success('Form code copied! Paste it into your website HTML.');
                                                                }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-gray-900 dark:text-white bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                                Copy Form Code
                                                            </button>
                                                        </div>
                                                        <div className="bg-black/30 rounded-xl p-4 max-h-64 overflow-y-auto">
                                                            <pre className="text-xs text-emerald-300 font-mono whitespace-pre overflow-x-auto">{getWebsiteCodeSample()}</pre>
                                                        </div>
                                                    </div>

                                                    {/* Instructions */}
                                                    <div className="flex gap-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                                        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                                        <div className="text-xs text-gray-600 dark:text-slate-300">
                                                            <p className="font-medium text-indigo-300 mb-1">How to use</p>
                                                            <ol className="space-y-1 list-decimal list-inside text-gray-500 dark:text-slate-400">
                                                                <li>Click <strong className="text-gray-900 dark:text-white">Copy Form Code</strong> above</li>
                                                                <li>Paste it into your website's HTML (works with WordPress, Shopify, Wix, React, or any website)</li>
                                                                <li>Customize the styles (colors, fonts, spacing) to match your website's look</li>
                                                                <li>Leads submitted through the form will automatically appear in your CRM</li>
                                                            </ol>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    How It Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">1</div>
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Enable & Configure</p>
                            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Toggle on the source and add your credentials</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">2</div>
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Follow Setup Guide</p>
                            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Click "Guide" for step-by-step instructions</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">3</div>
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Configure Webhook</p>
                            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Paste URL & Company ID in your platform</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">4</div>
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Leads Flow In</p>
                            <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Leads auto-appear and get assigned</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Credentials Configuration Modal */}
            {configModalPlatform && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Configure {INTEGRATIONS.find(i => i.id === configModalPlatform)?.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Enter your platform credentials to enable the integration</p>
                            </div>
                            <button onClick={() => setConfigModalPlatform(null)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {configModalPlatform === 'meta' ? (
                                <div className="space-y-4 pt-2">
                                    {credentialForm.pageName && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400">
                                            <p className="text-xs font-semibold uppercase tracking-wide">Currently Connected Page</p>
                                            <p className="text-sm font-bold mt-1">{credentialForm.pageName}</p>
                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {credentialForm.pageId}</p>
                                        </div>
                                    )}

                                    <div className="text-center py-4 bg-gray-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-gray-300 dark:border-slate-800">
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 px-4">
                                            Link Wcrm to your Facebook profile to manage page lead forms.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleFacebookConnect}
                                            disabled={testing}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                                        >
                                            <Plug className="w-4 h-4" />
                                            {testing ? 'Connecting...' : (credentialForm.pageId ? 'Reconnect / Change Account' : 'Connect to Facebook')}
                                        </button>
                                    </div>

                                    {(pagesList.length > 0 || (credentialForm.pageId && credentialForm.userAccessToken)) && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                                                Select Facebook Page
                                            </label>
                                            <select
                                                value={selectedPageId}
                                                onChange={(e) => setSelectedPageId(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">-- Select Page --</option>
                                                {pagesList.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                                {credentialForm.pageId && !pagesList.find(p => p.id === credentialForm.pageId) && (
                                                    <option value={credentialForm.pageId}>{credentialForm.pageName || credentialForm.pageId} (Current)</option>
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                (PLATFORM_CREDENTIALS[configModalPlatform] || []).map((field) => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">{field.label}</label>
                                        <div className="relative">
                                            <input
                                                type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                                value={credentialForm[field.key] || ''}
                                                onChange={(e) => setCredentialForm({ ...credentialForm, [field.key]: e.target.value })}
                                                placeholder={field.placeholder}
                                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                                            />
                                            {field.type === 'password' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, [field.key]: !showPasswords[field.key] })}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:text-slate-300"
                                                >
                                                    {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setConfigModalPlatform(null)}
                                    className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                {configModalPlatform === 'meta' && (
                                    <button
                                        type="button"
                                        onClick={testMetaConnection}
                                        disabled={testing}
                                        className="flex-1 py-2.5 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-xl transition-all font-medium disabled:opacity-50"
                                    >
                                        {testing ? 'Testing...' : 'Test Connection'}
                                    </button>
                                )}
                                <button
                                    onClick={saveCredentials}
                                    disabled={saving || testing}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
