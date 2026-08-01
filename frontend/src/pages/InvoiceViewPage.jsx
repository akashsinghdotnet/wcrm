import { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import InvoicePreviewTemplate from '../components/InvoicePreviewTemplate';

export default function InvoiceViewPage() {
    const { id } = useParams();
    const { user } = useAuth();

    // Access control
    if (user?.role === 'staff' && !user?.canCreateInvoices) {
        return <Navigate to="/" replace />;
    }

    const [invoice, setInvoice] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const printRef = useRef(null);

    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        const fetchInvoiceAndSettings = async () => {
            try {
                const invRes = await api.get(`/billing/${id}`);
                setInvoice(invRes.data);

                // Fetch settings for formatting prefix, logo, etc.
                const settingsId = invRes.data.companyId || 'super-admin';
                const setRes = await api.get(`/billing/settings/${settingsId}`);
                if (setRes.data) {
                    setSettings(setRes.data);
                }
            } catch (err) {
                toast.error('Failed to load invoice');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoiceAndSettings();
    }, [id]);

    const handleMarkPaid = async () => {
        try {
            await api.patch(`/billing/${id}/pay`);
            toast.success('Invoice marked as paid');
            setInvoice(prev => ({ ...prev, status: 'paid', paidDate: new Date() }));
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-gray-500 dark:text-slate-400">Loading invoice...</div>;
    }

    if (!invoice) {
        return <div className="text-center py-20 text-gray-500 dark:text-slate-400">Invoice not found.</div>;
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-4 h-4" /> Paid</span>;
            case 'pending':
                return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-4 h-4" /> Pending</span>;
            case 'overdue':
                return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertCircle className="w-4 h-4" /> Overdue</span>;
            default:
                return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-500/10 text-gray-500 dark:text-slate-400 border border-slate-500/20 capitalize">{status}</span>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link
                        to="/invoices"
                        className="p-2 hover:bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            Invoice {invoice.invoiceNumber || 'Draft'}
                            {getStatusBadge(invoice.status)}
                            {invoice.isSystem && <span className="text-xs px-2 py-1 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-lg">System</span>}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {invoice.status !== 'paid' && (
                        <button
                            onClick={handleMarkPaid}
                            className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20 rounded-xl font-medium transition-colors"
                        >
                            Mark as Paid
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/25"
                    >
                        <Printer className="w-4 h-4" />
                        Print / Download PDF
                    </button>
                </div>
            </div>

            {/* Print Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 print:p-0 print:border-none print:shadow-none" ref={printRef}>
                <InvoicePreviewTemplate invoice={invoice} form={settings} user={user} />
            </div>
        </div>
    );
}
