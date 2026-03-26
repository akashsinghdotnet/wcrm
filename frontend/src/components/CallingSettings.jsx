import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Phone, CheckCircle, Loader2 } from 'lucide-react';

export default function CallingSettings() {
    const { user } = useAuth();
    const [form, setForm] = useState({ accountSid: '', authToken: '', phoneNumber: '', recordCalls: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [configured, setConfigured] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/calling/config');
            if (res.data) {
                setForm({
                    accountSid: res.data.accountSid || '',
                    authToken: res.data.authToken || '',
                    phoneNumber: res.data.phoneNumber || '',
                    recordCalls: res.data.recordCalls ?? true,
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
        if (!form.accountSid || !form.authToken || !form.phoneNumber) {
            toast.error('All fields are required');
            return;
        }
        setSaving(true);
        try {
            await api.post('/calling/config', form);
            toast.success('Calling configuration saved! TwiML App and API Key created.');
            setConfigured(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-gray-500 dark:text-slate-400 text-sm p-8 text-center">Loading calling settings...</div>;
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Browser Calling (Twilio)</h3>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Make calls directly from the CRM browser to leads using Twilio</p>
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
                        <li>Sign up at <span className="text-indigo-400">twilio.com</span> (free account)</li>
                        <li>From the Twilio Console, copy your <span className="text-gray-900 dark:text-white font-medium">Account SID</span> and <span className="text-gray-900 dark:text-white font-medium">Auth Token</span></li>
                        <li>Buy a phone number from Twilio (<span className="text-gray-900 dark:text-white font-medium">Phone Numbers → Buy a Number</span>)</li>
                        <li>Enter the details below and save — the CRM will automatically set up the TwiML App and API Key</li>
                        <li>Your team can now call leads directly from the browser!</li>
                    </ol>

                    <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-[11px] text-amber-300">
                            <span className="font-semibold">Note:</span> Each call uses your Twilio balance. Twilio charges ~$0.013/min for outbound calls to India.
                            You can add credits from your Twilio dashboard.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Account SID <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={form.accountSid}
                            onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Auth Token <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <input
                                type={showToken ? 'text' : 'password'}
                                value={form.authToken}
                                onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                placeholder="Your auth token"
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
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Twilio Phone Number <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={form.phoneNumber}
                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+1234567890"
                            required
                        />
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Include country code (e.g., +1 for US, +91 for India)</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, recordCalls: !form.recordCalls })}
                            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.recordCalls ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.recordCalls ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-slate-300">Record all calls automatically</span>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-blue-600/25 cursor-pointer flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                        {saving ? 'Setting up...' : 'Save & Setup Calling'}
                    </button>
                </form>
            </div>
        </div>
    );
}
