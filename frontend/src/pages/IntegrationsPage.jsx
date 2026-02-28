import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Plug, Copy, Check, Globe, MessageSquare, Settings,
    BarChart3, RefreshCcw, Shuffle, UserCheck, ExternalLink, Shield,
    ChevronDown, ChevronUp, Code, BookOpen, AlertCircle, Info, X, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLATFORM_CREDENTIALS = {
    meta: [
        { key: 'appId', label: 'App ID', type: 'text', placeholder: 'e.g. 123456789012345' },
        { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'Your App Secret' },
        { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Long-lived access token' },
        { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'e.g. 987654321098765' },
        { key: 'adAccountId', label: 'Ad Account ID', type: 'text', placeholder: 'e.g. act_123456789' },
    ],
    google: [
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'your-client-id.apps.googleusercontent.com' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your client secret' },
        { key: 'developerToken', label: 'Developer Token', type: 'password', placeholder: 'Google Ads developer token' },
        { key: 'customerId', label: 'Customer ID', type: 'text', placeholder: 'e.g. 123-456-7890' },
    ],
    indiamart: [
        { key: 'mobileNumber', label: 'Registered Mobile Number', type: 'text', placeholder: 'e.g. 9876543210' },
        { key: 'crmKey', label: 'CRM Key', type: 'password', placeholder: 'Your IndiaMart CRM key' },
    ],
    tradeindia: [
        { key: 'userid', label: 'User ID', type: 'text', placeholder: 'Your Trade India user ID' },
        { key: 'profile_id', label: 'Profile ID', type: 'text', placeholder: 'Your Trade India profile ID' },
        { key: 'key', label: 'API Key', type: 'password', placeholder: 'Your Trade India API key' },
    ],
    website: [],
};

const INTEGRATIONS = [
    {
        id: 'meta',
        name: 'Meta / Facebook Ads',
        description: 'Capture leads from Facebook & Instagram ad forms automatically via direct webhook.',
        color: 'from-blue-600 to-indigo-600',
        iconBg: 'bg-blue-500/10 border-blue-500/20',
        iconColor: 'text-blue-400',
        webhookPath: '/api/webhooks/meta',
        fields: [],
        setupSteps: [
            'Go to developers.facebook.com and create a Facebook App (type: Business)',
            'In your App Dashboard, go to Add Products → find "Webhooks" and click Set Up',
            'Also add the "Facebook Login" product for permissions',
            'Go to Webhooks settings → select "Page" from dropdown',
            'Click "Subscribe to this topic" → paste the Webhook URL shown below',
            'Set Verify Token to: magnet-crm',
            'Click "Verify and Save" — Facebook will verify your webhook',
            'After verification, subscribe to the "leadgen" field',
            'Go to App Settings → Basic → copy your App ID and App Secret, enter them below',
            'Go to Graph API Explorer → select your App → generate a Page Access Token with leads_retrieval and pages_manage_ads permissions',
            'Convert to a long-lived token: Use the Access Token Debugger tool → click "Extend Access Token"',
            'Enter the Page Access Token, Page ID, and App details in the credentials below',
            'Create a Lead Ad campaign — leads will automatically appear in your CRM!',
        ],
    },
    {
        id: 'google',
        name: 'Google Ads',
        description: 'Import leads from Google Ads lead form extensions.',
        color: 'from-red-500 to-orange-500',
        iconBg: 'bg-red-500/10 border-red-500/20',
        iconColor: 'text-red-400',
        webhookPath: '/api/webhooks/google',
        fields: [
            { name: 'companyId', required: true, description: 'Your Company ID (auto-included)' },
            { name: 'name', required: false, description: 'Full name of the lead' },
            { name: 'phone', required: false, description: 'Phone number' },
            { name: 'email', required: false, description: 'Email address' },
        ],
        setupSteps: [
            'Open Google Ads → Ads & Extensions → Lead Form Extensions',
            'Create or edit a Lead Form Extension',
            'Go to Lead Delivery → Webhook Integration',
            'Paste the Webhook URL and set the API key if required',
            'Map fields: first_name, last_name, phone, email',
            'Include "companyId" in the webhook payload (use Zapier/Make if needed)',
            'Submit a test lead to verify the connection',
        ],
    },
    {
        id: 'indiamart',
        name: 'IndiaMart',
        description: 'Sync buyer inquiries from your IndiaMart seller dashboard.',
        color: 'from-orange-500 to-yellow-500',
        iconBg: 'bg-orange-500/10 border-orange-500/20',
        iconColor: 'text-orange-400',
        webhookPath: '/api/webhooks/indiamart',
        fields: [
            { name: 'companyId', required: true, description: 'Your Company ID (auto-included)' },
            { name: 'name', required: false, description: 'Buyer name' },
            { name: 'phone', required: false, description: 'Buyer phone' },
            { name: 'email', required: false, description: 'Buyer email address' },
            { name: 'category', required: false, description: 'Product/service category' },
            { name: 'city', required: false, description: 'Buyer city' },
        ],
        setupSteps: [
            'Log in to your IndiaMart Seller Dashboard',
            'Go to Lead Manager → CRM Settings or API Integration',
            'Enable Lead Push via Webhook',
            'Paste the Webhook URL shown below',
            'Use a middleware (Zapier, Make, or Pabbly) to map IndiaMart fields to the accepted format',
            'Add "companyId" field in the middleware mapping',
            'Test by checking if new IndiaMart enquiries appear in your Leads page',
        ],
    },
    {
        id: 'tradeindia',
        name: 'Trade India',
        description: 'Receive Trade India enquiry leads into your pipeline.',
        color: 'from-emerald-500 to-teal-500',
        iconBg: 'bg-emerald-500/10 border-emerald-500/20',
        iconColor: 'text-emerald-400',
        webhookPath: '/api/webhooks/tradeindia',
        fields: [
            { name: 'companyId', required: true, description: 'Your Company ID (auto-included)' },
            { name: 'name', required: false, description: 'Enquiry sender name' },
            { name: 'phone', required: false, description: 'Phone number' },
            { name: 'email', required: false, description: 'Email address' },
            { name: 'category', required: false, description: 'Product/service category' },
            { name: 'city', required: false, description: 'City of the enquiry' },
        ],
        setupSteps: [
            'Log in to your Trade India Seller account',
            'Navigate to Settings → API/Webhook Integration',
            'Use a middleware tool (Zapier, Make, or Pabbly Connect) to forward enquiries',
            'Set the middleware to POST to the Webhook URL shown below',
            'Map fields: sender_name → name, sender_phone → phone, sender_email → email',
            'Add "companyId" in the middleware payload',
            'Verify by checking new enquiries in your CRM Leads page',
        ],
    },
    {
        id: 'website',
        name: 'Website Form',
        description: 'Connect your website contact form to auto-create leads.',
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
            'Add a contact/enquiry form to your website',
            'On form submission, send a POST request to the Webhook URL',
            'Include "companyId" in the JSON body along with form fields',
            'Set Content-Type header to "application/json"',
            'See the sample code below for a quick implementation',
        ],
    },
];

