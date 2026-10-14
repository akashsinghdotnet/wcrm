import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Lock, Building2, Shield, Eye, EyeOff, Mail, Users, IndianRupee, FileText, MessageCircle, Plug, Phone, GitBranch, CreditCard, X, Sparkles } from 'lucide-react';
import { useModules } from '../context/ModuleContext';
import EmailSettings from '../components/EmailSettings';
import TeamSettings from '../components/TeamSettings';
import WhatsAppSettings from '../components/WhatsAppSettings';
import CallingSettings from '../components/CallingSettings';
import LeadAssignmentSettings from '../components/LeadAssignmentSettings';
import EmailTemplates from '../components/EmailTemplates';
import IntegrationsPage from './IntegrationsPage';
import CompanyPaymentSettings from '../components/CompanyPaymentSettings';
import CommunitySettingsCard from '../components/CommunitySettingsCard';

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const { config } = useConfig();
    const isSelfHosted = config?.deployment_mode === 'self_hosted';
    const { hasModule } = useModules();
    const location = useLocation();
    const navigate = useNavigate();

    if (loading) {
        return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading settings...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Please log in to view settings.</div>;
    }
    const [userForm, setUserForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });
    const [showEmailVerify, setShowEmailVerify] = useState(false);
    const [emailOtp, setEmailOtp] = useState('');
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    
    const [twoFactorData, setTwoFactorData] = useState(null);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setUserForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/users/${user.id}`, {
                firstName: userForm.firstName,
                lastName: userForm.lastName,
                phone: userForm.phone,
            });
            
            if (userForm.email !== user.email) {
                await api.post('/users/me/email/request', { newEmail: userForm.email });
                setShowEmailVerify(true);
                toast.success('Verification code sent to your new email.');
            } else {
                toast.success('Profile updated');
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        }
    };

    const handleEmailVerify = async (e) => {
        e.preventDefault();
        setVerifyingEmail(true);
        try {
            await api.post('/users/me/email/verify', { otp: emailOtp });
            toast.success('Email updated successfully!');
            setShowEmailVerify(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid verification code');
        } finally {
            setVerifyingEmail(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            await api.post('/users/me/email/request', { newEmail: userForm.email });
            toast.success('A new verification code has been sent.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resend code');
        }
    };


    const enableTwoFactor = async () => {
        try {
            const res = await api.post('/auth/2fa/generate');
            setTwoFactorData(res.data);
            setShowTwoFactorSetup(true);
        } catch (err) {
            toast.error('Failed to start 2FA setup');
        }
    };

    const verifyAndEnableTwoFactor = async () => {
        try {
            await api.post('/auth/2fa/enable', { token: twoFactorToken });
            toast.success('Two-factor authentication enabled');
            setShowTwoFactorSetup(false);
            setTwoFactorData(null);
            setTwoFactorToken('');
            //Ideally update user context
            window.location.reload();
        } catch (err) {
            toast.error('Invalid token');
        }
    };

    const disableTwoFactor = async () => {
        if (!window.confirm('Are you sure you want to disable 2FA?')) return;
        try {
            await api.post('/auth/2fa/disable');
            toast.success('Two-factor authentication disabled');
            window.location.reload();
        } catch (err) {
            toast.error('Failed to disable 2FA');
        }
    };
    const [whatsappEnabled, setWhatsappEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setSaving(true);
        try {
            await api.patch('/users/me/password', { oldPassword, newPassword });
            toast.success('Password changed successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) setActiveTab(tab);
    }, [location.search]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        navigate(`/settings?tab=${tabId}`, { replace: true });
    };

    const roleLabel = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        staff: 'Staff',
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-800 flex gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide pb-2">
                {[
                    { id: 'general', label: 'General', icon: User },
                    { id: 'security', label: 'Security', icon: Lock },
                    { id: 'community', label: 'Community & Cloud', icon: Sparkles },
                    ...(['admin', 'manager'].includes(user.role) ? [{ id: 'team', label: 'Team', icon: Users }] : []),
                    ...(user.role === 'admin' ? [{ id: 'whatsapp', label: 'WhatsApp Integration', icon: MessageCircle }] : []),
                    ...(['admin', 'manager'].includes(user.role) && hasModule('SALES') ? [{ id: 'lead-assignment', label: 'Lead Assignment', icon: GitBranch }] : []),
                    ...(user.role === 'admin' ? [{ id: 'calling', label: 'Calling', icon: Phone }] : []),
                    ...(user.role === 'admin' ? [
                        { id: 'email', label: 'Email Settings', icon: Mail },
                        { id: 'email-templates', label: 'Email Templates', icon: FileText }
                    ] : [])
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4 shrink-0" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        {/* General System Settings - Super Admin Only */}
                        {user.role === 'super_admin' && (
                            <GeneralSystemSettings />
                        )}

                        <div className={`grid grid-cols-1 ${user.role === 'admin' ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>
                            {/* Profile Section */}
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h3>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">First Name</label>
                                        <input
                                            type="text"
                                            value={userForm.firstName}
                                            onChange={e => setUserForm({ ...userForm, firstName: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Last Name</label>
                                        <input
                                            type="text"
                                            value={userForm.lastName}
                                            onChange={e => setUserForm({ ...userForm, lastName: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Email</label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Phone</label>
                                        <input
                                            type="tel"
                                            value={userForm.phone}
                                            onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
                                        Save Changes
                                    </button>
                                </div>
                            </form>

                            {showEmailVerify && (
                                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-slate-800">
                                        <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verify New Email</h3>
                                            <button onClick={() => setShowEmailVerify(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-slate-300">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleEmailVerify} className="p-6 space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                                                    Enter the 6-digit code sent to <span className="text-indigo-500 font-semibold">{userForm.email}</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={emailOtp}
                                                    onChange={e => setEmailOtp(e.target.value)}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center tracking-[0.5em] text-lg font-bold"
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    required
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEmailVerify(false)}
                                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={verifyingEmail || emailOtp.length !== 6}
                                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {verifyingEmail ? 'Verifying...' : 'Verify'}
                                                </button>
                                            </div>
                                            <div className="text-center mt-4">
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                                                >
                                                    Didn't receive the code? Resend
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Company Section - For Admin */}
                        {user.role === 'admin' && (
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company Details</h3>
                                </div>
                                <CompanyForm companyId={user.companyId} />
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* 2FA Section */}
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-cyan-600/20 rounded-xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-cyan-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-slate-300">
                                        {user.isTwoFactorEnabled ? 'Two-factor authentication is enabled.' : 'Add an extra layer of security to your account.'}
                                    </p>
                                </div>
                                {!user.isTwoFactorEnabled ? (
                                    <button
                                        onClick={enableTwoFactor}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Enable 2FA
                                    </button>
                                ) : (
                                    <button
                                        onClick={disableTwoFactor}
                                        className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Disable 2FA
                                    </button>
                                )}
                            </div>

                            {showTwoFactorSetup && twoFactorData && (
                                <div className="mt-4 p-4 border border-gray-300 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800/50">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Setup 2FA</h4>
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-white p-2 rounded-lg">
                                            <img src={twoFactorData.qrCode} alt="2FA QR Code" className="w-32 h-32" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Scan this QR code with your authenticator app</p>
                                            <p className="text-xs font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded text-gray-600 dark:text-slate-300">
                                                Secret: {twoFactorData.secret}
                                            </p>
                                        </div>
                                        <div className="w-full max-w-xs space-y-2">
                                            <input
                                                type="text"
                                                placeholder="Enter 6-digit code"
                                                value={twoFactorToken}
                                                onChange={e => setTwoFactorToken(e.target.value)}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-center tracking-widest outline-none focus:border-indigo-500"
                                                maxLength={6}
                                            />
                                            <button
                                                onClick={verifyAndEnableTwoFactor}
                                                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Verify & Enable
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
                            </div>

                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showOld ? 'text' : 'password'}
                                            required
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOld(!showOld)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white cursor-pointer"
                                        >
                                            {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white cursor-pointer"
                                        >
                                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Confirm new password"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25 cursor-pointer"
                                >
                                    {saving ? 'Changing...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'integrations' && user.role === 'admin' && (
                    <IntegrationsPage embedded />
                )}

                {activeTab === 'email' && user.role === 'admin' && (
                    <div>
                        <EmailSettings />
                    </div>
                )}

                {activeTab === 'email-templates' && user.role === 'admin' && (
                    <EmailTemplates />
                )}

                {activeTab === 'community' && (
                    <CommunitySettingsCard config={config} />
                )}

                {activeTab === 'team' && (
                    <TeamSettings />
                )}

                {activeTab === 'whatsapp' && user.role === 'admin' && (
                    <WhatsAppSettings />
                )}

                {activeTab === 'lead-assignment' && ['admin', 'manager'].includes(user.role) && (
                    <LeadAssignmentSettings />
                )}

                {activeTab === 'calling' && user.role === 'admin' && (
                    <CallingSettings />
                )}

                {activeTab === 'payments' && user.role === 'admin' && (
                    <CompanyPaymentSettings />
                )}
            </div>
        </div>
    );
}


function CompanyForm({ companyId }) {
    const [form, setForm] = useState({
        companyName: '',
        address: '',
        gstNo: '',
        logoUrl: '',
        phone: '',
        email: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!companyId) return;
        api.get(`/companies/${companyId}`).then((res) => {
            setForm({
                companyName: res.data.companyName || '',
                address: res.data.address || '',
                gstNo: res.data.gstNo || '',
                logoUrl: res.data.logoUrl || '',
                phone: res.data.phone || '',
                email: res.data.email || '',
            });
            setLoading(false);
        }).catch(() => {
            setLoading(false);
            toast.error('Failed to load company details');
        });
    }, [companyId]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/companies/${companyId}`, form);
            toast.success('Company details updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update company');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-gray-400 dark:text-slate-500 text-sm">Loading company details...</div>;

    return (
        <form onSubmit={handleSave} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Company Name</label>
                <input
                    value={form.companyName}
                    readOnly
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-400 cursor-not-allowed"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Address</label>
                    <input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="123 Business St, City"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">GST No</label>
                    <input
                        value={form.gstNo}
                        onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="GSTIN12345"
                    />
                </div>
            </div>
            <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
                {saving ? 'Saving...' : 'Save Company Details'}
            </button>
        </form>
    );
}

function GeneralSystemSettings() {
    const { config, updateConfig } = useConfig();
    const [saving, setSaving] = useState(false);

    // Login Settings
    const [loginLogoUrl, setLoginLogoUrl] = useState('');
    const [loginLogoLightUrl, setLoginLogoLightUrl] = useState('');
    const [loginLogoWidth, setLoginLogoWidth] = useState('150');
    const [loginShowText, setLoginShowText] = useState(true);
    const [loginText, setLoginText] = useState('Wcrm');
    const [loginLogoLink, setLoginLogoLink] = useState('');

    // Sidebar Settings
    const [sidebarLogoUrl, setSidebarLogoUrl] = useState('');
    const [sidebarLogoLightUrl, setSidebarLogoLightUrl] = useState('');
    const [sidebarLogoWidth, setSidebarLogoWidth] = useState('40');
    const [sidebarShowText, setSidebarShowText] = useState(true);
    const [sidebarText, setSidebarText] = useState('Wcrm');
    const [sidebarPaddingY, setSidebarPaddingY] = useState('24'); // Default 24px (p-6)
    const [sidebarLogoLink, setSidebarLogoLink] = useState('');

    // Favicon Settings
    const [faviconUrl, setFaviconUrl] = useState('');

    // Billing Settings
    const [upgradePlanUrl, setUpgradePlanUrl] = useState('');

    useEffect(() => {
        // Initialize with existing values or defaults
        if (config.login_logo_url !== undefined) setLoginLogoUrl(config.login_logo_url);
        else if (config.app_logo) setLoginLogoUrl(config.app_logo); // Fallback

        if (config.login_logo_light_url !== undefined) setLoginLogoLightUrl(config.login_logo_light_url);

        if (config.login_logo_width) setLoginLogoWidth(config.login_logo_width);
        if (config.login_show_text !== undefined) setLoginShowText(config.login_show_text === 'true');
        if (config.login_text_content) setLoginText(config.login_text_content);
        if (config.login_logo_link) setLoginLogoLink(config.login_logo_link);

        if (config.sidebar_logo_url !== undefined) setSidebarLogoUrl(config.sidebar_logo_url);
        else if (config.app_logo) setSidebarLogoUrl(config.app_logo); // Fallback

        if (config.sidebar_logo_light_url !== undefined) setSidebarLogoLightUrl(config.sidebar_logo_light_url);

        if (config.sidebar_logo_width) setSidebarLogoWidth(config.sidebar_logo_width);
        if (config.sidebar_show_text !== undefined) setSidebarShowText(config.sidebar_show_text === 'true');
        if (config.sidebar_text_content) setSidebarText(config.sidebar_text_content);
        if (config.sidebar_padding_vertical) setSidebarPaddingY(config.sidebar_padding_vertical);
        if (config.sidebar_logo_link) setSidebarLogoLink(config.sidebar_logo_link);

        if (config.favicon_url !== undefined) setFaviconUrl(config.favicon_url);
        if (config.upgrade_plan_url !== undefined) setUpgradePlanUrl(config.upgrade_plan_url);

    }, [config]);

    const handleLogoUpload = (e, type) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            if (type === 'login') {
                setLoginLogoUrl(base64String);
            } else if (type === 'login-light') {
                setLoginLogoLightUrl(base64String);
            } else if (type === 'sidebar') {
                setSidebarLogoUrl(base64String);
            } else if (type === 'sidebar-light') {
                setSidebarLogoLightUrl(base64String);
            } else if (type === 'favicon') {
                setFaviconUrl(base64String);
            }
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')} logo uploaded. Click Save to apply changes.`);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updates = {
                login_logo_url: loginLogoUrl,
                login_logo_light_url: loginLogoLightUrl,
                login_logo_width: loginLogoWidth,
                login_show_text: String(loginShowText),
                login_text_content: loginText,
                login_logo_link: loginLogoLink,
                sidebar_logo_url: sidebarLogoUrl,
                sidebar_logo_light_url: sidebarLogoLightUrl,
                sidebar_logo_width: sidebarLogoWidth,
                sidebar_show_text: String(sidebarShowText),
                sidebar_text_content: sidebarText,
                sidebar_padding_vertical: sidebarPaddingY,
                sidebar_logo_link: sidebarLogoLink,
                favicon_url: faviconUrl,
                upgrade_plan_url: upgradePlanUrl,
                // Keep app_logo synced with login logo for backward compatibility if needed, or just leave it
                app_logo: loginLogoUrl
            };

            for (const [key, value] of Object.entries(updates)) {
                await api.patch(`/settings/${key}`, { value, isPublic: true });
                updateConfig(key, value);
            }

            toast.success('System settings updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-200 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">General System Settings</h3>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Login Page Section */}
                <div className="space-y-4">
                    <h4 className="text-md font-medium text-indigo-400 uppercase tracking-wider text-xs">Login Page Customization</h4>

                    {/* Login Logo URL (Dark Mode) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Login Logo (Dark Mode)</label>
                        <div className="space-y-3">
                            <div className="flex gap-2 items-start">
                                <input
                                    value={loginLogoUrl}
                                    onChange={(e) => setLoginLogoUrl(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://example.com/logo.png or upload below"
                                />
                                {loginLogoUrl && (
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 flex items-center justify-center p-1">
                                        <img src={loginLogoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 text-center transition-colors">
                                        📤 Upload Dark Mode Logo (Max 2MB)
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleLogoUpload(e, 'login')}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Login Logo URL (Light Mode) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Login Logo (Light Mode)</label>
                        <div className="space-y-3">
                            <div className="flex gap-2 items-start">
                                <input
                                    value={loginLogoLightUrl}
                                    onChange={(e) => setLoginLogoLightUrl(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Optional: Alternate logo for light mode"
                                />
                                {loginLogoLightUrl && (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center p-1">
                                        <img src={loginLogoLightUrl} alt="Preview Light" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 text-center transition-colors">
                                        📤 Upload Light Mode Logo (Max 2MB)
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleLogoUpload(e, 'login-light')}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Login Logo Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Logo Link (Optional)</label>
                        <input
                            type="url"
                            value={loginLogoLink}
                            onChange={(e) => setLoginLogoLink(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://yourwebsite.com"
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Click on logo will redirect to this URL</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Login Logo Width */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Logo Width (px)</label>
                            <input
                                type="number"
                                value={loginLogoWidth}
                                onChange={(e) => setLoginLogoWidth(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {/* Login Text Content */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Brand Text</label>
                            <input
                                type="text"
                                value={loginText}
                                onChange={(e) => setLoginText(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Login Show Text Toggle */}
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-300 dark:border-slate-700">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Show Brand Text on Login Page</span>
                        <button
                            type="button"
                            onClick={() => setLoginShowText(!loginShowText)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${loginShowText ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${loginShowText ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-800 my-4"></div>

                {/* Sidebar Section */}
                <div className="space-y-4">
                    <h4 className="text-md font-medium text-indigo-400 uppercase tracking-wider text-xs">Sidebar Customization</h4>

                    {/* Sidebar Logo URL (Dark Mode) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Sidebar Logo (Dark Mode)</label>
                        <div className="space-y-3">
                            <div className="flex gap-2 items-start">
                                <input
                                    value={sidebarLogoUrl}
                                    onChange={(e) => setSidebarLogoUrl(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://example.com/logo-small.png or upload below"
                                />
                                {sidebarLogoUrl && (
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 flex items-center justify-center p-1">
                                        <img src={sidebarLogoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 text-center transition-colors">
                                        📤 Upload Dark Mode Logo (Max 2MB)
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleLogoUpload(e, 'sidebar')}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Logo URL (Light Mode) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Sidebar Logo (Light Mode)</label>
                        <div className="space-y-3">
                            <div className="flex gap-2 items-start">
                                <input
                                    value={sidebarLogoLightUrl}
                                    onChange={(e) => setSidebarLogoLightUrl(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Optional: Alternate logo for light mode"
                                />
                                {sidebarLogoLightUrl && (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center p-1">
                                        <img src={sidebarLogoLightUrl} alt="Preview Light" className="max-w-full max-h-full object-contain" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <div className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 text-center transition-colors">
                                        📤 Upload Light Mode Logo (Max 2MB)
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleLogoUpload(e, 'sidebar-light')}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Logo Link */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Logo Link (Optional)</label>
                        <input
                            type="url"
                            value={sidebarLogoLink}
                            onChange={(e) => setSidebarLogoLink(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://yourwebsite.com"
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Click on logo will redirect to this URL</p>
                    </div>

                    <div className="border-t border-gray-200 dark:border-slate-800 my-4"></div>

                    {/* Favicon Settings */}
                    <div className="space-y-4">
                        <h4 className="text-md font-medium text-indigo-400 uppercase tracking-wider text-xs">Favicon Customization</h4>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Website Favicon</label>
                            <div className="space-y-3">
                                <div className="flex gap-2 items-start">
                                    <input
                                        value={faviconUrl}
                                        onChange={(e) => setFaviconUrl(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="https://example.com/favicon.ico or upload below"
                                    />
                                    {faviconUrl && (
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700 flex items-center justify-center p-1">
                                            <img src={faviconUrl} alt="Favicon Preview" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <label className="flex-1 cursor-pointer">
                                        <div className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 text-center transition-colors">
                                            📤 Upload Favicon (Max 2MB)
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/x-icon,image/png,image/jpeg,image/svg+xml"
                                            onChange={(e) => handleLogoUpload(e, 'favicon')}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Sidebar Logo Width */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Logo Width (px)</label>
                            <input
                                type="number"
                                value={sidebarLogoWidth}
                                onChange={(e) => setSidebarLogoWidth(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {/* Sidebar Text Content */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Brand Text</label>
                            <input
                                type="text"
                                value={sidebarText}
                                onChange={(e) => setSidebarText(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {/* Sidebar Vertical Padding */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Vertical Padding (px)</label>
                            <input
                                type="number"
                                value={sidebarPaddingY}
                                onChange={(e) => setSidebarPaddingY(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. 24"
                            />
                        </div>
                    </div>

                    {/* Sidebar Show Text Toggle */}
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-300 dark:border-slate-700">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Show Brand Text in Sidebar</span>
                        <button
                            type="button"
                            onClick={() => setSidebarShowText(!sidebarShowText)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sidebarShowText ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sidebarShowText ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-800 my-4"></div>

                {/* Billing / Upgrade Link Section */}
                <div className="space-y-4">
                    <h4 className="text-md font-medium text-indigo-400 uppercase tracking-wider text-xs">Billing &amp; Upgrade</h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Upgrade Plan URL</label>
                        <input
                            type="url"
                            value={upgradePlanUrl}
                            onChange={(e) => setUpgradePlanUrl(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://yourwebsite.com/pricing"
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Company admins will see an &quot;Upgrade Plan&quot; button on their Subscription &amp; Invoices page that links to this URL. Leave blank to hide the button.</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/25"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
