import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SubscriptionInvoiceModal from '../components/SubscriptionInvoiceModal';

export default function BillingSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [subscriptionInvoices, setSubscriptionInvoices] = useState([]);
    const [selectedSubscriptionInvoice, setSelectedSubscriptionInvoice] = useState(null);

    const fetchCompany = async () => {
        if (user?.companyId) {
            try {
                const res = await api.get(`/companies/${user.companyId}`);
                setCompany(res.data);
                if (res.data.plan) {
                    setCurrentPlan(res.data.plan);
                } else if (res.data.planId) {
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
        if (!user?.companyId) return;
        try {
            const res = await api.get('/billing/subscription-history', { params: { companyId: user.companyId } });
            setSubscriptionInvoices(res.data);
        } catch {
            // silent fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompany();
        fetchSubscriptionHistory();
    }, [user]);

    const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

    if (loading) return <div className="text-gray-900 dark:text-white">Loading billing...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Subscription & Invoices</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your active plan and invoices.</p>
                </div>
            </div>

            {/* Current Plan Card */}
            {currentPlan && (
                <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden mb-8">
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <p className="text-sm text-indigo-400 font-medium mb-1">Current Subscription</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{currentPlan.name}</h3>
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-gray-600 dark:text-slate-300 text-sm">
                                <span>₹{currentPlan.priceMonthly}/mo</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{currentPlan.adminLimit} Admins</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{currentPlan.employeeLimit} Employees</span>
                            </div>
                        </div>
                        <a
                            href="/plans"
                            className="w-full sm:w-auto text-center px-6 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
                        >
                            Upgrade Plan
                        </a>
                    </div>
                </div>
            )}

            {/* Subscription History */}
            <div className="bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-300 dark:border-slate-700/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase History</h3>
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
                            {subscriptionInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-slate-500">No subscription history found</td>
                                </tr>
                            ) : (
                                subscriptionInvoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-gray-300 dark:border-slate-700/30 hover:bg-gray-200 dark:bg-slate-700/20 transition-colors">
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <SubscriptionInvoiceModal
                invoice={selectedSubscriptionInvoice}
                company={company}
                onClose={() => setSelectedSubscriptionInvoice(null)}
            />
        </div>
    );
}