export default function IntegrationsPage() {
    const { user } = useAuth();
    const [copiedId, setCopiedId] = useState(null);
    const [copiedSample, setCopiedSample] = useState(null);
    const [assignmentMode, setAssignmentMode] = useState('round_robin');
    const [employees, setEmployees] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [integrationConfigs, setIntegrationConfigs] = useState({});
    const [configModalPlatform, setConfigModalPlatform] = useState(null);
    const [credentialForm, setCredentialForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});

    // Webhook URLs must point to the backend API, not the frontend
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    // Extract origin from full API URL (e.g. "https://api.magnetcrm.com/api" → "https://api.magnetcrm.com")
    const baseUrl = apiBase.replace(/\/api\/?$/, '') || window.location.origin;

    useEffect(() => {
        loadEmployees();
        loadIntegrationConfigs();
    }, []);

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
    };

    const saveCredentials = async () => {
        setSaving(true);
        try {
            await api.post('/integrations', {
                companyId: user.companyId,
                platform: configModalPlatform,
                credentials: credentialForm,
                isActive: integrationConfigs[configModalPlatform]?.isActive ?? true,
            });
            toast.success('Credentials saved');
            setConfigModalPlatform(null);
            loadIntegrationConfigs();
        } catch {
            toast.error('Failed to save credentials');
        } finally {
            setSaving(false);
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
        if (!active) return { label: 'Inactive', color: 'bg-slate-700 text-slate-400' };
        if (platformCreds.length === 0 || hasCreds) return { label: 'Connected', color: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' };
        return { label: 'Needs Setup', color: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' };
    };

    const copyWebhook = (integration) => {
        const url = `${baseUrl}${integration.webhookPath}`;
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
        return `// JavaScript (fetch API)
fetch("${baseUrl}/api/webhooks/website", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    companyId: "${user.companyId}",
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    message: document.getElementById("message").value
  })
});`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Plug className="w-6 h-6 text-indigo-400" />
                    Integrations
                </h2>
                <p className="text-slate-400 mt-1">Connect external lead sources, configure credentials, and manage lead distribution</p>
            </div>

            {/* Lead Distribution Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <Shuffle className="w-5 h-5 text-indigo-400" />
                    Lead Distribution
                </h3>
                <p className="text-sm text-slate-400 mb-5">Choose how incoming leads are assigned to your team</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => { setAssignmentMode('round_robin'); toast.success('Round-robin assignment enabled'); }}
                        className={`p-4 rounded-xl border text-left transition-all ${assignmentMode === 'round_robin'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${assignmentMode === 'round_robin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                                <RefreshCcw className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">Round Robin</p>
                                <p className="text-xs text-slate-400">Auto-assign to team members in rotation</p>
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
                                        <span className="text-xs text-slate-500">No active employees found</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => { setAssignmentMode('manual'); toast.success('Manual assignment enabled'); }}
                        className={`p-4 rounded-xl border text-left transition-all ${assignmentMode === 'manual'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${assignmentMode === 'manual' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">Manual Assignment</p>
                                <p className="text-xs text-slate-400">Admin assigns leads manually</p>
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

            {/* Integrations List */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-400" />
                    Lead Sources
                </h3>
                <div className="space-y-4">
                    {INTEGRATIONS.map((integration) => {
                        const active = isActive(integration.id);
                        const isExpanded = expandedId === integration.id;
                        const status = getStatusInfo(integration.id);
                        const platformCreds = PLATFORM_CREDENTIALS[integration.id] || [];
                        return (
                            <div
                                key={integration.id}
                                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${active ? 'border-slate-700' : 'border-slate-800 opacity-70'}`}
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
                                                    <h4 className="text-base font-semibold text-white">{integration.name}</h4>
                                                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{integration.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {active && integration.id === 'tradeindia' && hasCredentials('tradeindia') && (
                                                <button
                                                    onClick={async () => {
                                                        const toastId = toast.loading('Fetching TradeIndia leads...');
                                                        try {
                                                            const res = await api.post('/integrations/tradeindia/fetch', { companyId: user.companyId });
                                                            if (res.data.success) {
                                                                toast.success(res.data.message || 'Successfully triggered TradeIndia fetch', { id: toastId });
                                                            } else {
                                                                toast.error(res.data.message || 'Failed to fetch leads from TradeIndia', { id: toastId });
                                                            }
                                                        } catch (err) {
                                                            toast.error('Failed to connect to backend', { id: toastId });
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20"
                                                >
                                                    <RefreshCcw className="w-3.5 h-3.5" />
                                                    Fetch Leads
                                                </button>
                                            )}
                                            {active && platformCreds.length > 0 && (
                                                <button
                                                    onClick={() => openConfigModal(integration.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700"
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
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${active ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Webhook URL & Company ID (shown when active) */}
                                    {active && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="bg-black/30 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Webhook URL</span>
                                                    <button
                                                        onClick={() => copyWebhook(integration)}
                                                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        title="Copy webhook URL"
                                                    >
                                                        {copiedId === integration.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-300 font-mono break-all">
                                                    {baseUrl}{integration.webhookPath}
                                                </p>
                                            </div>

                                            <div className="bg-black/30 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Company ID</span>
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
                                                <p className="text-xs text-slate-300 font-mono break-all">
                                                    {user.companyId}
                                                </p>
                                            </div>

                                            {/* Show Verify Token for Meta integration */}
                                            {integration.id === 'meta' && (
                                                <div className="bg-black/30 rounded-xl p-3 md:col-span-2">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Verify Token (for Facebook Webhook setup)</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText('magnet-crm');
                                                                toast.success('Verify token copied');
                                                            }}
                                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                            title="Copy verify token"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-300 font-mono">
                                                        magnet-crm
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Expanded Setup Guide */}
                                    {active && isExpanded && (
                                        <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                                            {/* Setup Steps */}
                                            <div>
                                                <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                    <Info className="w-4 h-4 text-indigo-400" />
                                                    Setup Instructions
                                                </h5>
                                                <ol className="space-y-2">
                                                    {integration.setupSteps.map((step, idx) => (
                                                        <li key={idx} className="flex gap-3 text-sm">
                                                            <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-slate-300">{step}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>

                                            {/* Accepted Fields */}
                                            <div>
                                                {integration.fields.length > 0 && (
                                                <>
                                                <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                    <Shield className="w-4 h-4 text-indigo-400" />
                                                    Accepted Fields
                                                </h5>
                                                <div className="bg-black/20 rounded-xl overflow-hidden">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-800">
                                                                <th className="text-left px-3 py-2 text-slate-500 font-medium">Field</th>
                                                                <th className="text-left px-3 py-2 text-slate-500 font-medium">Required</th>
                                                                <th className="text-left px-3 py-2 text-slate-500 font-medium">Description</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800/50">
                                                            {integration.fields.map((field) => (
                                                                <tr key={field.name}>
                                                                    <td className="px-3 py-2 font-mono text-indigo-300">{field.name}</td>
                                                                    <td className="px-3 py-2">
                                                                        {field.required ? (
                                                                            <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px] font-medium">Required</span>
                                                                        ) : (
                                                                            <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded text-[10px] font-medium">Optional</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-slate-400">{field.description}</td>
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
                                                        <p className="text-xs text-slate-400 leading-relaxed">
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
                                                    <h5 className="text-sm font-semibold text-white flex items-center gap-2">
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
                                                <pre className="bg-black/30 rounded-xl p-4 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre">
                                                    {getSamplePayload(integration)}
                                                </pre>
                                            </div>
                                            )}

                                            {/* Website-specific code sample */}
                                            {integration.id === 'website' && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                                                            <Code className="w-4 h-4 text-indigo-400" />
                                                            Website Integration Code
                                                        </h5>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(getWebsiteCodeSample());
                                                                toast.success('Code copied');
                                                            }}
                                                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                            Copy Code
                                                        </button>
                                                    </div>
                                                    <pre className="bg-black/30 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre">
                                                        {getWebsiteCodeSample()}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Middleware tip for non-website integrations */}
                                            {integration.id !== 'website' && (
                                                <div className="flex gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                    <div className="text-xs text-amber-300/80">
                                                        <p className="font-medium text-amber-300 mb-1">Using a Middleware?</p>
                                                        <p>If {integration.name} doesn't support direct webhooks, use tools like <span className="font-medium text-white">Zapier</span>, <span className="font-medium text-white">Make (Integromat)</span>, or <span className="font-medium text-white">Pabbly Connect</span> to forward leads. Set the trigger as "{integration.name} New Lead" and action as "Webhooks POST" to the URL above with the JSON payload.</p>
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    How It Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">1</div>
                        <div>
                            <p className="text-white font-medium">Enable & Configure</p>
                            <p className="text-slate-400 text-xs mt-0.5">Toggle on the source and add your credentials</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">2</div>
                        <div>
                            <p className="text-white font-medium">Follow Setup Guide</p>
                            <p className="text-slate-400 text-xs mt-0.5">Click "Guide" for step-by-step instructions</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">3</div>
                        <div>
                            <p className="text-white font-medium">Configure Webhook</p>
                            <p className="text-slate-400 text-xs mt-0.5">Paste URL & Company ID in your platform</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">4</div>
                        <div>
                            <p className="text-white font-medium">Leads Flow In</p>
                            <p className="text-slate-400 text-xs mt-0.5">Leads auto-appear and get assigned</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Credentials Configuration Modal */}
            {configModalPlatform && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Configure {INTEGRATIONS.find(i => i.id === configModalPlatform)?.name}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Enter your platform credentials to enable the integration</p>
                            </div>
                            <button onClick={() => setConfigModalPlatform(null)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {(PLATFORM_CREDENTIALS[configModalPlatform] || []).map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">{field.label}</label>
                                    <div className="relative">
                                        <input
                                            type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                                            value={credentialForm[field.key] || ''}
                                            onChange={(e) => setCredentialForm({ ...credentialForm, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                                        />
                                        {field.type === 'password' && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswords({ ...showPasswords, [field.key]: !showPasswords[field.key] })}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                            >
                                                {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setConfigModalPlatform(null)}
                                    className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveCredentials}
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Credentials'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
