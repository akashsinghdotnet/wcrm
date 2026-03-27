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
    meta: [
        { key: 'appId', label: 'App ID', type: 'text', placeholder: 'e.g. 123456789012345' },
        { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: 'Your App Secret' },
        { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Long-lived access token' },
        { key: 'pageId', label: 'Page ID', type: 'text', placeholder: 'e.g. 987654321098765' },
        { key: 'adAccountId', label: 'Ad Account ID', type: 'text', placeholder: 'e.g. act_123456789' },
    ],
    google: [
        { key: 'webhookKey', label: 'Webhook Key', type: 'password', placeholder: 'Your secret webhook key (e.g. my-secret-key-2026)' },
    ],
    indiamart: [
        { key: 'mobileNumber', label: 'Registered Mobile Number', type: 'text', placeholder: 'e.g. 9876543210' },
        { key: 'crmKey', label: 'CRM Key', type: 'password', placeholder: 'Your IndiaMart CRM key' },
    ],
    justdial: [],
    tradeindia: [
        { key: 'userid', label: 'User ID', type: 'text', placeholder: 'Your Trade India user ID' },
        { key: 'profile_id', label: 'Profile ID', type: 'text', placeholder: 'Your Trade India profile ID' },
        { key: 'key', label: 'API Key', type: 'password', placeholder: 'Your Trade India API key' },
    ],
    email_parser: [
        { key: 'host', label: 'IMAP Host Server', type: 'text', placeholder: 'e.g. imap.gmail.com or imap.hostinger.com' },
        { key: 'port', label: 'IMAP Port', type: 'text', placeholder: 'e.g. 993' },
        { key: 'username', label: 'Email Address / Username', type: 'text', placeholder: 'e.g. leads@mycompany.com' },
        { key: 'password', label: 'App Password', type: 'password', placeholder: 'Your Email App Password (Do not use normal password)' },
        { key: 'tls', label: 'Enable TLS/SSL (true/false)', type: 'text', placeholder: 'true' },
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
        description: 'Capture leads directly from Google Ads Lead Form Extensions via webhook — no middleware needed.',
        color: 'from-red-500 to-orange-500',
        iconBg: 'bg-red-500/10 border-red-500/20',
        iconColor: 'text-red-400',
        webhookPath: '/api/webhooks/google',
        fields: [],
        setupSteps: [
            'Enable this integration and click "Configure" to set your Webhook Key (choose any secret key, e.g. my-company-key-2026)',
            'Log in to ads.google.com and go to Ads & Assets → Assets',
            'Click "+" → select "Lead Form" (or edit an existing Lead Form)',
            'Add the fields you want to collect: Full Name, Email, Phone Number, etc.',
            'Scroll down to "Lead delivery options" or "Webhook integration"',
            'Paste the Webhook URL shown below into the "Webhook URL" field',
            'Enter the same Webhook Key you set in step 1 into the "Key" field',
            'Click "Send test data" to verify the connection — a test lead should appear in your CRM',
            'Save the Lead Form and attach it to your Search, Display, YouTube, or Performance Max campaign',
            'Leads submitted through your ads will automatically appear in your CRM and get assigned via round-robin!',
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
        id: 'justdial',
        name: 'JustDial',
        description: 'Receive enquiry leads from your JustDial business listing automatically.',
        color: 'from-cyan-500 to-blue-500',
        iconBg: 'bg-cyan-500/10 border-cyan-500/20',
        iconColor: 'text-cyan-400',
        webhookPath: '/api/webhooks/justdial',
        fields: [],
        setupSteps: [
            'Enable this integration by toggling the switch on',
            'Copy the Webhook URL and your Company ID shown below',
            'Contact your JustDial Account Manager (the person who manages your JustDial listing)',
            'Send them this message: "Please enable Lead Push (webhook) to this URL: [paste webhook URL]?companyId=[paste company ID]. Send data as JSON via HTTP POST."',
            'JustDial\'s backend team will configure it on their end (usually takes 24-48 hours)',
            'Once they confirm it\'s active, generate a test enquiry on your JustDial listing to verify',
            'Leads will automatically appear in your CRM and get assigned via round-robin',
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
            'Enable this integration by toggling the switch on',
            'Click "Guide" to see the embeddable form code and live preview',
            'Click "Copy Form Code" to copy the ready-to-use HTML snippet',
            'Paste the code into your website (works with WordPress, Shopify, Wix, React, plain HTML, or any CMS)',
            'Customize the form styles (colors, fonts) to match your website design',
            'Form submissions will automatically create leads in your CRM and assign them via round-robin',
        ],
    },
    {
        id: 'email_parser',
        name: 'Universal Email Lead Parser',
        description: 'Auto-extracts TradeIndia Buy Leads and JustDial inquiries directly from your email inbox.',
        color: 'from-pink-500 to-rose-500',
        iconBg: 'bg-pink-500/10 border-pink-500/20',
        iconColor: 'text-pink-400',
        webhookPath: '',
        fields: [],
        setupSteps: [
            'Enable this integration and click "Configure"',
            "Enter your email provider's IMAP Host (e.g., imap.gmail.com or imap.hostinger.com)",
            'Enter the IMAP Port (usually 993)',
            'Enter your full Email Address (e.g., leads@yourcompany.com)',
            'Enter your Email App Password (If using Gmail, go to Google Account Security -> 2-Step Verification -> App Passwords to generate one).',
            'Leave TLS as "true".',
            'Save configuration. The CRM will securely log in to your inbox every 5 minutes in the background.',
            'It will automatically read UNREAD emails, smartly extract Name, Phone, and Requirements, and import them seamlessly into your Leads dashboard!'
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

    const testImapConnection = async () => {
        setTesting(true);
        const toastId = toast.loading('Testing connection...');
        try {
            const res = await api.post('/integrations/email-parser/test', credentialForm);
            if (res.data.success) {
                toast.success('Connection successful! Credentials are valid.', { id: toastId });
            } else {
                toast.error(`Connection failed: ${res.data.message}`, { id: toastId });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to connect to server', { id: toastId });
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
        return `<!-- Magnet CRM Lead Capture Form — Paste this anywhere in your website -->
<div id="magnetcrm-form-wrapper">
  <form id="magnetcrm-lead-form" onsubmit="return submitMagnetCRMForm(event)">
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
function submitMagnetCRMForm(e) {
  e.preventDefault();
  var form = document.getElementById('magnetcrm-lead-form');
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
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-gray-900 dark:text-white bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-all border border-emerald-500/20"
                                                >
                                                    <RefreshCcw className="w-3.5 h-3.5" />
                                                    Fetch Leads
                                                </button>
                                            )}
                                            {active && platformCreds.length > 0 && (
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
                                            <div className="bg-black/30 rounded-xl p-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Webhook URL</span>
                                                    <button
                                                        onClick={() => copyWebhook(integration)}
                                                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        title="Copy webhook URL"
                                                    >
                                                        {copiedId === integration.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-slate-300 font-mono break-all">
                                                    {baseUrl}{integration.webhookPath}
                                                </p>
                                            </div>

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

                                            {/* Show Verify Token for Meta integration */}
                                            {integration.id === 'meta' && (
                                                <div className="bg-black/30 rounded-xl p-3 md:col-span-2">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">Verify Token (for Facebook Webhook setup)</span>
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
                                                    <p className="text-xs text-gray-600 dark:text-slate-300 font-mono">
                                                        magnet-crm
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
                            {(PLATFORM_CREDENTIALS[configModalPlatform] || []).map((field) => (
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
                            ))}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setConfigModalPlatform(null)}
                                    className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                {configModalPlatform === 'email_parser' && (
                                    <button
                                        type="button"
                                        onClick={testImapConnection}
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
