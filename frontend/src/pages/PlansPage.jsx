
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Check, X, Edit, Trash2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { MODULE_DEFINITIONS } from '../context/ModuleContext';

export default function PlansPage() {
    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPlanId, setCurrentPlanId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [planToDelete, setPlanToDelete] = useState(null);
    const [form, setForm] = useState({
        name: '',
        priceMonthly: '',
        priceYearly: '',
        adminLimit: 1,
        employeeLimit: 5,
        features: [], // array of module keys
        integrations: [] // array of integration keys
    });

    const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin_admin';

    useEffect(() => {
        loadPlans();
        if (!isSuperAdmin && user?.companyId) {
            fetchCurrentPlan();
        }
    }, [user]);

    const fetchCurrentPlan = async () => {
        try {
            const res = await api.get(`/companies/${user.companyId}`);
            setCurrentPlanId(res.data.planId);
        } catch (err) {
            console.error('Failed to fetch company plan', err);
        }
    };

    const loadPlans = async () => {
        try {
            const res = await api.get('/plans');
            setPlans(res.data);
        } catch (err) {
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            priceMonthly: parseFloat(form.priceMonthly),
            priceYearly: parseFloat(form.priceYearly),
            adminLimit: parseInt(form.adminLimit),
            employeeLimit: parseInt(form.employeeLimit),
            features: form.features,
            integrations: form.integrations
        };

        try {
            if (editingPlan) {
                await api.patch(`/plans/${editingPlan.id}`, payload);
                toast.success('Plan updated');
            } else {
                await api.post('/plans', payload);
                toast.success('Plan created');
            }
            setShowModal(false);
            setEditingPlan(null);
            setForm({ name: '', priceMonthly: '', priceYearly: '', adminLimit: 1, employeeLimit: 5, features: [], integrations: [] });
            loadPlans();
        } catch (err) {
            toast.error('Failed to save plan');
        }
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setForm({
            name: plan.name,
            priceMonthly: plan.priceMonthly,
            priceYearly: plan.priceYearly,
            adminLimit: plan.adminLimit,
            employeeLimit: plan.employeeLimit,
            features: plan.features || [],
            integrations: plan.integrations || []
        });
        setShowModal(true);
    };

    const confirmDelete = (plan) => {
        setPlanToDelete(plan);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        try {
            await api.delete(`/plans/${planToDelete.id}`);
            toast.success('Plan deleted');
            loadPlans();
            setShowDeleteModal(false);
            setPlanToDelete(null);
        } catch (err) {
            toast.error('Failed to delete plan');
        }
    };

    if (loading) return <div className="text-gray-900 dark:text-white">Loading plans...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plans & Pricing</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">
                        {isSuperAdmin ? 'Manage subscription tiers for your customers.' : 'View and upgrade your subscription plan.'}
                    </p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => {
                            setEditingPlan(null);
                            setForm({ name: '', priceMonthly: '', priceYearly: '', adminLimit: 1, employeeLimit: 5, features: [], integrations: [] });
                            setShowModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create Plan
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className={`bg-white dark:bg-slate-900 border ${currentPlanId === plan.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-slate-800'} rounded-2xl p-6 relative group hover:border-indigo-500/50 transition-all`}>
                        {isSuperAdmin ? (
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(plan)} className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 rounded-lg">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => confirmDelete(plan)} className="p-2 text-red-400 hover:text-red-300 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            currentPlanId === plan.id && (
                                <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20">
                                    Current Plan
                                </div>
                            )
                        )}

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.priceMonthly}</span>
                            <span className="text-gray-500 dark:text-slate-400">/mo</span>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-gray-600 dark:text-slate-300">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <span className="font-bold">{plan.adminLimit}</span>
                                </div>
                                <span>Admins included</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600 dark:text-slate-300">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <span className="font-bold">{plan.employeeLimit}</span>
                                </div>
                                <span>Employees included</span>
                            </div>
                        </div>

                        {plan.features && plan.features.length > 0 && (
                            <div className="space-y-2 border-t border-gray-200 dark:border-slate-800 pt-4">
                                <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">Modules included</p>
                                {plan.features.map((featureKey, i) => {
                                    const moduleDef = MODULE_DEFINITIONS.find(m => m.key === featureKey);
                                    const displayLabel = moduleDef ? moduleDef.label : featureKey;
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                            <Check className="w-4 h-4 text-indigo-500" />
                                            {displayLabel}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {plan.integrations && plan.integrations.length > 0 && (
                            <div className="space-y-2 border-t border-gray-200 dark:border-slate-800 pt-4">
                                <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">Integrations included</p>
                                {plan.integrations.map((intKey, i) => {
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span className="capitalize">{intKey.replace('_', ' ')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-800">
                            {isSuperAdmin ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium">Checkout Links</p>
                                    <div>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Monthly Billing</p>
                                        <a
                                            href={`/checkout/${plan.slug || plan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}?billing=monthly`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-black/30 p-2 rounded text-xs text-indigo-400 font-mono break-all cursor-pointer hover:text-indigo-300 transition-colors"
                                        >
                                            {window.location.origin}/checkout/{plan.slug || plan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}?billing=monthly
                                        </a>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Yearly Billing</p>
                                        <a
                                            href={`/checkout/${plan.slug || plan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}?billing=yearly`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-black/30 p-2 rounded text-xs text-emerald-400 font-mono break-all cursor-pointer hover:text-emerald-300 transition-colors"
                                        >
                                            {window.location.origin}/checkout/{plan.slug || plan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}?billing=yearly
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                currentPlanId !== plan.id ? (
                                    <a
                                        href={`/checkout/${plan.slug || plan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}`}
                                        className="block w-full py-2 text-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium text-sm"
                                    >
                                        Upgrade
                                    </a>
                                ) : user?.subscriptionStatus === 'past_due' ? (
                                    <a
                                        href={`/checkout/${plan.slug || plan.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}`}
                                        className="block w-full py-2 text-center bg-amber-500 hover:bg-amber-400 text-white rounded-xl transition-all font-medium text-sm"
                                    >
                                        Renew Now
                                    </a>
                                ) : (
                                    <button disabled className="block w-full py-2 text-center bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-xl font-medium text-sm cursor-not-allowed">
                                        Active
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingPlan ? 'Edit Plan' : 'New Plan'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Plan Name</label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Starter, Pro, Enterprise"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Monthly Price ($)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={form.priceMonthly}
                                        onChange={e => setForm({ ...form, priceMonthly: e.target.value })}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Yearly Price ($)</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={form.priceYearly}
                                        onChange={e => setForm({ ...form, priceYearly: e.target.value })}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Admin Limit</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={form.adminLimit}
                                        onChange={e => setForm({ ...form, adminLimit: e.target.value })}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">Employee Limit</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={form.employeeLimit}
                                        onChange={e => setForm({ ...form, employeeLimit: e.target.value })}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">Features / Modules</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                                        {MODULE_DEFINITIONS.map(mod => (
                                            <label key={mod.key} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={form.features.includes(mod.key)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setForm(prev => ({
                                                            ...prev,
                                                            features: checked 
                                                                ? [...prev.features, mod.key]
                                                                : prev.features.filter(k => k !== mod.key)
                                                        }));
                                                    }}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{mod.label}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-2">Integrations</label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
                                        {[
                                            { key: 'meta', label: 'Meta / Facebook Ads' },
                                            { key: 'google', label: 'Google Ads' },
                                            { key: 'indiamart', label: 'IndiaMart' },
                                            { key: 'tradeindia', label: 'Trade India' },
                                            { key: 'justdial', label: 'JustDial' },
                                            { key: 'website', label: 'Website Form' }
                                        ].map(int => (
                                            <label key={int.key} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={form.integrations?.includes(int.key) || false}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setForm(prev => ({
                                                            ...prev,
                                                            integrations: checked 
                                                                ? [...(prev.integrations || []), int.key]
                                                                : (prev.integrations || []).filter(k => k !== int.key)
                                                        }));
                                                    }}
                                                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{int.label}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500">Save Plan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Plan</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                                Are you sure you want to delete <span className="text-gray-900 dark:text-white font-medium">{planToDelete?.name}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setPlanToDelete(null); }}
                                className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-white dark:bg-slate-800 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-medium"
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
