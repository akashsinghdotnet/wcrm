import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwords.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                token,
                newPassword: passwords.newPassword
            });
            setSuccess(true);
            toast.success('Password reset successfully');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md w-full">
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-full inline-block mb-4">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
                    <p className="text-slate-400 mb-6">This password reset link is invalid or missing a token.</p>
                    <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300">
                        Request a new link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl transform translate-y-1/2"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <Lock className="w-8 h-8 text-indigo-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
                    <p className="text-slate-400">
                        Enter your new password below.
                    </p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
                    {success ? (
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="p-3 bg-emerald-500/10 rounded-full">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-white">Password Reset Complete</h3>
                                <p className="text-slate-400 text-sm">
                                    Your password has been successfully updated. <br />
                                    Redirecting to login...
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 px-4 font-medium transition-colors inline-block"
                                >
                                    Login Now
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">New Password</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={passwords.newPassword}
                                            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all pr-12"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={passwords.confirmPassword}
                                            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-medium transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                    Back to log in
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
