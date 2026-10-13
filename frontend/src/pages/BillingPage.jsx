import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    IndianRupee,
    Plus,
    X,
    Clock,
    Filter,
    Download,
    Eye,
    Trash2,
    Building2,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import SubscriptionInvoiceModal from '../components/SubscriptionInvoiceModal';

export default function BillingPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [company, setCompany] = useState(null);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [globalHistory, setGlobalHistory] = useState([]);
    const [subscriptionInvoices, setSubscriptionInvoices] = useState([]);
    const [selectedSubscriptionInvoice, setSelectedSubscriptionInvoice] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');

    // System Invoice Form (Super Admin billing a tenant company)
    const [form, setForm] = useState({
        targetCompanyId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        invoiceNumber: '',
        items: [{ description: 'Wcrm Subscription Plan', quantity: 1, rate: 0, amount: 0 }],
        notes: '',
    });

    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin_admin';

    const loadData = async () => {
        setLoading(true);
        try {
            if (isSuperAdmin) {
                const [historyRes, compRes] = await Promise.all([
                    api.get('/billing/global-history').catch(() => ({ data: [] })),
                    api.get('/companies').catch(() => ({ data: [] }))
                ]);
                setGlobalHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
                setCompanies(Array.isArray(compRes.data) ? compRes.data : []);
            } else if (user?.companyId) {
                const [subRes, compRes] = await Promise.all([
                    api.get('/billing/subscription-history', { params: { companyId: user.companyId } }).catch(() => ({ data: [] })),
                    api.get(`/companies/${user.companyId}`).catch(() => ({ data: null }))
                ]);
                setSubscriptionInvoices(Array.isArray(subRes.data) ? subRes.data : []);
                if (compRes.data) {
                    setCompany(compRes.data);
                    if (compRes.data.plan) {
                        setCurrentPlan(compRes.data.plan);
                    } else if (compRes.data.planId) {
                        try {
                            const planRes = await api.get('/plans');
                            const found = planRes.data.find(p => p.id === compRes.data.planId);
                            if (found) setCurrentPlan(found);
                        } catch { /* ignore */ }
                    }
                }
            }
        } catch (err) {
            console.error('Error loading billing:', err);
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const updateItem = (index, field, value) => {
        const newItems = [...form.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = Number(newItems[index].quantity || 0) * Number(newItems[index].rate || 0);
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
        const subtotal = form.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const gst = subtotal * 0.18; // 18% GST
        return {
            subtotal,
            gst,
            total: subtotal + gst
        };
    };

    const handleCreateSystemInvoice = async (e) => {
        e.preventDefault();
        try {
            const { subtotal, gst, total } = calculateTotal();
            await api.post('/billing/system-invoice', {
                targetCompanyId: form.targetCompanyId,
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
            toast.success('System invoice created');
            setShowModal(false);
            setForm({
                targetCompanyId: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                dueDate: '',
                invoiceNumber: '',
                items: [{ description: 'Wcrm Subscription Plan', quantity: 1, rate: 0, amount: 0 }],
                notes: '',
            });
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to create system invoice');
        }
    };

    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            await api.delete(`/billing/${invoiceToDelete.id}`);
            toast.success('Invoice deleted');
            setShowDeleteModal(false);
            setInvoiceToDelete(null);
            loadData();
        } catch {
            toast.error('Failed to delete invoice');
        }
    };

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

    if (loading) return <div className="p-8 text-gray-500 dark:text-slate-400">Loading billing...</div>;
    if (!user) return <div className="p-8 text-gray-500 dark:text-slate-400">Please log in to view billing.</div>;

    const filteredGlobalHistory = selectedCompanyFilter
        ? globalHistory.filter(inv => inv.companyId === selectedCompanyFilter)
        : globalHistory;

    const totalSystemRevenue = globalHistory.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isSuperAdmin ? 'Subscription Billing & Revenue' : 'Subscription & Invoices'}
                    </h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">
                        {isSuperAdmin ? 'Manage platform subscription invoices and company payments.' : 'View your active plan and subscription payment receipts.'}
                    </p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                    >
                        <Plus size={18} /> Create System Invoice
                    </button>
                )}
            </div>

            {/* Current Plan Card (For Company Users) */}
            {currentPlan && !isSuperAdmin && (
                <div className={`bg-gradient-to-r ${user?.subscriptionStatus === 'past_due' ? 'from-red-900/50 to-slate-900 border-red-500/30' : 'from-emerald-900/40 via-slate-900 to-slate-950 border-emerald-500/30'} border rounded-2xl p-6 relative overflow-hidden`}>
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <p className={`text-sm ${user?.subscriptionStatus === 'past_due' ? 'text-red-400' : 'text-emerald-400'} font-medium mb-1`}>
                                {user?.subscriptionStatus === 'past_due' ? '⚠ Subscription Expired' : 'Active Subscription'}
                            </p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{currentPlan.name}</h3>
                            <div className="flex items-center gap-4 text-gray-600 dark:text-slate-300 text-sm">
                                <span>₹{currentPlan.priceMonthly}/mo</span>
                                <span>•</span>
                                <span>{currentPlan.adminLimit || 'Unlimited'} Admins</span>
                                <span>•</span>
                                <span>{currentPlan.employeeLimit || 'Unlimited'} Team Members</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Super Admin Stats Summary */}
            {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <IndianRupee size={20} className="text-emerald-400" />
                            <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Total Subscription Revenue</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-400">{fmt(totalSystemRevenue)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 size={20} className="text-indigo-400" />
                            <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Active Companies</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{companies.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles size={20} className="text-amber-400" />
                            <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">Total Invoices Issued</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{globalHistory.length}</p>
                    </div>
                </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {isSuperAdmin ? 'Subscription Invoices Issued' : 'Subscription Purchase Receipts'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            {isSuperAdmin ? 'All system generated subscription invoices' : 'Official tax invoices for your Wcrm account'}
                        </p>
                    </div>
                    {isSuperAdmin && companies.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Filter size={14} className="text-gray-400" />
                            <select
                                value={selectedCompanyFilter}
                                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                                className="bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                            >
                                <option value="">All Companies</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.companyName}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                                {isSuperAdmin ? (
                                    <>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Invoice #</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Invoice</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                            {(isSuperAdmin ? filteredGlobalHistory : subscriptionInvoices).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-400 dark:text-slate-500">
                                        <IndianRupee size={32} className="mx-auto mb-3 opacity-30" />
                                        No subscription invoices recorded yet
                                    </td>
                                </tr>
                            ) : isSuperAdmin ? (
                                filteredGlobalHistory.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{invoice.companyName}</div>
                                            <div className="text-xs text-gray-400 dark:text-slate-500">{invoice.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                                            {new Date(invoice.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-semibold text-emerald-500">{fmt(invoice.amount)}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">{invoice.invoiceNumber || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {invoice.status ? invoice.status.toUpperCase() : 'PAID'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSubscriptionInvoice(invoice);
                                                    }}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                                    title="View Invoice"
                                                    type="button"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setInvoiceToDelete(invoice);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
                                subscriptionInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                                            {new Date(inv.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 dark:text-white font-medium text-sm">{inv.description}</div>
                                            <div className="text-xs text-gray-400 dark:text-slate-500">{inv.period}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-mono font-semibold text-sm">{fmt(inv.amount)}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                PAID
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedSubscriptionInvoice(inv)}
                                                className="text-emerald-500 hover:text-emerald-400 text-sm font-medium hover:underline cursor-pointer"
                                            >
                                                View Receipt
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create System Invoice Modal (Super Admin) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create System Invoice</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSystemInvoice} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Select Company</label>
                                <select
                                    value={form.targetCompanyId}
                                    onChange={(e) => setForm({ ...form, targetCompanyId: e.target.value })}
                                    required
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="">Select target company</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.companyName} ({c.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={form.invoiceDate}
                                        onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                                        required
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        value={form.dueDate}
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300">Invoice Items</label>
                                {form.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            placeholder="Plan description"
                                            value={item.description}
                                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            required
                                            className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Rate"
                                            value={item.rate}
                                            onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                                            required
                                            className="w-28 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none"
                                        />
                                        {form.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                                >
                                    + Add Item
                                </button>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-sm">
                                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{fmt(calculateTotal().subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 dark:text-slate-400">
                                    <span>GST (18%)</span>
                                    <span>{fmt(calculateTotal().gst)}</span>
                                </div>
                                <div className="flex justify-between text-gray-900 dark:text-white font-bold pt-2 border-t border-gray-200 dark:border-slate-700">
                                    <span>Total Amount</span>
                                    <span className="text-emerald-500">{fmt(calculateTotal().total)}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-gray-500 dark:text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                    Generate Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Subscription Invoice Modal */}
            {selectedSubscriptionInvoice && (
                <SubscriptionInvoiceModal
                    invoice={selectedSubscriptionInvoice}
                    company={company || { companyName: selectedSubscriptionInvoice.companyName }}
                    onClose={() => setSelectedSubscriptionInvoice(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Invoice?</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Are you sure you want to delete invoice {invoiceToDelete?.invoiceNumber}? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
                                className="px-4 py-2 text-sm text-gray-500 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteInvoice}
                                className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl"
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
