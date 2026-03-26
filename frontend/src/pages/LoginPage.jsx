import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { Magnet, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage({ type = 'client' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFAUserId, setTwoFAUserId] = useState(null);
    const [twoFAToken, setTwoFAToken] = useState('');
    const { login, verify2FA, logout } = useAuth();
    const { config } = useConfig();
    const navigate = useNavigate();

    const isClientLogin = type === 'client';
    const pageTitle = isClientLogin ? 'Sign in to your account' : 'Admin Portal';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await login(email, password);

            // Check if 2FA is required
            if (result.requires2FA) {
                setRequires2FA(true);
                setTwoFAUserId(result.userId);
                toast.success('Please enter your 2FA code');
                setIsLoading(false);
                return;
            }

            // Role Enforcement
            const isSuperadminTeam = result.role === 'super_admin' ||
                result.role === 'superadmin_admin' ||
                result.role === 'superadmin_staff';

            if (type === 'admin' && !isSuperadminTeam) {
                logout(); // Logout immediately
                throw new Error('Access denied. Please use the client login.');
            }

            if (type === 'client' && isSuperadminTeam) {
                logout(); // Logout immediately
                throw new Error('Access denied. Please use the admin login.');
            }

            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message;

            // Show specific error messages based on status and message
            if (status === 401) {
                toast.error(msg || 'Incorrect email or password. Please try again.');
            } else if (status === 403) {
                toast.error(msg || 'Access denied. Please contact support.');
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
            const userData = await verify2FA(twoFAUserId, twoFAToken.trim());

            // Role Enforcement
            const isSuperadminTeam = userData.role === 'super_admin' ||
                userData.role === 'superadmin_admin' ||
                userData.role === 'superadmin_staff';

            if (type === 'admin' && !isSuperadminTeam) {
                logout();
                throw new Error('Access denied. Please use the client login.');
            }

            if (type === 'client' && isSuperadminTeam) {
                logout();
                throw new Error('Access denied. Please use the admin login.');
            }

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
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background gradient effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    {config?.login_logo_link ? (
                        <a href={config.login_logo_link} target="_blank" rel="noopener noreferrer" className="inline-block mb-4">
                            {((document.documentElement.classList.contains('light') ? config?.login_logo_light_url : config?.login_logo_url) || config?.login_logo_url || config?.app_logo) ? (
                                <img
                                    src={(document.documentElement.classList.contains('light') ? config?.login_logo_light_url : config?.login_logo_url) || config?.login_logo_url || config?.app_logo}
                                    alt="Logo"
                                    className="mx-auto object-contain hover:opacity-80 transition-opacity"
                                    style={{ width: config.login_logo_width ? `${config.login_logo_width}px` : '4rem', height: 'auto', maxHeight: '120px' }}
                                />
                            ) : (
                                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors">
                                    <Magnet className="w-8 h-8 text-white" />
                                </div>
                            )}
                        </a>
                    ) : (
                        <>
                            {((document.documentElement.classList.contains('light') ? config?.login_logo_light_url : config?.login_logo_url) || config?.login_logo_url || config?.app_logo) ? (
                                <img
                                    src={(document.documentElement.classList.contains('light') ? config?.login_logo_light_url : config?.login_logo_url) || config?.login_logo_url || config?.app_logo}
                                    alt="Logo"
                                    className="mx-auto mb-4 object-contain"
                                    style={{ width: config.login_logo_width ? `${config.login_logo_width}px` : '4rem', height: 'auto', maxHeight: '120px' }}
                                />
                            ) : (
                                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
                                    <Magnet className="w-8 h-8 text-white" />
                                </div>
                            )}
                        </>
                    )}
                    {(config?.login_show_text === undefined || config?.login_show_text === 'true') && (
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{config?.login_text_content || 'MagnetCRM'}</h1>
                    )}
                    <p className="text-gray-500 dark:text-slate-400 mt-2">{requires2FA ? 'Two-Factor Authentication' : pageTitle}</p>
                </div>

                {/* Login Card */}
                <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {requires2FA ? (
                        /* 2FA Verification Form */
                        <form onSubmit={handle2FASubmit} className="space-y-5">
                            <div className="text-center mb-4">
                                <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Enter the 6-digit code from your authenticator app</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">
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
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="000000"
                                />
                            </div>

                            <button
                                id="2fa-submit"
                                type="submit"
                                disabled={isLoading || twoFAToken.length !== 6}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.98]"
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
                                className="w-full py-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white text-sm transition-colors"
                            >
                                ← Back to Login
                            </button>
                        </form>
                    ) : (
                        /* Normal Login Form */
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder={isClientLogin ? "user@example.com" : "admin@magnethq.com"}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-1">
                                    <a href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                        Forgot your password?
                                    </a>
                                </div>
                            </div>


                            <button
                                id="login-submit"
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.98]"
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
            </div>
        </div>
    );
}
