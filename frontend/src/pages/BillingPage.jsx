import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    IndianRupee,
    Plus,
    X,
    CheckCircle,
    Clock,
    AlertCircle,
    AlertTriangle,
    Filter,
    Download,
    Eye,
    Trash2
} from 'lucide-react';
import InvoiceViewModal from '../components/InvoiceViewModal';
import SubscriptionInvoiceModal from '../components/SubscriptionInvoiceModal';

const STATUS_STYLES = {
    pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Pending' },
    paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Paid' },
    overdue: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Overdue' },
};

export default function BillingPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [company, setCompany] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [globalHistory, setGlobalHistory] = useState([]);
    const [subscriptionInvoices, setSubscriptionInvoices] = useState([]);
    const [selectedSubscriptionInvoice, setSelectedSubscriptionInvoice] = useState(null);

    // Form State
    const [form, setForm] = useState({
        clientId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        invoiceNumber: '',
        items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        notes: '',
    });

    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin_admin';

    const fetchInvoices = async () => {
        try {
            if (isSuperAdmin) {
                const res = await api.get('/billing/global-history');
                setGlobalHistory(res.data);
            } else {
                const params = { companyId: user?.companyId };
                if (filterStatus) params.status = filterStatus;
                const res = await api.get('/billing', { params });
                setInvoices(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        if (isSuperAdmin) return;
        try {
            const res = await api.get('/clients', {
                params: { companyId: user?.companyId },
            });
            // Handle potentially paginated response
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setClients(Array.isArray(data) ? data : []);
        } catch {
            setClients([]);
        }
    };

    const fetchCompanies = async () => {
        if (!isSuperAdmin) return;
        try {
            const res = await api.get('/companies');
            setCompanies(Array.isArray(res.data) ? res.data : []);
        } catch {
            setCompanies([]);
        }
    };

    const fetchCompany = async () => {
        if (!isSuperAdmin && user?.companyId) {
            try {
                const res = await api.get(`/companies/${user.companyId}`);
                setCompany(res.data);
                if (res.data.plan) {
                    setCurrentPlan(res.data.plan);
                } else if (res.data.planId) {
                    // Fallback if plan is not joined
                    try {
                        const planRes = await api.get('/plans');
                        const found = planRes.data.find(p => p.id === res.data.planId);
                        if (found) setCurrentPlan(found);
                    } catch { /* ignore */ }
                }
            } catch { /* ignore */ }
        }
    };

    const fetchSubscriptionHistory = async () => {
        if (isSuperAdmin || !user?.companyId) return;
        try {
            const res = await api.get('/billing/subscription-history', { params: { companyId: user.companyId } });
            setSubscriptionInvoices(res.data);
        } catch {
            // silent fail
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchClients();
        fetchCompanies();
        fetchCompany();
        fetchSubscriptionHistory();
    }, [user, filterStatus]);

    // Form Handlers
    const updateItem = (index, field, value) => {
        const newItems = [...form.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
        }
        setForm({ ...form, items: newItems });
    };

    const addItem = () => {
        setForm({
            ...form,
            items: [...form.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
        });
    };

    const removeItem = (index) => {
        const newItems = form.items.filter((_, i) => i !== index);
        setForm({ ...form, items: newItems });
    };

    const calculateTotal = () => {
        const subtotal = form.items.reduce((sum, item) => sum + Number(item.amount), 0);
        const gst = isSuperAdmin ? subtotal * 0.18 : 0; // 18% GST for system invoices
        return {
            subtotal,
            gst,
            total: subtotal + gst
        };
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const { subtotal, gst, total } = calculateTotal();

            if (isSuperAdmin) {
                await api.post('/billing/system-invoice', {
                    targetCompanyId: form.clientId,
                    amount: total,
                    subtotal: subtotal,
                    tax: gst,
                    invoiceDate: form.invoiceDate,
                    dueDate: form.dueDate,
                    invoiceNumber: form.invoiceNumber,
                    items: form.items,
                    month: new Date(form.invoiceDate).toLocaleString('default', { month: 'short', year: 'numeric' }),
                    notes: form.notes || undefined,
                });
            } else {
                await api.post('/billing', {
                    companyId: user?.companyId,
                    clientId: form.clientId,
                    amount: total,
                    subtotal: total,
                    total: total,
                    invoiceDate: form.invoiceDate,
                    dueDate: form.dueDate,
                    invoiceNumber: form.invoiceNumber,
                    items: form.items,
                    month: new Date(form.invoiceDate).toLocaleString('default', { month: 'short', year: 'numeric' }),
                    notes: form.notes || undefined,
                });
            }
            toast.success('Invoice created');
            setShowModal(false);
            setForm({
                clientId: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                invoiceNumber: '',
                items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
                notes: '',
            });
            fetchInvoices();
        } catch (err) {
            console.error(err);
            toast.error('Failed to create invoice');
        }
    };

    const handleMarkPaid = async (id) => {
        try {
            await api.patch(`/billing/${id}/pay`);
            toast.success('Marked as paid');
            fetchInvoices();
        } catch {
            toast.error('Failed to mark as paid');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice?')) return;
        try {
            await api.delete(`/billing/${id}`);
            toast.success('Invoice deleted');
            fetchInvoices();
        } catch {
            toast.error('Failed to delete invoice');
        }
    };

    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    const totalPaid = safeInvoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalPending = safeInvoices.filter((i) => i.status === 'pending').reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalOverdue = safeInvoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

    if (loading) return <div className="text-gray-900 dark:text-white">Loading billing...</div>;
    if (!user) return <div className="text-gray-500 dark:text-slate-400">Please log in to view billing.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isSuperAdmin ? 'Global Sales History' : 'Billing & Invoices'}
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">
                        {isSuperAdmin ? 'View all subscription revenue from companies.' : 'Manage your invoices and payment history.'}
                    </p>
                </div>
                {(user.role === 'admin' || isSuperAdmin) && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
                        bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                    >
                        <Plus size={18} /> Create Invoice
                    </button>
                )}
            </div>

            {/* Current Plan Card (For Company Admins) */}
            {currentPlan && !isSuperAdmin && (
                <div className={`bg-gradient-to-r ${user?.subscriptionStatus === 'past_due' ? 'from-red-900/50 to-slate-900 border-red-500/30' : 'from-indigo-900/50 to-slate-900 border-indigo-500/30'} border rounded-2xl p-6 relative overflow-hidden mb-2`}>
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className={`text-sm ${user?.subscriptionStatus === 'past_due' ? 'text-red-400' : 'text-indigo-400'} font-medium mb-1`}>
                                {user?.subscriptionStatus === 'past_due' ? '⚠ Subscription Expired' : 'Current Subscription'}
                            </p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{currentPlan.name}</h3>
                            <div className="flex items-center gap-4 text-gray-600 dark:text-slate-300 text-sm">
                                <span>₹{currentPlan.priceMonthly}/mo</span>
                                <span>•</span>
                                <span>{currentPlan.adminLimit} Admins</span>
                                <span>•</span>
                                <span>{currentPlan.employeeLimit} Employees</span>
                            </div>
                        </div>
                        {user?.subscriptionStatus === 'past_due' && (
                            <a
                                href={`/checkout/${currentPlan.slug || currentPlan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\\s+/g, '-')}`}
                                className="w-full sm:w-auto text-center px-8 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/25 animate-pulse"
                            >
                                🔄 Renew Now
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Subscription Purchase History - For Company Admins */}
            {!isSuperAdmin && subscriptionInvoices.length > 0 && (
                <div className="bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 rounded-2xl overflow-hidden mb-6">
                    <div className="p-4 border-b border-gray-300 dark:border-slate-700/50">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Purchase History</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Your Wcrm subscription invoices</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-300 dark:border-slate-700/50">
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptionInvoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-gray-300 dark:border-slate-700/30 hover:bg-gray-200 dark:hover:bg-slate-700/20 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                                            {new Date(inv.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium text-sm">
                                            {inv.description}
                                            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{inv.period}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-mono text-sm">{fmt(inv.amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${inv.status === 'paid'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                {inv.status === 'paid' ? 'PAID' : 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedSubscriptionInvoice(inv)}
                                                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium hover:underline"
                                            >
                                                View Invoice
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary Cards - Only for Company Admins (Client Invoicing) */}
            {!isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-100 dark:bg-slate-800/50 border border-emerald-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <CheckCircle size={20} className="text-emerald-400" />
                            <span className="text-gray-500 dark:text-slate-400 text-sm">Paid</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{fmt(totalPaid)}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-slate-800/50 border border-yellow-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock size={20} className="text-yellow-400" />
                            <span className="text-gray-500 dark:text-slate-400 text-sm">Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">{fmt(totalPending)}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-slate-800/50 border border-red-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle size={20} className="text-red-400" />
                            <span className="text-gray-500 dark:text-slate-400 text-sm">Overdue</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">{fmt(totalOverdue)}</p>
                    </div>
                </div>
            )}

            {/* Filter - Only for Company Admins */}
            {!isSuperAdmin && (
                <div className="flex items-center gap-3 mb-6">
                    <Filter size={16} className="text-gray-500 dark:text-slate-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm
                        text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                            {isSuperAdmin ? (
                                <>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Invoice #</th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </>
                            ) : (
                                <>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Paid Date</th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-12 text-gray-400 dark:text-slate-500">Loading...</td></tr>
                        ) : (isSuperAdmin ? globalHistory : safeInvoices).length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-slate-500">
                                    <IndianRupee size={32} className="mx-auto mb-3 opacity-50" />
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            isSuperAdmin ? (
                                globalHistory.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-100 dark:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{invoice.companyName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300">{invoice.planName}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                            {new Date(invoice.date).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-emerald-400">{fmt(invoice.amount)}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">{invoice.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Explicitly stop propagation
                                                        console.log('View clicked for:', invoice.id);
                                                        setSelectedInvoice({
                                                            ...invoice,
                                                            // Use original data to populate view modal
                                                            client: invoice.original?.targetCompany ? {
                                                                clientName: invoice.companyName,
                                                                email: invoice.original.targetCompany.email,
                                                                address: invoice.original.targetCompany.address,
                                                                gstNo: invoice.original.targetCompany.gstNo
                                                            } : {
                                                                clientName: invoice.companyName
                                                            },
                                                            items: invoice.items || [{
                                                                description: invoice.description,
                                                                amount: invoice.amount,
                                                                quantity: 1,
                                                                rate: invoice.amount
                                                            }],
                                                            invoiceNumber: invoice.invoiceNumber,
                                                            invoiceDate: invoice.date,
                                                            subtotal: invoice.subtotal,
                                                            tax: invoice.tax,
                                                            amount: invoice.amount,
                                                            status: invoice.status
                                                        });
                                                        // Set company prop for modal header
                                                        setCompany(invoice.original?.targetCompany || {
                                                            companyName: invoice.companyName,
                                                            // Fallback
                                                        });
                                                        setShowViewModal(true);
                                                    }}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg transition-colors z-20 relative"
                                                    title="View Invoice"
                                                    type="button"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // CRITICAL: Stop row click
                                                        e.preventDefault();

                                                        // Check for system logs
                                                        if (invoice.id.toString().startsWith('sub-')) {
                                                            toast.error('System generated subscription logs cannot be deleted');
                                                            return;
                                                        }

                                                        // Open custom modal
                                                        setInvoiceToDelete(invoice);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors z-20 relative"
                                                    title="Delete Invoice"
                                                    type="button"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                safeInvoices.map((inv) => {
                                    const s = STATUS_STYLES[inv.status] || STATUS_STYLES.pending;
                                    return (
                                        <tr key={inv.id} className="hover:bg-gray-100 dark:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{inv.client?.clientName || '—'}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                                                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : inv.month}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-mono">{fmt(inv.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">
                                                {inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInvoice(inv);
                                                            setShowViewModal(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                                        title="View Invoice"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {inv.status !== 'paid' && (
                                                        <button
                                                            onClick={() => handleMarkPaid(inv.id)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(inv.id)}
                                                        className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table >
            </div >

            {/* Create Invoice Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Invoice</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="p-8 space-y-8">
                                {/* Top Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">{isSuperAdmin ? 'Company' : 'Client'}</label>
                                            <select
                                                value={form.clientId}
                                                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                                required
                                                className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="">Select {isSuperAdmin ? 'company' : 'client'}</option>
                                                {isSuperAdmin ? (
                                                    companies.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.companyName}</option>
                                                    ))
                                                ) : (
                                                    clients.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.clientName}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Invoice Number</label>
                                            <input
                                                value={form.invoiceNumber}
                                                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="INV-001"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Invoice Date</label>
                                                <input
                                                    type="date"
                                                    value={form.invoiceDate}
                                                    onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                                                    required
                                                    className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={form.dueDate}
                                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                                    className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
                                    <div className="space-y-3">
                                        {form.items.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-3 items-start">
                                                <div className="col-span-5">
                                                    <input
                                                        placeholder="Description"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Rate"
                                                        value={item.rate}
                                                        onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-2 py-2 text-right text-gray-900 dark:text-white font-mono">
                                                    {fmt(item.amount)}
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                                    >
                                        <Plus size={16} /> Add Item
                                    </button>
                                </div>

                                <div className="border-t border-gray-200 dark:border-slate-800 pt-6 flex justify-end">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                            <span>Subtotal</span>
                                            <span className="text-gray-900 dark:text-white">{fmt(calculateTotal().subtotal)}</span>
                                        </div>
                                        {isSuperAdmin && (
                                            <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                                <span>GST (18%)</span>
                                                <span className="text-gray-900 dark:text-white">{fmt(calculateTotal().gst)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-300 dark:border-slate-700">
                                            <span>Total</span>
                                            <span className="text-gray-900 dark:text-white font-bold text-lg">{fmt(calculateTotal().total)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={2}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-400 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Payment terms, notes..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25"
                                >
                                    Create Invoice
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* View Invoice Modal */}
            <InvoiceViewModal
                invoice={selectedInvoice}
                company={company}
                onClose={() => setSelectedInvoice(null)}
            />

            {/* Subscription Invoice Modal */}
            <SubscriptionInvoiceModal
                invoice={selectedSubscriptionInvoice}
                company={company}
                onClose={() => setSelectedSubscriptionInvoice(null)}
            />

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && invoiceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-red-500/10 rounded-full text-red-400">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Invoice</h3>
                                <p className="text-gray-500 dark:text-slate-400 text-sm">Are you sure you want to delete this invoice?</p>
                            </div>
                        </div>

                        <div className="bg-gray-100 dark:bg-slate-800/50 rounded-lg p-4 mb-6 border border-gray-300 dark:border-slate-700">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500 dark:text-slate-400">Invoice #</span>
                                <span className="text-gray-900 dark:text-white font-mono">{invoiceToDelete.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-slate-400">Amount</span>
                                <span className="text-emerald-400 font-mono">{fmt(invoiceToDelete.amount)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-slate-300 hover:bg-white dark:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        console.log('Sending DELETE request for:', invoiceToDelete.id);
                                        await api.delete(`/billing/${invoiceToDelete.id}`);
                                        toast.success('Invoice deleted successfully');
                                        setShowDeleteModal(false);
                                        setInvoiceToDelete(null);
                                        // Force refresh
                                        fetchInvoices();
                                    } catch (err) {
                                        console.error('Delete failed:', err);
                                        toast.error(`Failed to delete: ${err.response?.data?.message || err.message}`);
                                    }
                                }}
                                className="flex-1 px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
