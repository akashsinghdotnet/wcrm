import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
            toast.success('Reset link sent!');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl transform -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl transform translate-y-1/2"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <Mail className="w-8 h-8 text-indigo-400" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
                    <p className="text-slate-400">
                        No worries, we'll send you reset instructions.
                    </p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-xl">
                    {submitted ? (
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="p-3 bg-emerald-500/10 rounded-full">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold text-white">Check your email</h3>
                                <p className="text-slate-400 text-sm">
                                    We've sent a password reset link to <br />
                                    <span className="text-white font-medium">{email}</span>
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                    Back to log in
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-slate-300">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-10 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                        placeholder="Enter your email"
                                    />
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
                                        Sending...
                                    </>
                                ) : (
                                    'Send Reset Link'
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
