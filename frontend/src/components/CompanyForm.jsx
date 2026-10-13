import { CreditCard } from 'lucide-react';
import { useEffect } from 'react';

const COUNTRIES = [
    { code: '+1', flag: '🇺🇸', name: 'US/CA' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+91', flag: '🇮🇳', name: 'IN' },
    { code: '+61', flag: '🇦🇺', name: 'AU' },
    { code: '+81', flag: '🇯🇵', name: 'JP' },
    { code: '+49', flag: '🇩🇪', name: 'DE' },
    { code: '+33', flag: '🇫🇷', name: 'FR' },
    { code: '+39', flag: '🇮🇹', name: 'IT' },
    { code: '+34', flag: '🇪🇸', name: 'ES' },
    { code: '+55', flag: '🇧🇷', name: 'BR' },
    { code: '+52', flag: '🇲🇽', name: 'MX' },
    { code: '+27', flag: '🇿🇦', name: 'ZA' },
    { code: '+971', flag: '🇦🇪', name: 'AE' },
    { code: '+65', flag: '🇸🇬', name: 'SG' },
    { code: '+60', flag: '🇲🇾', name: 'MY' },
    { code: '+62', flag: '🇮🇩', name: 'ID' },
    { code: '+63', flag: '🇵🇭', name: 'PH' },
    { code: '+64', flag: '🇳🇿', name: 'NZ' },
    { code: '+86', flag: '🇨🇳', name: 'CN' },
    { code: '+82', flag: '🇰🇷', name: 'KR' },
];

export default function CompanyForm({ form, setForm, plans, onSubmit, isEdit, onCancel }) {
    console.log('=== CompanyForm rendering ===');
    console.log('Form object:', form);
    console.log('Email value:', form?.email, 'Phone value:', form?.phone, 'Address value:', form?.address);

    useEffect(() => {
        if (!isEdit && !form.renewalDate) {
            const now = new Date();
            if (form.subscriptionPeriod === 'monthly') {
                now.setMonth(now.getMonth() + 1);
            } else if (form.subscriptionPeriod === 'yearly') {
                now.setFullYear(now.getFullYear() + 1);
            }
            setForm(prev => ({ ...prev, renewalDate: now.toISOString().split('T')[0] }));
        }
    }, [isEdit]);

    const handlePeriodChange = (e) => {
        const period = e.target.value;
        const now = new Date();
        if (period === 'monthly') {
            now.setMonth(now.getMonth() + 1);
        } else if (period === 'yearly') {
            now.setFullYear(now.getFullYear() + 1);
        }
        setForm({ ...form, subscriptionPeriod: period, renewalDate: now.toISOString().split('T')[0] });
    };

    return (
        <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Company Name *</label>
                <input
                    type="text" required value={form.companyName || ''}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Acme Agency"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Email</label>
                    <input
                        type="email" value={form.email || ''}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="contact@acme.com"
                    />
                </div>
                <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Phone</label>
                    <div className="flex gap-2 w-full">
                        <select
                            value={form.countryCode || '+91'}
                            onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
                            className="w-[100px] shrink-0 px-2 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {COUNTRIES.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.flag} {c.code}
                                </option>
                            ))}
                        </select>
                        <input
                            type="tel" value={form.phone || ''}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="flex-1 min-w-0 w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="9999999999"
                        />
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                    {isEdit ? 'New Password (leave blank to keep current)' : 'Admin Password'}
                </label>
                <input
                    type="password" value={form.password || ''}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Address</label>
                <textarea
                    value={form.address || ''} rows="2"
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="City, Country"
                />
            </div>

            {/* Subscription Section */}
            <div className="border-t border-gray-200 dark:border-slate-800 pt-4 mt-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" /> Subscription
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Plan</label>
                    <select
                        value={form.planId || ''}
                        onChange={(e) => setForm({ ...form, planId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">No Plan</option>
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} — ₹{p.priceMonthly}/mo ({p.adminLimit} admin, {p.employeeLimit} employees)
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Status</label>
                        <select
                            value={form.subscriptionStatus || 'active'}
                            onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="active">Active</option>
                            <option value="past_due">Past Due</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Billing Period</label>
                        <select
                            value={form.subscriptionPeriod || 'monthly'}
                            onChange={handlePeriodChange}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>
                <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Renewal Date</label>
                    <input
                        type="date" value={form.renewalDate || ''}
                        onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-600/25"
                >
                    {isEdit ? 'Save Changes' : 'Create Company'}
                </button>
            </div>
        </form>
    );
}
