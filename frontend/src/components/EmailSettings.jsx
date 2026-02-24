import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Mail, Save, Eye, EyeOff, Server, Shield, User } from 'lucide-react';
import api from '../services/api';

export default function EmailSettings() {
    const [config, setConfig] = useState({
        host: 'smtp.gmail.com',
        port: 587,
        user: '',
        pass: '',
        fromName: 'Magnet CRM',
        fromEmail: '',
        isSecure: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    if (loading) return <div className="text-slate-400">Loading settings...</div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    SMTP Configuration
                </h2>
                <p className="text-sm text-slate-400 mt-1">Configure the email server used for system notifications.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">SMTP Host</label>
                        <div className="relative">
                            <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                value={config.host}
                                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Port</label>
                        <input
                            type="number"
                            value={config.port}
                            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="587"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Username / Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                value={config.user}
                                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="notifications@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Password / App Password</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={config.pass}
                                onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                                className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <h3 className="text-sm font-medium text-white mb-4">Sender Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">From Name</label>
                            <input
                                value={config.fromName}
                                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Magnet CRM"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">From Email (Optional)</label>
                            <input
                                value={config.fromEmail || ''}
                                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Leave blank to use Username"
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
                        className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <label htmlFor="secure" className="text-sm text-slate-300">Use Secure Connection (SSL/TLS - Port 465)</label>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Configuration'}
            </button>
        </div>
    );
}
