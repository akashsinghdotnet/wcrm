import { X, Download, Printer, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import api from '../services/api';

export default function InvoiceViewModal({ invoice, company, onClose }) {
    const printRef = useRef(null);
    const [settings, setSettings] = useState(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: invoice ? `Invoice-${invoice.invoiceNumber || invoice.id}` : 'Invoice',
    });

    useEffect(() => {
        if (!invoice) return;
        // Fetch super admin invoice settings for system invoices or company settings
        const settingsId = invoice.companyId || 'super-admin';
        api.get(`/billing/settings/${settingsId}`)
            .then(res => setSettings(res.data))
            .catch(() => {});
    }, [invoice?.id]);

    if (!invoice) return null;

    // Calculate totals if not present in invoice object (backward compatibility)
    const calculateTotal = () => {
        if (invoice.total) return invoice.total;
        // Legacy support
        return Number(invoice.amount);
    };

    const items = invoice.items || [
        { description: 'Service Fee', quantity: 1, rate: Number(invoice.amount), amount: Number(invoice.amount) }
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white p-4 flex items-center justify-between shrink-0">
                    <h2 className="font-bold text-lg">Invoice Details</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Printer size={16} /> Print / PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white dark:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Invoice Preview */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
                    <div ref={printRef} className="bg-white max-w-3xl mx-auto shadow-sm p-12 min-h-[1000px]">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                {(settings?.logoUrl || company?.logoUrl) ? (
                                    <img src={settings?.logoUrl || company.logoUrl} alt="Company Logo" className="h-12 w-auto mb-4" />
                                ) : (
                                    <div className="flex items-center gap-2 text-indigo-600 mb-4">
                                        <Building2 size={32} />
                                        <span className="text-xl font-bold">{company?.companyName || 'Your Company'}</span>
                                    </div>
                                )}
                                <div className="text-sm text-gray-400 dark:text-slate-500 space-y-1">
                                    {(settings?.address || company?.address) && <p className="max-w-[250px]">{settings?.address || company?.address}</p>}
                                    {company?.email && <p>{company.email}</p>}
                                    {company?.phone && <p>{company.phone}</p>}
                                    {(settings?.gstNo || company?.gstNo) && <p>GST: {settings?.gstNo || company?.gstNo}</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-4xl font-light text-slate-900 mb-2">INVOICE</h1>
                                <p className="text-gray-400 dark:text-slate-500 font-mono">#{invoice.invoiceNumber || invoice.id.slice(0, 8).toUpperCase()}</p>
                                <div className="mt-4 space-y-1 text-sm">
                                    <p>
                                        <span className="text-gray-500 dark:text-slate-400">Date: </span>
                                        {new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString('en-IN', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                    {invoice.dueDate && (
                                        <p>
                                            <span className="text-gray-500 dark:text-slate-400">Due Date: </span>
                                            {new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div className="mb-12">
                            <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
                            <div className="text-slate-900">
                                <p className="font-bold text-lg">{invoice.client?.clientName}</p>
                                <p className="text-gray-400 dark:text-slate-500">{invoice.client?.email}</p>
                                {invoice.client?.address && <p className="text-gray-400 dark:text-slate-500">{invoice.client.address}</p>}
                                {invoice.client?.gstNo && <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">GST: {invoice.client.gstNo}</p>}
                            </div>
                        </div>

                        {/* Line Items */}
                        <table className="w-full mb-12">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 text-sm font-semibold text-slate-600">Description</th>
                                    <th className="text-right py-3 text-sm font-semibold text-slate-600">Qty</th>
                                    <th className="text-right py-3 text-sm font-semibold text-slate-600">Rate</th>
                                    <th className="text-right py-3 text-sm font-semibold text-slate-600">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="py-4 text-sm text-slate-800">{item.description}</td>
                                        <td className="py-4 text-right text-sm text-slate-600">{item.quantity}</td>
                                        <td className="py-4 text-right text-sm text-slate-600">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                                        <td className="py-4 text-right text-sm font-medium text-slate-900">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Subtotal</span>
                                    <span>₹{Number(invoice.subtotal || invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {(Number(invoice.tax) > 0) && (
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>GST (18%)</span>
                                        <span>₹{Number(invoice.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t-2 border-slate-100">
                                    <span>Total</span>
                                    <span>₹{Number(calculateTotal()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Details */}
                        {settings && (settings.bankName || settings.upiId || settings.upiQrUrl) && (
                            <div className="mt-12 pt-6 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Payment Details</h4>
                                <div className="flex justify-between items-start gap-8">
                                    <div className="space-y-1 text-sm">
                                        {settings.bankName && (
                                            <div>
                                                <p className="text-gray-400 dark:text-slate-500">Bank: <span className="text-slate-800 font-medium">{settings.bankName}</span></p>
                                                {settings.accountHolderName && <p className="text-gray-400 dark:text-slate-500">A/C Holder: <span className="text-slate-800 font-medium">{settings.accountHolderName}</span></p>}
                                                {settings.accountNumber && <p className="text-gray-400 dark:text-slate-500">A/C No: <span className="text-slate-800 font-medium">{settings.accountNumber}</span></p>}
                                                {settings.ifscCode && <p className="text-gray-400 dark:text-slate-500">IFSC: <span className="text-slate-800 font-medium">{settings.ifscCode}</span></p>}
                                            </div>
                                        )}
                                        {settings.upiId && (
                                            <p className="text-gray-400 dark:text-slate-500">UPI: <span className="text-slate-800 font-medium">{settings.upiId}</span></p>
                                        )}
                                    </div>
                                    {settings.upiQrUrl && (
                                        <div className="flex-shrink-0">
                                            <img src={settings.upiQrUrl} alt="UPI QR Code" className="w-24 h-24 object-contain border border-slate-200 rounded-lg" />
                                            <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1">Scan to Pay</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        {(invoice.notes || settings?.terms) && (
                            <div className="mt-12 pt-6 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Notes & Terms</h4>
                                <p className="text-sm text-gray-400 dark:text-slate-500 whitespace-pre-line">{invoice.notes || settings.terms}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
