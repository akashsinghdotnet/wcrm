import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Building2, User, Plus, Trash2, Mail, Phone, MapPin, Calendar, CreditCard, ShieldCheck, ShieldAlert, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyForm from '../components/CompanyForm';

export default function CompanyDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [users, setUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [userForm, setUserForm] = useState({ email: '', password: '', role: 'staff' });
    const [editForm, setEditForm] = useState({
        companyName: '', email: '', phone: '', address: '',
        planId: '', subscriptionStatus: 'active', subscriptionPeriod: 'monthly', renewalDate: ''
    });
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailForm, setEmailForm] = useState({ subject: '', body: '' });
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [companyRes, usersRes, plansRes] = await Promise.all([
                api.get(`/companies/${id}`),
                api.get(`/users?companyId=${id}`),
                api.get('/plans')
            ]);
            setCompany(companyRes.data);
            setUsers(usersRes.data);
            setPlans(plansRes.data);
        } catch (err) {
            toast.error('Failed to load company details');
            navigate('/companies');
        } finally {
            setLoading(false);
        }
    };

    const openEdit = () => {
        setEditForm({
            companyName: company.companyName || '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            planId: company.planId || '',
            subscriptionStatus: company.subscriptionStatus || 'active',
            subscriptionPeriod: company.subscriptionPeriod || 'monthly',
            renewalDate: company.renewalDate ? company.renewalDate.split('T')[0] : '',
        });
        setShowEditModal(true);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...editForm };
            if (!payload.planId) payload.planId = null;
            if (!payload.renewalDate) delete payload.renewalDate;
            const res = await api.patch(`/companies/${id}`, payload);
            setCompany(res.data);
            toast.success('Company updated');
            setShowEditModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update company');
        }
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        if (!company.email) {
            toast.error('Company has no email address');
            return;
        }
        setSendingEmail(true);
        try {
            await api.post('/email/send', {
                to: company.email,
                subject: emailForm.subject,
                html: emailForm.body.replace(/\n/g, '<br>'), // Simple newline to BR conversion
            });
            toast.success('Email sent successfully');
            setShowEmailModal(false);
            setEmailForm({ subject: '', body: '' });
        } catch (err) {
            toast.error('Failed to send email');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', {
                ...userForm,
                companyId: id
            });
            toast.success('User created');
            setShowUserModal(false);
            setUserForm({ email: '', password: '', role: 'staff' });
            // Reload users
            const res = await api.get(`/users?companyId=${id}`);
            setUsers(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create user');
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            if (currentStatus) {
                await api.patch(`/users/${userId}/deactivate`);
                toast.success('User deactivated');
            } else {
                await api.patch(`/users/${userId}`, { isActive: true });
                toast.success('User activated');
            }
            const res = await api.get(`/users?companyId=${id}`);
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to update user status');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/users/${userId}`);
            toast.success('User deleted');
            const res = await api.get(`/users?companyId=${id}`);
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to delete user');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!company) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => navigate('/companies')}
                    className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Companies
                </button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                            <Building2 className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">{company.companyName}</h1>
                            <div className="flex items-center gap-3 text-sm">
                                <span className={`px-2.5 py-0.5 rounded-full font-medium ${company.subscriptionStatus === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {company.subscriptionStatus}
                                </span>
                                <span className="text-slate-400 flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    {company.plan?.name || 'No Plan'} ({company.subscriptionPeriod})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-800">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Overview
                        {activeTab === 'overview' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Team Members
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded-full text-xs">
                            {users.length}
                        </span>
                        {activeTab === 'users' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'overview' ? (
                <div className="space-y-6">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowEmailModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                        >
                            <Send className="w-4 h-4" />
                            Send Email
                        </button>
                        <button
                            onClick={openEdit}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-all border border-slate-700"
                        >
                            <Building2 className="w-4 h-4" />
                            Edit Company Details
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-slate-300">
                                    <Mail className="w-5 h-5 text-slate-500" />
                                    {company.email || 'No email provided'}
                                </div>
                                <div className="flex items-center gap-3 text-slate-300">
                                    <Phone className="w-5 h-5 text-slate-500" />
                                    {company.phone || 'No phone provided'}
                                </div>
                                <div className="flex items-start gap-3 text-slate-300">
                                    <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                                    {company.address || 'No address provided'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Subscription Details</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                    <span className="text-slate-400">Current Plan</span>
                                    <span className="text-white font-medium">{company.plan?.name || 'None'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                    <span className="text-slate-400">Billing Cycle</span>
                                    <span className="text-white capitalize">{company.subscriptionPeriod}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                    <span className="text-slate-400">Renewal Date</span>
                                    <span className="text-white">
                                        {company.renewalDate ? new Date(company.renewalDate).toLocaleDateString('en-IN') : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-400">Limits</span>
                                    <span className="text-white text-sm">
                                        {company.plan ? `${company.plan.adminLimit} Admins, ${company.plan.employeeLimit} Staff` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowUserModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                        >
                            <Plus className="w-4 h-4" />
                            Add User
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map(user => (
                            <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                                            {user.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium truncate max-w-[150px]" title={user.email}>
                                                {user.email}
                                            </p>
                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${user.role === 'admin'
                                                ? 'bg-purple-500/10 text-purple-400'
                                                : 'bg-slate-700/50 text-slate-400'
                                                }`}>
                                                {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                {user.role === 'admin' ? 'Admin' : 'Staff'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                    <span className="text-xs text-slate-500">
                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                    </span>
                                    <button
                                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                                        className={`text-xs px-2 py-1 rounded transition-colors ${user.isActive
                                            ? 'text-red-400 hover:bg-red-500/10'
                                            : 'text-emerald-400 hover:bg-emerald-500/10'
                                            }`}
                                    >
                                        {user.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-xs px-2 py-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-white">Add Team Member</h3>
                            <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white">
                                <Trash2 className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={userForm.name || ''}
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={userForm.phone || ''}
                                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={userForm.email}
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={userForm.password}
                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                                <select
                                    value={userForm.role}
                                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="staff">Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Company Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-lg font-semibold text-white">Edit Company Details</h3>
                        </div>
                        <CompanyForm
                            form={editForm}
                            setForm={setEditForm}
                            plans={plans}
                            onSubmit={handleEdit}
                            isEdit={true}
                            onCancel={() => setShowEditModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Send Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-white">Send Email</h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-white">
                                <Trash2 className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSendEmail} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">To</label>
                                <input
                                    type="email"
                                    value={company.email}
                                    readOnly
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                                <input
                                    type="text"
                                    required
                                    value={emailForm.subject}
                                    onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter subject..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                                <textarea
                                    required
                                    rows={6}
                                    value={emailForm.body}
                                    onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    placeholder="Type your message here..."
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={sendingEmail}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {sendingEmail ? 'Sending...' : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send Email
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
