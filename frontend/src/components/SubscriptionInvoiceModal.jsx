import { useRef, useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import api from '../services/api';
import InvoicePreviewTemplate from './InvoicePreviewTemplate';

export default function SubscriptionInvoiceModal({ invoice, company, onClose }) {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        if (invoice) {
            api.get('/billing/settings/super-admin')
                .then(res => setSettings(res.data))
                .catch(console.error);
        }
    }, [invoice]);

    const handlePrint = () => {
        window.print();
    };

    if (!invoice || !company) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static print:block">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scale-in print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
                {/* Header Actions */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 print:hidden">
                    <h3 className="text-gray-900 dark:text-white font-semibold">Subscription Invoice</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Printer size={16} /> Print / Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white rounded-lg hover:bg-white dark:bg-slate-800 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto bg-white text-slate-900 print:overflow-visible">
                    <InvoicePreviewTemplate 
                        form={settings || {}} 
                        user={{ company: { companyName: 'MagnetCRM', email: 'billing@magnetcrm.com' } }} 
                        invoice={{...invoice, company: company}} 
                    />
                </div>
            </div>
        </div>
    );
}
