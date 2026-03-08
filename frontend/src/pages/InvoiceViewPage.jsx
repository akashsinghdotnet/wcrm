import { useState, useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Printer, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

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
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: invoice ? `Invoice-${invoice.invoiceNumber}` : 'Invoice',
    });

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
        return <div className="text-center py-20 text-slate-400">Loading invoice...</div>;
    }

    if (!invoice) {
        return <div className="text-center py-20 text-slate-400">Invoice not found.</div>;
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
                return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 capitalize">{status}</span>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        to="/invoices"
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            Invoice {invoice.invoiceNumber || 'Draft'}
                            {getStatusBadge(invoice.status)}
                            {invoice.isSystem && <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded-lg">System</span>}
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
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:bg-white text-slate-900" ref={printRef}>
                <div className="p-8 md:p-12 space-y-8">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-8">
                        <div>
                            {settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt="Company Logo" className="h-16 object-contain mb-4" />
                            ) : (
                                <div className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">
                                    {invoice.targetCompany ? invoice.targetCompany.companyName : 'INVOICE'}
                                </div>
                            )}
                            <div className="text-sm text-slate-500 whitespace-pre-line leading-relaxed max-w-xs">
                                {settings?.address || 'No address provided'}
                                {settings?.gstNo && <div className="mt-1 font-medium text-slate-700">GSTIN: {settings.gstNo}</div>}
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-extrabold text-slate-200 tracking-wider mb-2 uppercase">Invoice</h2>
                            <p className="text-slate-600 font-medium">#{invoice.invoiceNumber || 'Draft'}</p>

                            <div className="mt-6 space-y-1 text-sm">
                                <p className="text-slate-500">Date Issued: <span className="text-slate-900 font-medium ml-2">{dayjs(invoice.invoiceDate || invoice.createdAt).format('MMM D, YYYY')}</span></p>
                                <p className="text-slate-500">Due Date: <span className="text-slate-900 font-medium ml-2">{dayjs(invoice.dueDate || invoice.createdAt).format('MMM D, YYYY')}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Billed To */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Billed To</h3>
                        <div className="text-sm text-slate-800">
                            <p className="font-bold text-base text-slate-900 mb-1">
                                {invoice.client?.name || invoice.guestClientName || 'Walk-in Customer'}
                            </p>
                            {(invoice.client?.email || invoice.guestClientEmail) && (
                                <p className="text-slate-600">{invoice.client?.email || invoice.guestClientEmail}</p>
                            )}
                            {(invoice.client?.phone || invoice.guestClientPhone) && (
                                <p className="text-slate-600">{invoice.client?.phone || invoice.guestClientPhone}</p>
                            )}
                            {invoice.guestClientAddress && (
                                <p className="text-slate-600 whitespace-pre-line">{invoice.guestClientAddress}</p>
                            )}
                            {invoice.clientGst && (
                                <p className="mt-1 font-medium text-slate-700">GSTIN: {invoice.clientGst}</p>
                            )}
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mt-8">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="py-3 font-semibold w-full">Description</th>
                                    <th className="py-3 font-semibold text-center px-4">Qty</th>
                                    <th className="py-3 font-semibold text-right px-4">Rate</th>
                                    <th className="py-3 font-semibold text-right pl-4">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0 ? (
                                    invoice.items.map((item, idx) => (
                                        <tr key={idx} className="text-sm">
                                            <td className="py-4 font-medium text-slate-800">{item.description}</td>
                                            <td className="py-4 text-center text-slate-600 px-4">{item.quantity}</td>
                                            <td className="py-4 text-right text-slate-600 px-4">₹{Number(item.rate || item.price).toFixed(2)}</td>
                                            <td className="py-4 text-right font-medium text-slate-900 pl-4">₹{(Number(item.quantity) * Number(item.rate || item.price || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-slate-400 italic">No line items</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                        <div className="w-full max-w-sm space-y-3">
                            {!!invoice.subtotal && invoice.subtotal !== invoice.total && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Subtotal</span>
                                    <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
                                </div>
                            )}
                            {!!invoice.tax && invoice.tax > 0 && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>GST</span>
                                    <span>₹{Number(invoice.tax).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <span className="font-bold text-slate-900">Total</span>
                                <span className="text-xl font-black text-indigo-600">₹{Number(invoice.amount || invoice.total).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details */}
                    {settings && (settings.bankName || settings.upiId || settings.upiQrUrl) && (
                        <div className="pt-8 mt-8 border-t border-slate-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Payment Details</h3>
                            <div className="flex justify-between items-start gap-8">
                                <div className="space-y-2 text-sm">
                                    {settings.bankName && (
                                        <div>
                                            <p className="text-slate-500">Bank: <span className="text-slate-800 font-medium">{settings.bankName}</span></p>
                                            {settings.accountHolderName && <p className="text-slate-500">A/C Holder: <span className="text-slate-800 font-medium">{settings.accountHolderName}</span></p>}
                                            {settings.accountNumber && <p className="text-slate-500">A/C No: <span className="text-slate-800 font-medium">{settings.accountNumber}</span></p>}
                                            {settings.ifscCode && <p className="text-slate-500">IFSC: <span className="text-slate-800 font-medium">{settings.ifscCode}</span></p>}
                                        </div>
                                    )}
                                    {settings.upiId && (
                                        <p className="text-slate-500">UPI: <span className="text-slate-800 font-medium">{settings.upiId}</span></p>
                                    )}
                                </div>
                                {settings.upiQrUrl && (
                                    <div className="flex-shrink-0">
                                        <img src={settings.upiQrUrl} alt="UPI QR Code" className="w-28 h-28 object-contain border border-slate-200 rounded-lg" />
                                        <p className="text-xs text-slate-400 text-center mt-1">Scan to Pay</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes & Signature */}
                    <div className="pt-8 mt-8 border-t border-slate-100 flex justify-between items-end gap-8">
                        <div className="flex-1">
                            {(invoice.notes || settings?.terms) && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Notes & Terms</h3>
                                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                                        {invoice.notes || settings.terms}
                                    </p>
                                </div>
                            )}
                        </div>
                        {settings?.signatureUrl && (
                            <div className="flex-shrink-0 text-center">
                                <img src={settings.signatureUrl} alt="Authorized Signature" className="h-16 object-contain mb-1" />
                                <div className="border-t border-slate-300 pt-1">
                                    <p className="text-xs text-slate-500">Authorized Signatory</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
