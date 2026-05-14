import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    CreditCard, Save, Eye, EyeOff, IndianRupee, Globe,
    Building2, CheckCircle2, AlertTriangle, Copy, Check, Link2, Shield
} from 'lucide-react';

const defaultSettings = {
    razorpay: { enabled: false, keyId: '', keySecret: '' },
    paypal: { enabled: false, clientId: '', secret: '', mode: 'live' },
    bankTransfer: {
        enabled: false,
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
    },
};

export default function CompanyPaymentSettings() {
    const [settings, setSettings] = useState(defaultSettings);
    const [showSecrets, setShowSecrets] = useState({});
    const [copiedKey, setCopiedKey] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.get('/company-settings/company_payment_settings');
            if (res.data?.value) {
                try {
                    setSettings({ ...defaultSettings, ...JSON.parse(res.data.value) });
                } catch { }
            }
        } catch { }
        finally { setLoading(false); }
    };

    const updateGateway = (gateway, field, value) => {
        setSettings(prev => ({
            ...prev,
            [gateway]: { ...prev[gateway], [field]: value },
        }));
    };

    const toggleSecret = (key) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch('/company-settings/company_payment_settings', {
                value: JSON.stringify(settings),
            });
            toast.success('Payment settings saved');
        } catch {
            toast.error('Failed to save payment settings');
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = [
        settings.razorpay.enabled,
        settings.paypal.enabled,
        settings.bankTransfer.enabled,
    ].filter(Boolean).length;

    const inputClass = 'w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-sm';

    if (loading) {
        return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-violet-400" />
                        Payment Gateways
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Configure payment methods for your event ticket sales. Money goes directly to your accounts.
                    </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">{enabledCount} of 3 active</span>
            </div>

            {enabledCount === 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        No payment methods enabled. Event attendees won't see any payment options.
                    </p>
                </div>
            )}

            {/* ── Razorpay ── */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${settings.razorpay.enabled ? 'border-violet-500/40' : 'border-gray-200 dark:border-slate-800'}`}>
                <div className="h-1.5 bg-gradient-to-r from-violet-600 to-indigo-600" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                <IndianRupee className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Razorpay</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Accept UPI, cards, netbanking &amp; wallets</p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateGateway('razorpay', 'enabled', !settings.razorpay.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.razorpay.enabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.razorpay.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {settings.razorpay.enabled && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Key ID</label>
                                <input
                                    type="text"
                                    value={settings.razorpay.keyId}
                                    onChange={e => updateGateway('razorpay', 'keyId', e.target.value)}
                                    className={inputClass}
                                    placeholder="rzp_live_xxxxxxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Key Secret</label>
                                <div className="relative">
                                    <input
                                        type={showSecrets.rzSecret ? 'text' : 'password'}
                                        value={settings.razorpay.keySecret}
                                        onChange={e => updateGateway('razorpay', 'keySecret', e.target.value)}
                                        className={`${inputClass} pr-12`}
                                        placeholder="••••••••••••••••"
                                    />
                                    <button type="button" onClick={() => toggleSecret('rzSecret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                        {showSecrets.rzSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {settings.razorpay.keyId && settings.razorpay.keySecret && (
                                <div className="flex items-center gap-2 text-xs text-emerald-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Credentials configured
                                </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Link2 className="w-3.5 h-3.5 text-violet-400" />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Webhook URL</span>
                                    </div>
                                    <button onClick={() => copyToClipboard(`${window.location.origin}/api/events/webhooks/razorpay`, 'rz_wh')} className="text-violet-400 hover:text-violet-300 transition-colors">
                                        {copiedKey === 'rz_wh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <div className="bg-slate-100 dark:bg-black/30 rounded-xl p-3">
                                    <p className="text-xs text-gray-600 dark:text-slate-300 font-mono break-all">{window.location.origin}/api/events/webhooks/razorpay</p>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1.5">
                                    <Shield className="w-3 h-3" /> Paste in Razorpay Dashboard → Settings → Webhooks
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── PayPal ── */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${settings.paypal.enabled ? 'border-sky-500/40' : 'border-gray-200 dark:border-slate-800'}`}>
                <div className="h-1.5 bg-gradient-to-r from-sky-500 to-blue-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white">PayPal</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Accept international payments via PayPal</p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateGateway('paypal', 'enabled', !settings.paypal.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.paypal.enabled ? 'bg-sky-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.paypal.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {settings.paypal.enabled && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                            <div className="flex items-center gap-4 mb-2">
                                {['sandbox', 'live'].map(mode => (
                                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={settings.paypal.mode === mode} onChange={() => updateGateway('paypal', 'mode', mode)} className="w-4 h-4 text-sky-600 focus:ring-sky-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300 capitalize">{mode === 'sandbox' ? 'Sandbox (Testing)' : 'Live (Production)'}</span>
                                    </label>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Client ID</label>
                                <input type="text" value={settings.paypal.clientId} onChange={e => updateGateway('paypal', 'clientId', e.target.value)} className={inputClass} placeholder="AaBbCcDd..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Secret</label>
                                <div className="relative">
                                    <input type={showSecrets.ppSecret ? 'text' : 'password'} value={settings.paypal.secret} onChange={e => updateGateway('paypal', 'secret', e.target.value)} className={`${inputClass} pr-12`} placeholder="••••••••••••••••" />
                                    <button type="button" onClick={() => toggleSecret('ppSecret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                        {showSecrets.ppSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {settings.paypal.clientId && settings.paypal.secret && (
                                <div className="flex items-center gap-2 text-xs text-emerald-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Credentials configured
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bank Transfer ── */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${settings.bankTransfer.enabled ? 'border-emerald-500/40' : 'border-gray-200 dark:border-slate-800'}`}>
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white">Bank Transfer</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Show bank details for NEFT / IMPS / RTGS</p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateGateway('bankTransfer', 'enabled', !settings.bankTransfer.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.bankTransfer.enabled ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${settings.bankTransfer.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {settings.bankTransfer.enabled && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Bank Name</label>
                                    <input type="text" value={settings.bankTransfer.bankName} onChange={e => updateGateway('bankTransfer', 'bankName', e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="State Bank of India" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Branch</label>
                                    <input type="text" value={settings.bankTransfer.branch} onChange={e => updateGateway('bankTransfer', 'branch', e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Main Branch, Mumbai" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Account Holder Name</label>
                                <input type="text" value={settings.bankTransfer.accountHolder} onChange={e => updateGateway('bankTransfer', 'accountHolder', e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" placeholder="Your Company Pvt Ltd" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Account Number</label>
                                    <input type="text" value={settings.bankTransfer.accountNumber} onChange={e => updateGateway('bankTransfer', 'accountNumber', e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm" placeholder="1234567890123456" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">IFSC Code</label>
                                    <input type="text" value={settings.bankTransfer.ifscCode} onChange={e => updateGateway('bankTransfer', 'ifscCode', e.target.value.toUpperCase())} className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm uppercase" placeholder="SBIN0001234" />
                                </div>
                            </div>
                            {settings.bankTransfer.accountNumber && settings.bankTransfer.ifscCode && (
                                <div className="flex items-center gap-2 text-xs text-emerald-500">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Bank details configured
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-violet-600/25 disabled:opacity-50"
            >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Payment Settings'}
            </button>
        </div>
    );
}
