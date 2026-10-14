import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, ShieldCheck, User, Pencil, Trash2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

const roleConfig = {
    admin: { label: 'Admin', color: 'bg-indigo-500/20 text-indigo-400', icon: ShieldCheck },
    manager: { label: 'Manager', color: 'bg-emerald-500/20 text-emerald-400', icon: Briefcase },
    staff: { label: 'Employee', color: 'bg-slate-600/20 text-gray-500 dark:text-slate-400', icon: User },
};

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const isAdmin = user.role === 'admin';

    useEffect(() => {
        if (user.companyId) {
            loadUsers(user.companyId);
        }
    }, [user.companyId]);

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
                delete payload.email;

                await api.patch(`/users/${editingUser.id}`, payload);
                toast.success('User updated');
            } else {
                // Create logic
                payload.companyId = user.companyId;

                await api.post('/users', payload);
                toast.success('User created');
            }

            setShowModal(false);
            setForm({ email: '', password: '', role: 'staff' });
            setEditingUser(null);
            loadUsers(user.companyId);
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
            role: u.role
        });
        setShowModal(true);
    };

    const confirmDelete = (u) => {
        setUserToDelete(u);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        try {
            await api.delete(`/users/${userToDelete.id}`);
            toast.success('User deleted');
            setShowDeleteModal(false);
            setUserToDelete(null);
            loadUsers(user.companyId);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
            setShowDeleteModal(false);
            setUserToDelete(null);
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
            loadUsers(user.companyId);
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Users
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">
                        {users.length} team members
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        id="add-user-btn"
                        onClick={() => {
                            setEditingUser(null);
                            setForm({ email: '', password: '', role: 'staff' });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>
            </div>

            {/* User grid */}
            {
                !loading && users.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-slate-400">No users found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map((u) => {
                            const role = roleConfig[u.role] || roleConfig.staff;
                            const RoleIcon = role.icon;
                            return (
                                <div
                                    key={u.id}
                                    className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:border-gray-300 dark:border-slate-700 ${!u.isActive ? 'opacity-60' : ''
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
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.email}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                        Joined {new Date(u.createdAt).toLocaleDateString('en-IN')}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {u.isActive ? '● Active' : '● Inactive'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                                title="Edit User"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {u.id !== user.id && (
                                                <>
                                                    <button
                                                        onClick={() => toggleActive(u.id, u.isActive)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${u.isActive
                                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                            : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-600'
                                                            }`}
                                                    >
                                                        <ShieldCheck className="w-3 h-3" />
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                    {/* Delete: admin can delete manager + staff; manager can delete staff */}
                                                    {(
                                                        (user.role === 'admin' && (u.role === 'manager' || u.role === 'staff'))
                                                        || (user.role === 'manager' && u.role === 'staff')
                                                    ) && (
                                                        <button
                                                            onClick={() => confirmDelete(u)}
                                                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
                        <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {editingUser ? 'Edit User' : 'New Team Member'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        value={form.name || ''}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Phone (Optional)</label>
                                    <input
                                        type="tel"
                                        value={form.phone || ''}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="staff@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Password *</label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        minLength={6}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder={editingUser ? "Leave blank to keep current" : "Min 6 characters"}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="staff">Employee</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-600/25"
                                    >
                                        {editingUser ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete User</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                                Are you sure you want to permanently delete <span className="text-gray-900 dark:text-white font-medium">{userToDelete.email}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                                className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
