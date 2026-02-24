import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, ShieldCheck, ShieldAlert, User, Building2, Pencil, Trash2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

const roleConfig = {
    super_admin: { label: 'Super Admin', color: 'bg-red-500/20 text-red-400', icon: ShieldAlert },
    admin: { label: 'Admin', color: 'bg-indigo-500/20 text-indigo-400', icon: ShieldCheck },
    manager: { label: 'Manager', color: 'bg-purple-500/20 text-purple-400', icon: Briefcase },
    staff: { label: 'Employee', color: 'bg-slate-600/20 text-slate-400', icon: User },
};

export default function TeamSettings() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(searchParams.get('companyId') || user.companyId);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ email: '', password: '', role: 'staff', canCreateInvoices: false });

    const isSuperAdmin = user.role === 'super_admin';
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    const plan = selectedCompany?.plan;
    const activeUsers = users.filter(u => u.isActive);
    const adminCount = activeUsers.filter(u => u.role === 'admin').length;
    const staffCount = activeUsers.filter(u => u.role === 'staff' || u.role === 'manager').length;
    const adminLimitReached = plan && adminCount >= plan.adminLimit;
    const staffLimitReached = plan && staffCount >= plan.employeeLimit;

    useEffect(() => {
        if (isSuperAdmin) {
            // For Super Admin view, only load other super admins, ignore companies
            loadSuperAdmins();
        } else if (selectedCompanyId) {
            loadUsers(selectedCompanyId);
        }
    }, [isSuperAdmin, selectedCompanyId]);

    const loadSuperAdmins = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users?role=super_admin');
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to load super admins');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async (companyId) => {
        setLoading(true);
        try {
            const res = await api.get(`/users?companyId=${companyId}`);
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };

            if (editingUser) {
                // Update logic
                if (!payload.password) delete payload.password;
                delete payload.companyId;
                delete payload.email; // Usually don't allow email change or handle backend unique check

                await api.patch(`/users/${editingUser.id}`, payload);
                toast.success('User updated');
            } else {
                // Create logic
                if (isSuperAdmin) {
                    if (payload.role !== 'super_admin') {
                        // Allow
                    }
                    if (payload.role === 'super_admin') {
                        delete payload.companyId;
                    }
                } else {
                    payload.companyId = selectedCompanyId;
                }

                await api.post('/users', payload);
                toast.success('User created');
            }

            setShowModal(false);
            setForm({ email: '', password: '', role: isSuperAdmin ? 'super_admin' : 'staff', canCreateInvoices: false });
            setEditingUser(null);

            if (isSuperAdmin) {
                loadSuperAdmins();
            } else {
                loadUsers(selectedCompanyId);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
        }
    };

    const handleEdit = (u) => {
        setEditingUser(u);
        setForm({
            name: u.name || '',
            phone: u.phone || '',
            email: u.email,
            password: '', // Blank implies no change
            role: u.role,
            canCreateInvoices: u.canCreateInvoices || false
        });
        setShowModal(true);
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/users/${userId}`);
            toast.success('User deleted');
            if (isSuperAdmin) {
                loadSuperAdmins();
            } else {
                loadUsers(selectedCompanyId);
            }
        } catch (err) {
            toast.error('Failed to delete user');
        }
    };

    const toggleActive = async (userId, currentStatus) => {
        try {
            if (currentStatus) {
                await api.patch(`/users/${userId}/deactivate`);
                toast.success('User deactivated');
            } else {
                await api.patch(`/users/${userId}`, { isActive: true });
                toast.success('User activated');
            }
            if (isSuperAdmin) {
                loadSuperAdmins();
            } else {
                loadUsers(selectedCompanyId);
            }
        } catch (err) {
            toast.error('Failed to update user');
        }
    };

    if (loading && !users.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        {isSuperAdmin ? 'Administrators' : 'Users'}
                    </h2>
                    <p className="text-slate-400 mt-1">
                        {isSuperAdmin
                            ? 'Manage system administrators with full access.'
                            : `${users.length} team members`
                        }
                        {!isSuperAdmin && plan && (
                            <span className="text-xs ml-2 text-slate-500">
                                ({adminCount}/{plan.adminLimit} admins · {staffCount}/{plan.employeeLimit} employees)
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        id="add-user-btn"
                        onClick={() => {
                            setEditingUser(null);
                            setForm({ email: '', password: '', role: isSuperAdmin ? 'super_admin' : 'staff', canCreateInvoices: false });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                    >
                        <Plus className="w-4 h-4" />
                        {isSuperAdmin ? 'Add Admin' : 'Add User'}
                    </button>
                </div>
            </div>

            {/* User grid */}
            {
                !loading && users.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No users found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map((u) => {
                            const role = roleConfig[u.role] || roleConfig.staff;
                            const RoleIcon = role.icon;
                            return (
                                <div
                                    key={u.id}
                                    className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700 ${!u.isActive ? 'opacity-60' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                            <span className="text-lg font-bold text-indigo-400">
                                                {u.email?.[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${role.color}`}>
                                            <span className="flex items-center gap-1">
                                                <RoleIcon className="w-3 h-3" />
                                                {role.label}
                                            </span>
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-white truncate">{u.email}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Joined {new Date(u.createdAt).toLocaleDateString('en-IN')}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {u.isActive ? '● Active' : '● Inactive'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {u.id !== user.id && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(u)}
                                                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                                        title="Edit User"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActive(u.id, u.isActive)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${u.isActive
                                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        <ShieldCheck className="w-3 h-3" />
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button
                                                            onClick={() => handleDelete(u.id)}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                                <h3 className="text-lg font-semibold text-white">
                                    {editingUser ? 'Edit User' : (isSuperAdmin ? 'New System Admin' : 'New Team Member')}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        value={form.name || ''}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone (Optional)</label>
                                    <input
                                        type="tel"
                                        value={form.phone || ''}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder={isSuperAdmin && form.role === 'super_admin' ? "admin@magnethq.com" : "staff@magnethq.com"}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Password *</label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        minLength={6}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder={editingUser ? "Leave blank to keep current" : "Min 6 characters"}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Employee</option>
                                    </select>
                                </div>

                                {form.role === 'staff' && !isSuperAdmin && (
                                    <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                                        <div className="flex items-center h-5 mt-0.5">
                                            <input
                                                id="canCreateInvoices"
                                                type="checkbox"
                                                checked={form.canCreateInvoices}
                                                onChange={(e) => setForm({ ...form, canCreateInvoices: e.target.checked })}
                                                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="canCreateInvoices" className="text-sm font-medium text-white cursor-pointer">
                                                Invoice Management Access
                                            </label>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Allow this employee to create, edit, and manage company invoices.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isSuperAdmin && (
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                        <p className="text-xs text-indigo-400 font-medium">
                                            ℹ️ This user will have full access to all system settings and companies.
                                        </p>
                                    </div>
                                )}

                                {/* Seat limit warning - Only for company users */}
                                {!isSuperAdmin && plan && (
                                    (form.role === 'admin' && adminLimitReached) ||
                                    ((form.role === 'staff' || form.role === 'manager') && staffLimitReached)
                                ) && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                            <p className="text-xs text-red-400 font-medium">
                                                ⚠️ {form.role === 'admin' ? 'Admin' : 'Employee/Manager'} seat limit reached ({form.role === 'admin' ? `${adminCount}/${plan.adminLimit}` : `${staffCount}/${plan.employeeLimit}`}). Upgrade the company's plan to add more.
                                            </p>
                                        </div>
                                    )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-all font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isSuperAdmin && plan && ((form.role === 'admin' && adminLimitReached) || (form.role === 'staff' && staffLimitReached))}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
                                    >
                                        {editingUser ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
