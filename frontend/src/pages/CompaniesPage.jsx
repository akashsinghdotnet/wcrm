import { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Plus, Building, Trash2, ExternalLink, Edit, Calendar, CreditCard, Users, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CompanyForm from '../components/CompanyForm';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState(null);
    const [form, setForm] = useState({
        companyName: '', email: '', phone: '', address: '',
        planId: '', subscriptionStatus: 'active', subscriptionPeriod: 'monthly', renewalDate: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [companiesRes, plansRes] = await Promise.all([
                api.get('/companies'),
                api.get('/plans'),
            ]);
            setCompanies(companiesRes.data);
            setPlans(plansRes.data.filter(p => p.isActive));
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => setForm({
        companyName: '', email: '', phone: '', address: '',
        planId: '', subscriptionStatus: 'active', subscriptionPeriod: 'monthly', renewalDate: ''
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.planId) delete payload.planId;
            if (!payload.renewalDate) delete payload.renewalDate;
            await api.post('/companies', payload);
            toast.success('Company created successfully');
            setShowCreateModal(false);
            resetForm();
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create company');
        }
    };

    const openEdit = (company) => {
        console.log('=== Opening edit for company ===');
        console.log('Full company object:', JSON.stringify(company, null, 2));
        console.log('Company email:', company.email);
        console.log('Company phone:', company.phone);
        console.log('Company address:', company.address);

        setEditingCompany(company);

        const formData = {
            companyName: company.companyName || '',
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            planId: company.planId || '',
            subscriptionStatus: company.subscriptionStatus || 'active',
            subscriptionPeriod: company.subscriptionPeriod || 'monthly',
            renewalDate: company.renewalDate ? company.renewalDate.split('T')[0] : '',
        };

        console.log('Form data being set:', JSON.stringify(formData, null, 2));

        setForm(formData);
        setShowEditModal(true);
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (!payload.planId) payload.planId = null;
            if (!payload.renewalDate) delete payload.renewalDate;
            await api.patch(`/companies/${editingCompany.id}`, payload);
            toast.success('Company updated');
            setShowEditModal(false);
            setEditingCompany(null);
            resetForm();
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update company');
        }
    };

    const confirmDelete = (company) => {
        setCompanyToDelete(company);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!companyToDelete) return;
        try {
            await api.delete(`/companies/${companyToDelete.id}`);
            toast.success('Company deleted');
            setShowDeleteModal(false);
            setCompanyToDelete(null);
            loadData();
        } catch (err) {
            toast.error('Failed to delete company');
        }
    };

    const handleActivate = async (companyId) => {
        try {
            await api.patch(`/companies/${companyId}/activate`);
            toast.success('Company activated successfully!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to activate company');
        }
    };

    const statusColors = {
        active: 'bg-emerald-500/10 text-emerald-400',
        pending_payment: 'bg-orange-500/10 text-orange-400',
        past_due: 'bg-amber-500/10 text-amber-400',
        cancelled: 'bg-red-500/10 text-red-400',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Companies</h2>
                    <p className="text-slate-400 mt-1">Manage client agencies and subscriptions</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                >
                    <Plus className="w-4 h-4" />
                    Add Company
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                    <div key={company.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
                                <Building2 className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(company); }}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                    title="Edit Company"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/companies/${company.id}`); }}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                    title="View Details & Manage Users"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); confirmDelete(company); }}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                    title="Delete Company"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3
                            className="text-lg font-semibold text-white mb-1 cursor-pointer hover:text-indigo-400 transition-colors"
                            onClick={() => navigate(`/companies/${company.id}`)}
                        >
                            {company.companyName}
                        </h3>
                        {company.email ? (
                            <p className="text-xs text-slate-500">{company.email}</p>
                        ) : (
                            company.users?.find(u => u.role === 'admin')?.email && (
                                <p className="text-xs text-slate-500 italic">
                                    {company.users.find(u => u.role === 'admin').email}
                                </p>
                            )
                        )}

                        <div className="space-y-2.5 mt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Users</span>
                                <span className="text-slate-300 font-medium">{company.users?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Period</span>
                                <span className="text-slate-300 capitalize">{company.subscriptionPeriod || 'monthly'}</span>
                            </div>
                            {company.renewalDate && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Renewal</span>
                                    <span className="text-slate-300">{new Date(company.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${company.plan
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                                    }`}>
                                    {company.plan?.name || 'No Plan'}
                                </span>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[company.subscriptionStatus] || statusColors.active
                                    }`}>
                                    {(company.subscriptionStatus || 'active').replace('_', ' ')}
                                </span>
                            </div>
                            {company.subscriptionStatus === 'pending_payment' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleActivate(company.id); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all"
                                    title="Activate this company"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Activate
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {companies.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No companies found. Create your first one!</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-lg font-semibold text-white">Register New Company</h3>
                        </div>
                        <CompanyForm
                            form={form}
                            setForm={setForm}
                            plans={plans}
                            onSubmit={handleCreate}
                            isEdit={false}
                            onCancel={() => { setShowCreateModal(false); resetForm(); }}
                        />
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                        <div className="p-6 border-b border-slate-800">
                            <h3 className="text-lg font-semibold text-white">Edit Company — {editingCompany?.companyName}</h3>
                        </div>
                        <CompanyForm
                            form={form}
                            setForm={setForm}
                            plans={plans}
                            onSubmit={handleEdit}
                            isEdit={true}
                            onCancel={() => { setShowEditModal(false); setEditingCompany(null); resetForm(); }}
                        />
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Delete Company</h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Delete <span className="text-white font-medium">{companyToDelete?.companyName}</span> and all associated data? This cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setCompanyToDelete(null); }}
                                className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-all font-medium"
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
