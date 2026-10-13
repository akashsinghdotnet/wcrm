import { useState, useEffect } from 'react';
import api from '../services/api';
import { Building2, Plus, Building, Trash2, ExternalLink, Edit, Calendar, CreditCard, Users, CheckCircle, LogIn, LayoutGrid, List, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import CompanyForm from '../components/CompanyForm';

export default function CompaniesPage() {
    const [companies, setCompanies] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState(null);
    const [form, setForm] = useState({
        companyName: '', email: '', countryCode: '+91', phone: '', address: '', password: '',
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
        companyName: '', email: '', countryCode: '+91', phone: '', address: '', password: '',
        planId: '', subscriptionStatus: 'active', subscriptionPeriod: 'monthly', renewalDate: ''
    });

    const handleLoginAsCompany = async (companyId) => {
        try {
            const res = await api.post(`/auth/impersonate/${companyId}`);
            if (res.data && res.data.access_token) {
                localStorage.setItem('wcrm_token', res.data.access_token);
                localStorage.setItem('wcrm_user', JSON.stringify(res.data.user));
                // Open dashboard in a new tab
                window.open('/dashboard', '_blank');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to login as company');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (payload.phone) {
                payload.phone = `${payload.countryCode}${payload.phone}`;
            }
            delete payload.countryCode;
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

        // If company doesn't have email/phone, try to get from admin user
        const adminUser = company.users?.find(u => u.role === 'admin');

        // Try to parse existing phone number to extract country code
        let existingPhone = company.phone || (adminUser?.phone || '');
        let existingCountryCode = '+91';
        if (existingPhone.startsWith('+')) {
            const match = existingPhone.match(/^(\+\d{1,3})(.*)$/);
            if (match) {
                existingCountryCode = match[1];
                existingPhone = match[2];
            }
        }

        const formData = {
            companyName: company.companyName || '',
            // Use admin email as fallback if company email is missing
            email: company.email || (adminUser?.email || ''),
            // Use admin phone as fallback if company phone is missing
            countryCode: existingCountryCode,
            phone: existingPhone,
            address: company.address || '',
            password: '',
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
            if (payload.phone) {
                payload.phone = `${payload.countryCode}${payload.phone}`;
            }
            delete payload.countryCode;
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

    const filteredCompanies = companies.filter(company => {
        const matchesSearch = company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (company.email && company.email.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || company.subscriptionStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage client agencies and subscriptions</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400 hidden sm:block" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="pending_payment">Pending Payment</option>
                            <option value="past_due">Past Due</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Company
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCompanies.map((company) => (
                        <div key={company.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 hover:border-gray-300 dark:border-slate-700 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
                                <Building2 className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEdit(company); }}
                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg"
                                    title="Edit Company"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLoginAsCompany(company.id); }}
                                    className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg"
                                    title="Login as Company"
                                >
                                    <LogIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/companies/${company.id}`); }}
                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg"
                                    title="View Details & Manage Users"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); confirmDelete(company); }}
                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                    title="Delete Company"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3
                            className="text-lg font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-indigo-400 transition-colors"
                            onClick={() => navigate(`/companies/${company.id}`)}
                        >
                            {company.companyName}
                        </h3>
                        {company.email ? (
                            <p className="text-xs text-gray-400 dark:text-slate-500">{company.email}</p>
                        ) : (
                            company.users?.find(u => u.role === 'admin')?.email && (
                                <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                                    {company.users.find(u => u.role === 'admin').email}
                                </p>
                            )
                        )}

                        <div className="space-y-2.5 mt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 dark:text-slate-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Users</span>
                                <span className="text-gray-600 dark:text-slate-300 font-medium">{company.users?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 dark:text-slate-500 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Period</span>
                                <span className="text-gray-600 dark:text-slate-300 capitalize">{company.subscriptionPeriod || 'monthly'}</span>
                            </div>
                            {company.renewalDate && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400 dark:text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Renewal</span>
                                    <span className="text-gray-600 dark:text-slate-300">{new Date(company.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${company.plan
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'bg-gray-200 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border border-gray-400 dark:border-slate-600'
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

                {filteredCompanies.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-slate-400">No companies found matching your criteria.</p>
                    </div>
                )}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Company</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Users</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Renewal</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                {filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 shrink-0 cursor-pointer hover:bg-indigo-600/20 transition-colors" onClick={() => navigate(`/companies/${company.id}`)}>
                                                    <Building2 className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <div 
                                                        className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-500 transition-colors"
                                                        onClick={() => navigate(`/companies/${company.id}`)}
                                                    >
                                                        {company.companyName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-400">
                                                        {company.email || (company.users?.find(u => u.role === 'admin')?.email) || 'No email'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${company.plan
                                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                : 'bg-gray-200 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border border-gray-400 dark:border-slate-600'
                                                }`}>
                                                {company.plan?.name || 'No Plan'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[company.subscriptionStatus] || statusColors.active}`}>
                                                    {(company.subscriptionStatus || 'active').replace('_', ' ')}
                                                </span>
                                                {company.subscriptionStatus === 'pending_payment' && (
                                                    <button
                                                        onClick={() => handleActivate(company.id)}
                                                        className="text-[10px] font-medium text-emerald-500 hover:text-emerald-400 flex items-center gap-1 mt-1"
                                                    >
                                                        <CheckCircle className="w-3 h-3" /> Activate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-300">
                                                <Users className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                                <span className="font-medium">{company.users?.length || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            {company.renewalDate ? (
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-slate-300">
                                                    <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                                    <span>{new Date(company.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-slate-500">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEdit(company)}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg transition-colors"
                                                    title="Edit Company"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleLoginAsCompany(company.id)}
                                                    className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                    title="Login as Company"
                                                >
                                                    <LogIn className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/companies/${company.id}`)}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(company)}
                                                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Company"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCompanies.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center">
                                            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-slate-400">No companies found matching your criteria.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register New Company</h3>
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
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Company — {editingCompany?.companyName}</h3>
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
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Company</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                                Delete <span className="text-gray-900 dark:text-white font-medium">{companyToDelete?.companyName}</span> and all associated data? This cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setCompanyToDelete(null); }}
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
