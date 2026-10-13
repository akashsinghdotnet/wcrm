import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Mail, Save, Eye, EyeOff, Server, Shield, User, Send } from 'lucide-react';
import api from '../services/api';

export default function EmailSettings() {
    const [config, setConfig] = useState({
        host: 'smtp.gmail.com',
        port: 587,
        user: '',
        pass: '',
        fromName: 'Wcrm',
        fromEmail: '',
        isSecure: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/email/config');
            if (res.data) setConfig(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/email/config', config);
            toast.success('Email settings saved');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const res = await api.post('/email/config/test', config);
            if (res.data.success) {
                toast.success('Connection successful');
            } else {
                toast.error(res.data.message || 'Connection failed');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Connection failed');
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <div className="text-gray-500 dark:text-slate-400">Loading settings...</div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    SMTP Configuration
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Configure the email server used for system notifications.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">SMTP Host</label>
                        <div className="relative">
                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                            <input
                                value={config.host}
                                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Port</label>
                        <input
                            type="number"
                            value={config.port}
                            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="587"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Username / Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                            <input
                                value={config.user}
                                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="notifications@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Password / App Password</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={config.pass}
                                onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Sender Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">From Name</label>
                            <input
                                value={config.fromName}
                                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Wcrm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">From Email</label>
                            <input
                                required
                                value={config.fromEmail || ''}
                                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="hello@company.com"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <input
                        type="checkbox"
                        id="secure"
                        checked={config.isSecure}
                        onChange={(e) => setConfig({ ...config, isSecure: e.target.checked })}
                        className="w-4 h-4 rounded bg-white dark:bg-slate-800 border-gray-400 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <label htmlFor="secure" className="text-sm text-gray-600 dark:text-slate-300">Use Secure Connection (SSL/TLS - Port 465)</label>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                    <Send size={18} />
                    {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}
