import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, MessageCircle, CheckCircle, XCircle, Loader2, Copy, Check } from 'lucide-react';

export default function WhatsAppSettings() {
    const { user } = useAuth();
    const [form, setForm] = useState({ phoneNumberId: '', accessToken: '', businessAccountId: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [configured, setConfigured] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

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

    if (loading) {
        return <div className="text-slate-400 text-sm p-8 text-center">Loading WhatsApp settings...</div>;
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">WhatsApp Business API</h3>
                        <p className="text-xs text-slate-500">Connect your WhatsApp Business account to chat with leads directly from the CRM</p>
                    </div>
                    {configured && (
                        <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">
                            <CheckCircle size={12} /> Connected
                        </span>
                    )}
                </div>

                {/* Setup Guide */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-medium text-slate-300">Setup Guide</h4>
                    <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
                        <li>Go to <span className="text-indigo-400">Meta Business Suite</span> &gt; WhatsApp &gt; API Setup</li>
                        <li>Copy your <span className="text-white font-medium">Phone Number ID</span> and <span className="text-white font-medium">Permanent Access Token</span></li>
                        <li>Optionally add your <span className="text-white font-medium">Business Account ID</span></li>
                        <li>In Meta &gt; WhatsApp &gt; Configuration, set the <span className="text-white font-medium">Callback URL</span> and <span className="text-white font-medium">Verify Token</span> shown below</li>
                        <li>Subscribe to the <span className="text-white font-medium">messages</span> webhook field</li>
                    </ol>

                    {/* Webhook URL */}
                    <div className="mt-3 space-y-2">
                        <div>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Callback / Webhook URL</span>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-green-400 text-xs break-all">{webhookUrl}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                                    title="Copy webhook URL"
                                >
                                    {copiedField === 'webhook' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Verify Token */}
                        <div>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Verify Token</span>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-amber-400 text-xs">{verifyToken}</code>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(verifyToken, 'verify')}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
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
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number ID <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={form.phoneNumberId}
                            onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g. 1234567890123456"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Access Token <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={form.accessToken}
                                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                                placeholder="EAAxxxxxxx..."
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                            >
                                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Account ID <span className="text-slate-600">(Optional)</span></label>
                        <input
                            type="text"
                            value={form.businessAccountId}
                            onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl font-medium transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {testing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Test
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
