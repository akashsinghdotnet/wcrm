import { useRef } from 'react';
import { X, Download, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

export default function SubscriptionInvoiceModal({ invoice, company, onClose }) {
    const componentRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Invoice-${invoice?.invoiceNumber}`,
    });

    if (!invoice || !company) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-in">
                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-white font-semibold">Subscription Invoice</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Printer size={16} /> Print / Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto bg-white text-slate-900 p-8" ref={componentRef}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                    M
                                </div>
                                <span className="text-2xl font-bold text-indigo-900">MagnetCRM</span>
                            </div>
                            <div className="text-sm text-slate-500 space-y-1">
                                <p>123 Tech Park, Sector 5</p>
                                <p>Bangalore, Karnataka 560001</p>
                                <p>India</p>
                                <p>GSTIN: 29AAAAA0000A1Z5</p>
                                <p>support@magnetcrm.com</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h1 className="text-4xl font-light text-indigo-900 mb-2">INVOICE</h1>
                            <p className="text-slate-500 font-medium">#{invoice.invoiceNumber}</p>
                            <div className="mt-4 space-y-1 text-sm">
                                <p><span className="text-slate-400 w-24 inline-block">Date:</span> {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                                <p><span className="text-slate-400 w-24 inline-block">Status:</span> <span className="text-emerald-600 font-bold uppercase text-xs bg-emerald-100 px-2 py-0.5 rounded">Paid</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="mb-12">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
                        <div className="text-slate-800 font-medium">{company.companyName}</div>
                        <div className="text-sm text-slate-500 mt-1 max-w-xs space-y-1">
                            {company.address && <p>{company.address}</p>}
                            {company.gstNo && <p>GSTIN: {company.gstNo}</p>}
                            {company.email && <p>{company.email}</p>}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-8">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                    <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Period</th>
                                    <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <tr>
                                    <td className="py-4">
                                        <p className="font-semibold text-slate-800">{invoice.description}</p>
                                        <p className="text-xs text-slate-500 mt-1">Magnet CRM Subscription</p>
                                    </td>
                                    <td className="py-4 text-right text-sm text-slate-600">
                                        {invoice.period}
                                    </td>
                                    <td className="py-4 text-right font-medium text-slate-800">
                                        ₹{Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-12">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Subtotal</span>
                                <span>₹{Number(invoice.subtotal || invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {(invoice.tax > 0 || !invoice.subtotal) && (
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>GST (18%)</span>
                                    <span>₹{Number(invoice.tax || (invoice.amount * 0.18)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-indigo-900 border-t-2 border-slate-100 pt-3">
                                <span>Total</span>
                                <span>₹{Number(invoice.subtotal ? (Number(invoice.subtotal) + Number(invoice.tax || 0)) : (invoice.amount * 1.18)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
                        <p className="mb-2">Thank you for your business!</p>
                        <p>MagnetCRM Solutions Pvt Ltd • Bangalore, India</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
