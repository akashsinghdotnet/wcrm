import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Receipt, Search, Filter, Eye, Pencil, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';

export default function InvoicesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deleting, setDeleting] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);

    // Access control
    if (user?.role === 'staff' && !user?.canCreateInvoices) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/billing');
            setInvoices(res.data);
        } catch (err) {
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (invoice) => {
        setInvoiceToDelete(invoice);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!invoiceToDelete) return;
        setDeleting(invoiceToDelete.id);
        try {
            await api.delete(`/billing/${invoiceToDelete.id}`);
            toast.success('Invoice deleted');
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
        } catch (err) {
            toast.error('Failed to delete invoice');
        } finally {
            setDeleting(null);
            setShowDeleteModal(false);
            setInvoiceToDelete(null);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const clientName = inv.client?.name || inv.guestClientName || '';
        const matchesSearch = inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyles = (status) => {
        switch (status) {
            case 'paid': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'overdue': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-slate-500/10 text-gray-500 dark:text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage and track your customer invoices.</p>
                </div>
                <Link
                    to="/invoices/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Create Invoice
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by invoice number or client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400 dark:text-slate-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            Loading invoices...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                                        <Receipt className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                        <p className="text-lg font-medium text-gray-500 dark:text-slate-400">No invoices found</p>
                                        <p className="text-sm">Create a new invoice to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-100 dark:bg-slate-800/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber || 'Draft'}</div>
                                            {invoice.isSystem && <span className="text-[10px] px-1.5 py-0.5 mt-1 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded">System</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 dark:text-slate-300">
                                                {invoice.client?.name || invoice.guestClientName || 'Unknown Client'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 dark:text-slate-300">
                                                {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('MMM D, YYYY') : dayjs(invoice.createdAt).format('MMM D, YYYY')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-indigo-400">
                                                ₹{Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles(invoice.status)}`}>
                                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                                                    className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 rounded-lg transition-colors"
                                                    title="View Invoice"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                                    className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-amber-400 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 rounded-lg transition-colors"
                                                    title="Edit Invoice"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(invoice)}
                                                    disabled={deleting === invoice.id}
                                                    className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-400 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && invoiceToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Invoice</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                                Are you sure you want to delete invoice <span className="text-gray-900 dark:text-white font-medium">{invoiceToDelete.invoiceNumber || 'Draft'}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
                                className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-medium disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
