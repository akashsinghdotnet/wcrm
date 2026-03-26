import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ClientDetailDrawer from '../components/ClientDetailDrawer';

const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-amber-500/20 text-amber-400',
    closed: 'bg-red-500/20 text-red-400',
};

const emptyForm = {
    clientName: '',
    phone: '',
    email: '',
    address: '',
    gstNo: '',
    serviceType: '',
    monthlyFee: '',
    status: 'active',
};

export default function ClientsPage() {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        loadClients();
    }, [page, limit]);

    const loadClients = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/clients?companyId=${user.companyId}&page=${page}&limit=${limit}`);
            if (res.data.data) {
                setClients(res.data.data);
                setTotal(res.data.total);
            } else {
                setClients(res.data);
                setTotal(res.data.length);
            }
        } catch (err) {
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (client) => {
        setForm({
            clientName: client.clientName,
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || '',
            gstNo: client.gstNo || '',
            serviceType: client.serviceType || '',
            monthlyFee: client.monthlyFee || '',
            status: client.status,
        });
        setEditingId(client.id);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                companyId: user.companyId,
                monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : 0,
            };

            if (editingId) {
                await api.patch(`/clients/${editingId}`, payload);
                toast.success('Client updated');
            } else {
                await api.post('/clients', payload);
                toast.success('Client created');
            }
            setShowModal(false);
            loadClients();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this client?')) return;
        try {
            await api.delete(`/clients/${id}`);
            toast.success('Client deleted');
            loadClients();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(clients.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} clients?`)) return;
        try {
            await api.delete('/clients/bulk', { data: { ids: selectedIds } });
            toast.success(`Deleted ${selectedIds.length} clients`);
            setSelectedIds([]);
            loadClients();
        } catch (err) {
            toast.error('Bulk delete failed');
        }
    };

    const handleBulkStatus = async (status) => {
        try {
            await api.patch('/clients/bulk', { ids: selectedIds, updates: { status } });
            toast.success('Clients updated');
            setSelectedIds([]);
            loadClients();
        } catch (err) {
            toast.error('Bulk update failed');
        }
    };

    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, total);

    if (loading && page === 1 && clients.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">{total} clients total</p>
                </div>
                <button
                    id="add-client-btn"
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Add Client
                </button>
            </div>

            {/* Clients Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-800">
                                <th className="w-12 px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={clients.length > 0 && selectedIds.length === clients.length}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Service</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Monthly Fee</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                            {clients.map((client) => (
                                <tr
                                    key={client.id}
                                    className={`hover:bg-gray-100 dark:bg-slate-800/40 transition-colors cursor-pointer ${selectedIds.includes(client.id) ? 'bg-gray-100 dark:bg-slate-800/60' : ''}`}
                                    onClick={() => setSelectedClient(client)}
                                >
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(client.id)}
                                            onChange={() => handleSelectOne(client.id)}
                                            className="rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{client.clientName}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{client.serviceType || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 font-mono">
                                        ₹{Number(client.monthlyFee).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[client.status]}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                                        {client.phone || client.email || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(client)}
                                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id)}
                                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                                        No clients found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Showing <span className="font-medium text-gray-900 dark:text-white">{startIdx}</span> to <span className="font-medium text-gray-900 dark:text-white">{endIdx}</span> of <span className="font-medium text-gray-900 dark:text-white">{total}</span> clients
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white disabled:opacity-50 disabled:hover:text-gray-500 dark:text-slate-400 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-sm text-gray-500 dark:text-slate-400">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white disabled:opacity-50 disabled:hover:text-gray-500 dark:text-slate-400 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl shadow-2xl p-4 flex items-center gap-4 z-40 animate-in slide-in-from-bottom-4">
                    <span className="text-gray-900 dark:text-white font-medium">{selectedIds.length} selected</span>
                    <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <select
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => handleBulkStatus(e.target.value)}
                            value=""
                        >
                            <option value="" disabled>Change Status</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="closed">Closed</option>
                        </select>
                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
                        <button
                            onClick={handleBulkDelete}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete Selected"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:bg-white dark:bg-slate-800 rounded-lg transition-colors"
                            title="Clear Selection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingId ? 'Edit Client' : 'New Client'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Client Name *</label>
                                <input
                                    id="client-name"
                                    required
                                    value={form.clientName}
                                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Acme Corp"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Address</label>
                                    <input
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="City, State"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">GST No</label>
                                    <input
                                        value={form.gstNo}
                                        onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="GSTIN..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Phone</label>
                                    <input
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="9876543210"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="client@example.com"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Service Type</label>
                                    <input
                                        value={form.serviceType}
                                        onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="SEO, Social Media"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Monthly Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={form.monthlyFee}
                                        onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="25000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="closed">Closed</option>
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
                                    {editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ClientDetailDrawer
                client={selectedClient}
                isOpen={!!selectedClient}
                onClose={() => setSelectedClient(null)}
                onUpdate={loadClients}
            />
        </div>
    );
}
