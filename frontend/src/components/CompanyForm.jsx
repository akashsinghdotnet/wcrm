import { CreditCard } from 'lucide-react';

export default function CompanyForm({ form, setForm, plans, onSubmit, isEdit, onCancel }) {
    return (
        <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name *</label>
                <input
                    type="text" required value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Acme Agency"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                    <input
                        type="email" value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="contact@acme.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                    <input
                        type="tel" value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="+91..."
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Address</label>
                <textarea
                    value={form.address} rows="2"
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="City, Country"
                />
            </div>

            {/* Subscription Section */}
            <div className="border-t border-slate-800 pt-4 mt-2">
                <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-400" /> Subscription
                </p>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Plan</label>
                    <select
                        value={form.planId}
                        onChange={(e) => setForm({ ...form, planId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">No Plan</option>
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} — ₹{p.priceMonthly}/mo ({p.adminLimit} admin, {p.employeeLimit} employees)
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                        <select
                            value={form.subscriptionStatus}
                            onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="active">Active</option>
                            <option value="past_due">Past Due</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Billing Period</label>
                        <select
                            value={form.subscriptionPeriod}
                            onChange={(e) => setForm({ ...form, subscriptionPeriod: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>
                <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Renewal Date</label>
                    <input
                        type="date" value={form.renewalDate}
                        onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-all font-medium"
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
