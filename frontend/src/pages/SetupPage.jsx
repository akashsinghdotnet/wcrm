import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import {
    Building2, User, Mail, Lock, Phone, Eye, EyeOff,
    CheckCircle2, Sparkles, ShieldCheck, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';
import { WcrmIcon } from '../components/WcrmLogo';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SetupPage() {
    const navigate = useNavigate();
    const { user, setSession } = useAuth();
    const { config } = useConfig() || {};
    const isSelfHosted = config?.deployment_mode === 'self_hosted';

    const [statusLoading, setStatusLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    // Form inputs
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const checkStatus = () => {
        setStatusLoading(true);
        setConnectionError(null);
        api.get('/setup/status')
            .then((res) => {
                const data = res.data || {};
                if (!data.isSelfHosted) {
                    navigate('/login', { replace: true });
                    return;
                }
                if (data.isConfigured) {
                    setIsConfigured(true);
                    toast('This instance is already configured. Please sign in.', { icon: 'ℹ️' });
                    navigate('/login', { replace: true });
                } else {
                    setIsConfigured(false);
                }
            })
            .catch((err) => {
                const msg = err.response?.data?.message || err.message || 'Cannot reach Wcrm backend API';
                setConnectionError(msg);
            })
            .finally(() => {
                setStatusLoading(false);
            });
    };

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
            return;
        }
        checkStatus();
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (adminPassword.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (adminPassword !== confirmPassword) {
            setErrorMessage('Passwords do not match. Please verify.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/setup/initialize', {
                companyName: companyName.trim(),
                adminName: adminName.trim(),
                adminEmail: adminEmail.trim().toLowerCase(),
                adminPassword,
                phone: phone.trim() || undefined,
            });

            const { access_token, user: userData } = res.data;
            if (access_token && userData) {
                setSession(access_token, userData);
                toast.success('🎉 Welcome to Wcrm! Your instance is ready.');
                navigate('/', { replace: true });
            } else {
                toast.success('Setup completed! Please log in with your credentials.');
                navigate('/login', { replace: true });
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to initialize instance.';
            setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
            toast.error('Setup failed. Please check errors.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (statusLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400 space-y-4">
                <RefreshCw className="animate-spin text-emerald-400" size={32} />
                <p className="text-sm font-medium">Checking Wcrm system status...</p>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-300 space-y-5 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <AlertCircle size={28} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Starting Backend Engine</h2>
                    <p className="text-sm text-slate-400">
                        The backend API container is currently initializing. Please wait a few moments and retry.
                    </p>
                    <p className="text-xs text-slate-500 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800 break-words">
                        {connectionError}
                    </p>
                </div>
                <button
                    onClick={checkStatus}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                    <RefreshCw size={16} />
                    Retry Connection
                </button>
            </div>
        );
    }

    if (isConfigured) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background glowing gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10 space-y-8">
                {/* Header Branding */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center mb-1">
                        <WcrmIcon className="w-12 h-12 shadow-lg shadow-emerald-500/20 rounded-2xl" />
                    </div>

                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Welcome to Wcrm
                        </h1>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                        <Sparkles size={13} className="text-emerald-400" />
                        Open-Source Community Edition • One-Time Setup
                    </div>

                    <p className="text-sm text-slate-400 max-w-lg mx-auto">
                        Complete this initial setup to configure your organization and create your primary Company Administrator account.
                    </p>
                </div>

                {/* Main Setup Card */}
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
                    {errorMessage && (
                        <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-300 text-xs">
                            <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Company Profile */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <Building2 size={16} className="text-emerald-400" />
                                1. Organization & Workspace
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Company / Organization Name <span className="text-emerald-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="e.g. Acme Technologies"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Support Phone / WhatsApp Number <span className="text-slate-500 font-normal">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. +1 555 123 4567"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Administrator Account */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <User size={16} className="text-emerald-400" />
                                2. Company Administrator Account
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Administrator Full Name <span className="text-emerald-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={adminName}
                                            onChange={(e) => setAdminName(e.target.value)}
                                            placeholder="e.g. Alex Johnson"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Admin Email Address <span className="text-emerald-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="email"
                                            required
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            placeholder="admin@yourcompany.com"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        You will use this email address to sign in to your CRM dashboard.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Password <span className="text-emerald-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            className="w-full pl-10 pr-10 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-300">
                                        Confirm Password <span className="text-emerald-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-type password"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Open Source Feature Perks Banner */}
                        <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
                            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-400" />
                                Community Edition Features Automatically Activated:
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    WhatsApp Shared Inbox
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    Broadcast Campaigns
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    AI Agents & Flow Automations
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    Zero Recurring Plan Fees
                                </span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.99]"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    Configuring Your CRM Instance...
                                </>
                            ) : (
                                <>
                                    Complete Setup & Launch CRM
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <div className="text-center text-xs text-slate-500">
                    <a
                        href="https://wcrm.si"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                    >
                        Powered by <span className="font-semibold text-slate-300">Wcrm</span> — The Modern Open-Source WhatsApp CRM
                    </a>
                </div>
            </div>
        </div>
    );
}
