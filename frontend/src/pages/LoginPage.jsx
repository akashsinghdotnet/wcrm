import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFAUserId, setTwoFAUserId] = useState(null);
    const [twoFAToken, setTwoFAToken] = useState('');
    const { login, verify2FA } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // If the instance has not been configured yet, redirect to Setup Wizard
        api.get('/setup/status')
            .then(res => {
                if (res.data?.isConfigured === false) {
                    navigate('/setup', { replace: true });
                }
            })
            .catch(() => {});
    }, [navigate]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await login(email, password);

            if (result.requires2FA) {
                setRequires2FA(true);
                setTwoFAUserId(result.userId);
                toast.success('Please enter your 2FA code');
                setIsLoading(false);
                return;
            }

            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            if (err.message && !err.response) {
                toast.error(err.message);
                return;
            }

            const status = err.response?.status;
            const msg = err.response?.data?.message;

            if (status === 401) {
                toast.error(msg || 'Incorrect email or password. Please try again.');
            } else if (msg) {
                toast.error(msg);
            } else {
                toast.error('Unable to connect to server. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        if (!twoFAToken.trim()) {
            toast.error('Please enter your 2FA code');
            return;
        }
        setIsLoading(true);
        try {
            await verify2FA(twoFAUserId, twoFAToken.trim());
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            const msg = err.response?.data?.message;
            toast.error(msg || 'Invalid 2FA code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <a
                        href="https://wcrm.si"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mb-3 hover:opacity-90 transition-opacity"
                        title="Wcrm — WhatsApp CRM (wcrm.si)"
                    >
                        <img
                            src="/wcrm-logo-for-dark-bg.png"
                            alt="Wcrm"
                            className="h-12 sm:h-14 w-auto mx-auto object-contain"
                        />
                    </a>
                    <p className="text-slate-400 mt-2 font-medium">
                        {requires2FA ? 'Two-Factor Authentication' : 'Sign in to your account'}
                    </p>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {requires2FA ? (
                        <form onSubmit={handle2FASubmit} className="space-y-5">
                            <div className="text-center mb-4">
                                <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-400">Enter the 6-digit code from your authenticator app</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Authentication Code
                                </label>
                                <input
                                    id="2fa-token"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    required
                                    autoFocus
                                    value={twoFAToken}
                                    onChange={(e) => setTwoFAToken(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="000000"
                                />
                            </div>

                            <button
                                id="2fa-submit"
                                type="submit"
                                disabled={isLoading || twoFAToken.length !== 6}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Verifying...
                                    </span>
                                ) : (
                                    'Verify & Sign In'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setRequires2FA(false); setTwoFAToken(''); setTwoFAUserId(null); }}
                                className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
                            >
                                &larr; Back to Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="admin@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-1">
                                    <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                                        Forgot your password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                id="login-submit"
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <div className="text-center mt-4">
                    <a
                        href="/setup"
                        className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                    >
                        First-time install? <span className="underline font-semibold text-emerald-400">Run Setup Wizard</span>
                    </a>
                </div>

                <div className="text-center mt-4 text-xs text-slate-500">
                    <a
                        href="https://wcrm.si"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                    >
                        Powered by <span className="font-semibold text-slate-300">Wcrm</span> — Open-Source WhatsApp CRM
                    </a>
                </div>
            </div>
        </div>
    );
}
