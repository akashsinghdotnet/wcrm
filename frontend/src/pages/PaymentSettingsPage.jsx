import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CreditCard, Save, Eye, EyeOff, IndianRupee, Globe, Building2, CheckCircle2, AlertTriangle, Copy, Check, Link2, Shield } from 'lucide-react';

const defaultSettings = {
    razorpay: { enabled: false, keyId: '', keySecret: '' },
    paypal: { enabled: false, clientId: '', secret: '' },
    bankTransfer: {
        enabled: false,
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
    },
};

export default function PaymentSettingsPage() {
    const [settings, setSettings] = useState(defaultSettings);
    const [showSecrets, setShowSecrets] = useState({});
    const [copiedKey, setCopiedKey] = useState(null);
    const [saving, setSaving] = useState(false);

    const baseUrl = window.location.origin;

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        toast.success('Webhook URL copied');
        setTimeout(() => setCopiedKey(null), 2000);
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.get('/settings/public');
            if (res.data?.payment_settings) {
                try {
                    setSettings({ ...defaultSettings, ...JSON.parse(res.data.payment_settings) });
                } catch { }
            }
        } catch { }
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

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch('/settings/payment_settings', {
                value: JSON.stringify(settings),
                isPublic: true,
            });
            toast.success('Payment settings saved');
        } catch {
            toast.error('Failed to save payment settings');
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = [settings.razorpay.enabled, settings.paypal.enabled, settings.bankTransfer.enabled].filter(Boolean).length;

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-indigo-400" />
                        Payment Gateways
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Configure payment methods visible on checkout pages</p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{enabledCount} of 3 active</span>
                </div>
            </div>

            {enabledCount === 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-300">No payment methods enabled. Users won't see any payment options on checkout.</p>
                </div>
            )}

            {/* Razorpay */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${settings.razorpay.enabled ? 'border-blue-500/30' : 'border-gray-200 dark:border-slate-800'}`}>
                <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <IndianRupee className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Razorpay</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Accept UPI, cards, netbanking & wallets</p>
                            </div>
                        </div>
                        <button
                            onClick={() => updateGateway('razorpay', 'enabled', !settings.razorpay.enabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.razorpay.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'}`}
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
                                    onChange={(e) => updateGateway('razorpay', 'keyId', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    placeholder="rzp_live_xxxxxxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Key Secret</label>
                                <div className="relative">
                                    <input
                                        type={showSecrets.razorpaySecret ? 'text' : 'password'}
                                        value={settings.razorpay.keySecret}
                                        onChange={(e) => updateGateway('razorpay', 'keySecret', e.target.value)}
                                        className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                        placeholder="••••••••••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleSecret('razorpaySecret')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white"
                                    >
                                        {showSecrets.razorpaySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {settings.razorpay.keyId && settings.razorpay.keySecret && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Credentials configured
                                </div>
                            )}

                            {/* Webhook URL */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Link2 className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Webhook URL</span>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(`${baseUrl}/api/webhooks/payments/razorpay`, 'razorpay_wh')}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        {copiedKey === 'razorpay_wh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <div className="bg-black/30 rounded-xl p-3">
                                    <p className="text-xs text-gray-600 dark:text-slate-300 font-mono break-all">{baseUrl}/api/webhooks/payments/razorpay</p>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1.5">
                                    <Shield className="w-3 h-3" />
                                    Paste this URL in your Razorpay Dashboard → Settings → Webhooks
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PayPal */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${settings.paypal.enabled ? 'border-sky-500/30' : 'border-gray-200 dark:border-slate-800'}`}>
                <div className="h-1.5 bg-gradient-to-r from-sky-500 to-blue-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">PayPal</h3>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Client ID</label>
                                <input
                                    type="text"
                                    value={settings.paypal.clientId}
                                    onChange={(e) => updateGateway('paypal', 'clientId', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                                    placeholder="AaBbCcDd..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Secret</label>
                                <div className="relative">
                                    <input
                                        type={showSecrets.paypalSecret ? 'text' : 'password'}
                                        value={settings.paypal.secret}
                                        onChange={(e) => updateGateway('paypal', 'secret', e.target.value)}
                                        className="w-full px-4 py-2.5 pr-12 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                                        placeholder="••••••••••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => toggleSecret('paypalSecret')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white"
                                    >
                                        {showSecrets.paypalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {settings.paypal.clientId && settings.paypal.secret && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Credentials configured
                                </div>
                            )}

                            {/* Webhook URL */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Link2 className="w-3.5 h-3.5 text-sky-400" />
                                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">Webhook URL</span>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(`${baseUrl}/api/webhooks/payments/paypal`, 'paypal_wh')}
                                        className="text-sky-400 hover:text-sky-300 transition-colors"
                                    >
                                        {copiedKey === 'paypal_wh' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <div className="bg-black/30 rounded-xl p-3">
                                    <p className="text-xs text-gray-600 dark:text-slate-300 font-mono break-all">{baseUrl}/api/webhooks/payments/paypal</p>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex items-center gap-1.5">
                                    <Shield className="w-3 h-3" />
                                    Paste this URL in PayPal Developer → Webhooks → Add Webhook
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bank Transfer */}
            <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${settings.bankTransfer.enabled ? 'border-emerald-500/30' : 'border-gray-200 dark:border-slate-800'}`}>
                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-500" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Bank Transfer</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">Show bank details for direct NEFT/IMPS/RTGS transfers</p>
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
                                    <input
                                        type="text"
                                        value={settings.bankTransfer.bankName}
                                        onChange={(e) => updateGateway('bankTransfer', 'bankName', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="State Bank of India"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Branch</label>
                                    <input
                                        type="text"
                                        value={settings.bankTransfer.branch}
                                        onChange={(e) => updateGateway('bankTransfer', 'branch', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                        placeholder="Main Branch, Mumbai"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Account Holder Name</label>
                                <input
                                    type="text"
                                    value={settings.bankTransfer.accountHolder}
                                    onChange={(e) => updateGateway('bankTransfer', 'accountHolder', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    placeholder="Magnet Technologies Pvt Ltd"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Account Number</label>
                                    <input
                                        type="text"
                                        value={settings.bankTransfer.accountNumber}
                                        onChange={(e) => updateGateway('bankTransfer', 'accountNumber', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                                        placeholder="1234567890123456"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={settings.bankTransfer.ifscCode}
                                        onChange={(e) => updateGateway('bankTransfer', 'ifscCode', e.target.value.toUpperCase())}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm uppercase"
                                        placeholder="SBIN0001234"
                                    />
                                </div>
                            </div>
                            {settings.bankTransfer.accountNumber && settings.bankTransfer.ifscCode && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Bank details configured
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Payment Settings'}
            </button>
        </div>
    );
}
