import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    Tag, Plus, Trash2, Edit3, Save, X, Search, ToggleLeft, ToggleRight,
    Percent, IndianRupee, Calendar, Users, Copy, Check, Gift, AlertTriangle, Repeat
} from 'lucide-react';

const COUPONS_KEY = 'magnetcrm_coupons';

const emptyForm = {
    code: '', type: 'percentage', value: '', maxUses: '', expiresAt: '', description: '', isActive: true, billingCycle: 'both',
};

export default function CouponsPage() {
    const [coupons, setCoupons] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [copiedCode, setCopiedCode] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem(COUPONS_KEY);
        if (saved) { try { setCoupons(JSON.parse(saved)); } catch { } }
    }, []);

    const persist = (data) => {
        setCoupons(data);
        localStorage.setItem(COUPONS_KEY, JSON.stringify(data));
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEdit = (coupon) => {
        setEditingId(coupon.id);
        setForm({
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            maxUses: coupon.maxUses || '',
            expiresAt: coupon.expiresAt || '',
            description: coupon.description || '',
            isActive: coupon.isActive,
            billingCycle: coupon.billingCycle || 'both',
        });
        setShowModal(true);
    };

    const handleSave = () => {
        if (!form.code.trim()) { toast.error('Coupon code is required'); return; }
        if (!form.value || Number(form.value) <= 0) { toast.error('Discount value is required'); return; }
        if (form.type === 'percentage' && Number(form.value) > 100) { toast.error('Percentage cannot exceed 100%'); return; }

        const code = form.code.trim().toUpperCase();

        // Check duplicate
        const isDuplicate = coupons.some(c => c.code === code && c.id !== editingId);
        if (isDuplicate) { toast.error('A coupon with this code already exists'); return; }

        if (editingId) {
            const updated = coupons.map(c =>
                c.id === editingId
                    ? { ...c, code, type: form.type, value: Number(form.value), maxUses: form.maxUses ? Number(form.maxUses) : null, expiresAt: form.expiresAt || null, description: form.description, isActive: form.isActive, billingCycle: form.billingCycle }
                    : c
            );
            persist(updated);
            toast.success('Coupon updated');
        } else {
            const newCoupon = {
                id: Date.now().toString(),
                code,
                type: form.type,
                value: Number(form.value),
                maxUses: form.maxUses ? Number(form.maxUses) : null,
                expiresAt: form.expiresAt || null,
                description: form.description,
                isActive: form.isActive,
                billingCycle: form.billingCycle,
                usedCount: 0,
                createdAt: new Date().toISOString(),
            };
            persist([newCoupon, ...coupons]);
            toast.success('Coupon created');
        }
        setShowModal(false);
    };

    const handleDelete = () => {
        persist(coupons.filter(c => c.id !== deleteId));
        setDeleteId(null);
        toast.success('Coupon deleted');
    };

    const toggleActive = (id) => {
        const updated = coupons.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
        persist(updated);
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success('Code copied');
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const filtered = coupons.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const activeCoupons = coupons.filter(c => c.isActive).length;

    const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Gift className="w-6 h-6 text-indigo-400" />
                        Coupon Codes
                    </h2>
                    <p className="text-slate-400 mt-1">
                        {coupons.length} total · {activeCoupons} active
                    </p>
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-600/25">
                    <Plus className="w-4 h-4" /> Create Coupon
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Search coupons..."
                />
            </div>

            {/* Coupons Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 border border-slate-800/50 rounded-2xl">
                    <Tag className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-400 mb-1">No coupons found</h3>
                    <p className="text-sm text-slate-500 mb-4">Create your first promotional code to get started.</p>
                    <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">
                        Create Coupon
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(coupon => {
                        const expired = isExpired(coupon.expiresAt);
                        return (
                            <div key={coupon.id}
                                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${coupon.isActive && !expired ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'}`}>
                                {/* Color strip */}
                                <div className={`h-1 ${coupon.type === 'percentage' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} />

                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-lg text-white tracking-wider">{coupon.code}</span>
                                            <button onClick={() => copyCode(coupon.code)} className="text-slate-500 hover:text-white transition-colors">
                                                {copiedCode === coupon.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <button onClick={() => toggleActive(coupon.id)} className="transition-colors">
                                            {coupon.isActive
                                                ? <ToggleRight className="w-7 h-7 text-emerald-400" />
                                                : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                                        </button>
                                    </div>

                                    {/* Discount Badge */}
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold mb-3 ${coupon.type === 'percentage'
                                        ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                        }`}>
                                        {coupon.type === 'percentage'
                                            ? <><Percent className="w-3.5 h-3.5" /> {coupon.value}% OFF</>
                                            : <><IndianRupee className="w-3.5 h-3.5" /> ₹{Number(coupon.value).toLocaleString('en-IN')} OFF</>
                                        }
                                    </div>

                                    {coupon.description && (
                                        <p className="text-xs text-slate-400 mb-3">{coupon.description}</p>
                                    )}

                                    {/* Meta */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
                                        <span className="flex items-center gap-1">
                                            <Repeat className="w-3 h-3" />
                                            {coupon.billingCycle === 'monthly' ? 'Monthly only' : coupon.billingCycle === 'yearly' ? 'Yearly only' : 'All cycles'}
                                        </span>
                                        {coupon.maxUses && (
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {coupon.usedCount || 0}/{coupon.maxUses} used
                                            </span>
                                        )}
                                        {coupon.expiresAt && (
                                            <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : ''}`}>
                                                <Calendar className="w-3 h-3" />
                                                {expired ? 'Expired' : `Expires ${new Date(coupon.expiresAt).toLocaleDateString('en-IN')}`}
                                            </span>
                                        )}
                                    </div>

                                    {expired && coupon.isActive && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-3 bg-amber-500/10 px-2.5 py-1.5 rounded-lg">
                                            <AlertTriangle className="w-3 h-3" /> This coupon has expired
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                                        <button onClick={() => openEdit(coupon)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                                            <Edit3 className="w-3 h-3" /> Edit
                                        </button>
                                        <button onClick={() => setDeleteId(coupon.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors">
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Create/Edit Modal ─── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Coupon Code */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Coupon Code *</label>
                                <input
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm uppercase tracking-wider"
                                    placeholder="WELCOME50"
                                />
                            </div>

                            {/* Discount Type + Value */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Discount Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Value * {form.type === 'percentage' ? '(%)' : '(₹)'}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={form.type === 'percentage' ? 100 : undefined}
                                        value={form.value}
                                        onChange={e => setForm({ ...form, value: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder={form.type === 'percentage' ? '10' : '500'}
                                    />
                                </div>
                            </div>

                            {/* Max Uses + Expiry */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Max Uses (optional)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.maxUses}
                                        onChange={e => setForm({ ...form, maxUses: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        placeholder="Unlimited"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Expiry Date (optional)</label>
                                    <input
                                        type="date"
                                        value={form.expiresAt}
                                        onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Billing Cycle */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Applicable Billing Cycle</label>
                                <select
                                    value={form.billingCycle}
                                    onChange={e => setForm({ ...form, billingCycle: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="both">Both (Monthly & Yearly)</option>
                                    <option value="monthly">Monthly Only</option>
                                    <option value="yearly">Yearly Only</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description (optional)</label>
                                <input
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    placeholder="e.g. Welcome offer for new customers"
                                />
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                                <span className="text-sm text-slate-300">Active</span>
                                <button onClick={() => setForm({ ...form, isActive: !form.isActive })}>
                                    {form.isActive
                                        ? <ToggleRight className="w-7 h-7 text-emerald-400" />
                                        : <ToggleLeft className="w-7 h-7 text-slate-600" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-6 pt-0">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors text-sm">
                                Cancel
                            </button>
                            <button onClick={handleSave}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/25 text-sm">
                                <Save className="w-4 h-4" />
                                {editingId ? 'Update Coupon' : 'Create Coupon'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Delete Confirmation ─── */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Coupon?</h3>
                        <p className="text-sm text-slate-400 mb-6">This coupon code will be permanently removed and can no longer be used.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium text-sm">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
