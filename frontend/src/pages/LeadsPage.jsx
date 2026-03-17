import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, X, Filter, Download, Upload, ChevronLeft, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import LeadDetailDrawer from '../components/LeadDetailDrawer';
import WhatsAppChat from '../components/WhatsAppChat';
import BrowserDialer from '../components/BrowserDialer';

const statusColors = {
    new: 'bg-blue-500/20 text-blue-400',
    contacted: 'bg-yellow-500/20 text-yellow-400',
    follow_up: 'bg-orange-500/20 text-orange-400',
    converted: 'bg-emerald-500/20 text-emerald-400',
    lost: 'bg-red-500/20 text-red-400',
};

const sourceColors = {
    meta_ads: 'bg-blue-600/20 text-blue-400',
    google_ads: 'bg-red-500/20 text-red-400',
    justdial: 'bg-cyan-500/20 text-cyan-400',
    indiamart: 'bg-orange-500/20 text-orange-400',
    tradeindia: 'bg-emerald-500/20 text-emerald-400',
    website: 'bg-purple-500/20 text-purple-400',
    whatsapp: 'bg-green-600/20 text-green-400',
    manual: 'bg-slate-600/20 text-slate-400',
};

const emptyForm = {
    name: '',
    phone: '',
    email: '',
    source: 'manual',
    status: 'new',
    assignedTo: '',
    notes: '',
    followUpDate: '',
};

export default function LeadsPage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filters, setFilters] = useState({ status: '', source: '', dateRange: '', assigned: '' });
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [activeSources, setActiveSources] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState(null); // { type: 'status' | 'assign', value: '' }
    const [whatsAppLead, setWhatsAppLead] = useState(null);
    const [callingLead, setCallingLead] = useState(null);

    // Fetch active integration sources on mount
    useEffect(() => {
        const fetchActiveSources = async () => {
            try {
                const res = await api.get('/integrations/status').catch(() => null);
                if (res?.data) {
                    const sources = [{ key: 'manual', label: 'Manual' }];
                    if (res.data.meta) sources.push({ key: 'meta_ads', label: 'Meta Ads' });
                    if (res.data.google) sources.push({ key: 'google_ads', label: 'Google Ads' });
                    if (res.data.indiamart) sources.push({ key: 'indiamart', label: 'IndiaMart' });
                    if (res.data.tradeindia) sources.push({ key: 'tradeindia', label: 'Trade India' });
                    if (res.data.justdial) sources.push({ key: 'justdial', label: 'JustDial' });
                    sources.push({ key: 'website', label: 'Website' });
                    sources.push({ key: 'whatsapp', label: 'WhatsApp' });
                    setActiveSources(sources);
                }
            } catch {
                // Fallback to all sources
                setActiveSources([
                    { key: 'manual', label: 'Manual' },
                    { key: 'meta_ads', label: 'Meta Ads' },
                    { key: 'google_ads', label: 'Google Ads' },
                    { key: 'indiamart', label: 'IndiaMart' },
                    { key: 'tradeindia', label: 'Trade India' },
                    { key: 'justdial', label: 'JustDial' },
                    { key: 'website', label: 'Website' },
                    { key: 'whatsapp', label: 'WhatsApp' },
                ]);
            }
        };
        fetchActiveSources();
    }, []);

    useEffect(() => {
        loadData();
    }, [filters, page, limit, customDateFrom, customDateTo]);

    const getDateRange = () => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        switch (filters.dateRange) {
            case 'today': {
                return { dateFrom: todayStr, dateTo: todayStr };
            }
            case 'yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yStr = yesterday.toISOString().split('T')[0];
                return { dateFrom: yStr, dateTo: yStr };
            }
            case 'this_week': {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return { dateFrom: startOfWeek.toISOString().split('T')[0], dateTo: todayStr };
            }
            case 'this_month': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                return { dateFrom: startOfMonth.toISOString().split('T')[0], dateTo: todayStr };
            }
            case 'custom': {
                return { dateFrom: customDateFrom || undefined, dateTo: customDateTo || undefined };
            }
            default:
                return {};
        }
    };

    const loadData = async () => {
        try {
            const params = new URLSearchParams();
            params.set('page', page);
            params.set('limit', limit);
            if (filters.status) params.set('status', filters.status);
            if (filters.source) params.set('source', filters.source);
            if (filters.assigned) params.set('assigned', filters.assigned);

            const dateRange = getDateRange();
            if (dateRange.dateFrom) params.set('dateFrom', dateRange.dateFrom);
            if (dateRange.dateTo) params.set('dateTo', dateRange.dateTo);

            const [leadsRes, usersRes] = await Promise.all([
                api.get(`/leads?${params.toString()}`).catch(() => ({ data: { data: [], total: 0 } })),
                api.get('/users').catch(() => ({ data: [] })),
            ]);

            // Handle both array (legacy) and paginated response for safety
            if (Array.isArray(leadsRes.data)) {
                setLeads(leadsRes.data);
                setTotal(leadsRes.data.length);
            } else {
                setLeads(leadsRes.data.data || []);
                setTotal(leadsRes.data.total || 0);
            }
            setUsers(usersRes.data);
        } catch (err) {
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (lead) => {
        // Format followUpDate for datetime-local input (YYYY-MM-DDTHH:MM)
        let followUpDateTime = '';
        if (lead.followUpDate) {
            const date = new Date(lead.followUpDate);
            followUpDateTime = date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
        }

        setForm({
            name: lead.name,
            phone: lead.phone || '',
            email: lead.email || '',
            source: lead.source,
            status: lead.status,
            assignedTo: lead.assignedTo || '',
            notes: lead.notes || '',
            followUpDate: followUpDateTime,
        });
        setEditingId(lead.id);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate follow-up date is required when status is follow_up
        if (form.status === 'follow_up' && !form.followUpDate) {
            toast.error('Follow-up date and time are required when status is Follow Up');
            return;
        }

        try {
            const payload = {
                ...form,
                companyId: user.companyId,
                assignedTo: form.assignedTo || null,
                // Send null if date is cleared (empty string), otherwise send the date value or undefined
                followUpDate: form.followUpDate === '' ? null : (form.followUpDate || undefined),
            };

            if (editingId) {
                await api.patch(`/leads/${editingId}`, payload);
                toast.success('Lead updated');
            } else {
                await api.post('/leads', payload);
                toast.success('Lead created');
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            // Display backend error message if available
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save';
            toast.error(errorMessage);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this lead?')) return;
        try {
            await api.delete(`/leads/${id}`);
            toast.success('Lead deleted');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleExportCsv = async () => {
        try {
            const res = await api.get('/leads/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'leads.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('CSV exported');
        } catch {
            toast.error('Export failed');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(leads.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkUpdate = async (type, value) => {
        try {
            if (!value) return;

            // Prevent changing to follow_up status without a follow-up date in bulk
            if (type === 'status' && value === 'follow_up') {
                toast.error('Cannot bulk update to Follow Up status. Please update leads individually to set follow-up date and time.');
                return;
            }

            const payload = { ids: selectedIds, updates: {} };
            if (type === 'status') payload.updates.status = value;
            if (type === 'assign') payload.updates.assignedTo = value === 'unassigned' ? null : value;

            await api.patch('/leads/bulk', payload);
            toast.success(`Updated ${selectedIds.length} leads`);
            setSelectedIds([]);
            setBulkAction(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk update failed');
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} leads? This cannot be undone.`)) return;
        try {
            await api.delete('/leads/bulk', { data: { ids: selectedIds } });
            toast.success(`Deleted ${selectedIds.length} leads`);
            setSelectedIds([]);
            loadData();
        } catch (err) {
            toast.error('Bulk delete failed');
        }
    };

    const handleImportCsv = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const res = await api.post('/leads/import', { csvText: ev.target.result });
                    toast.success(`Imported ${res.data.imported} leads`);
                    if (res.data.errors?.length) {
                        res.data.errors.forEach((err) => toast.error(err));
                    }
                    loadData();
                } catch {
                    toast.error('Import failed');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const canAssign = user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager';
    const canDelete = user.role === 'super_admin' || user.role === 'admin'; // Managers can't delete by default unless specified

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Leads</h2>
                    <p className="text-slate-400 mt-1">{total} leads total</p>
                </div>
                {canAssign && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all border border-slate-700"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button
                            onClick={handleImportCsv}
                            className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-all border border-slate-700"
                        >
                            <Upload className="w-4 h-4" />
                            Import
                        </button>
                        <button
                            id="add-lead-btn"
                            onClick={openCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25"
                        >
                            <Plus className="w-4 h-4" />
                            Add Lead
                        </button>
                    </div>
                )}
            </div>

            {/* Status Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {[
                    { key: '', label: 'All Leads' },
                    { key: 'new', label: 'New' },
                    { key: 'contacted', label: 'Contacted' },
                    { key: 'follow_up', label: 'Follow Up' },
                    { key: 'converted', label: 'Converted' },
                    { key: 'lost', label: 'Lost' },
                    { key: 'assigned', label: 'Assigned' },
                ].map((tab) => {
                    const isActive = tab.key === 'assigned'
                        ? filters.assigned === 'true' && !filters.status
                        : filters.status === tab.key && filters.assigned !== 'true';
                    return (
                        <button
                            key={tab.key}
                            onClick={() => {
                                if (tab.key === 'assigned') {
                                    setFilters({ ...filters, status: '', assigned: 'true' });
                                } else {
                                    setFilters({ ...filters, status: tab.key, assigned: '' });
                                }
                                setPage(1);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                    value={filters.status}
                    onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                </select>
                <select
                    value={filters.source}
                    onChange={(e) => { setFilters({ ...filters, source: e.target.value }); setPage(1); }}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Sources</option>
                    {activeSources.map(s => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                </select>
                <select
                    value={filters.dateRange}
                    onChange={(e) => { setFilters({ ...filters, dateRange: e.target.value }); setPage(1); }}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="custom">Custom Range</option>
                </select>
                {filters.dateRange === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customDateFrom}
                            onChange={(e) => { setCustomDateFrom(e.target.value); setPage(1); }}
                            className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-slate-500 text-xs">to</span>
                        <input
                            type="date"
                            value={customDateTo}
                            onChange={(e) => { setCustomDateTo(e.target.value); setPage(1); }}
                            className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                )}
                {(filters.status || filters.source || filters.dateRange || filters.assigned) && (
                    <button
                        onClick={() => { setFilters({ status: '', source: '', dateRange: '', assigned: '' }); setCustomDateFrom(''); setCustomDateTo(''); setPage(1); }}
                        className="text-xs text-slate-400 hover:text-white px-3 py-2 bg-slate-800 rounded-xl"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Leads Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                <th className="w-12 px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={leads.length > 0 && selectedIds.length === leads.length}
                                        onChange={handleSelectAll}
                                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 transition-all"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Updated By</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {leads.map((lead) => (
                                <tr key={lead.id} className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${selectedIds.includes(lead.id) ? 'bg-slate-800/60' : ''}`} onClick={() => setSelectedLead(lead)}>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(lead.id)}
                                            onChange={() => handleSelectOne(lead.id)}
                                            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 transition-all"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-white">{lead.name}</p>
                                        {lead.notes && (
                                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{lead.notes}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-300">{lead.phone || '—'}</p>
                                        <p className="text-xs text-slate-500">{lead.email || ''}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${sourceColors[lead.source] || 'bg-slate-700 text-slate-300'}`}>
                                            {lead.source?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[lead.status] || 'bg-slate-700 text-slate-300'}`}>
                                            {lead.status?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {lead.assignedUser?.email?.split('@')[0] || '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {lead.lastUpdatedByUser ? (
                                            <span className={lead.lastUpdatedBy !== lead.assignedTo ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                                                {lead.lastUpdatedByUser.name || lead.lastUpdatedByUser.email?.split('@')[0]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(lead.createdAt).toLocaleDateString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {lead.phone && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setCallingLead(lead); }}
                                                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                                                        title="Call"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setWhatsAppLead(lead); }}
                                                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all cursor-pointer"
                                                        title="WhatsApp Chat"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEdit(lead); }}
                                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all cursor-pointer"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {canDelete && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {leads.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                        No leads found. {canAssign ? 'Click "Add Lead" to create one.' : 'No leads assigned to you yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm text-slate-400">
                <div>
                    Showing {Math.min((page - 1) * limit + 1, total)} to {Math.min(page * limit, total)} of {total} leads
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-white font-medium">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
                    <button
                        onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                        disabled={page >= Math.ceil(total / limit)}
                        className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 flex items-center gap-4 z-40 animate-in slide-in-from-bottom-4">
                    <span className="text-white font-medium">{selectedIds.length} selected</span>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <select
                            className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => handleBulkUpdate('status', e.target.value)}
                            value=""
                        >
                            <option value="" disabled>Change Status</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                        </select>
                        {canAssign && (
                            <select
                                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                onChange={(e) => handleBulkUpdate('assign', e.target.value)}
                                value=""
                            >
                                <option value="" disabled>Assign To</option>
                                <option value="unassigned">Unassigned</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.email}</option>
                                ))}
                            </select>
                        )}
                        <div className="h-6 w-px bg-slate-700" />
                        {canDelete && (
                            <button
                                onClick={handleBulkDelete}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Delete Selected"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setSelectedIds([])}
                            className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Clear Selection"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900 z-10 rounded-t-2xl">
                                <h3 className="text-lg font-semibold text-white">
                                    {editingId ? 'Edit Lead' : 'New Lead'}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Lead name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
                                        <input
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="9876543210"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="lead@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Source</label>
                                        <select
                                            value={form.source}
                                            onChange={(e) => setForm({ ...form, source: e.target.value })}
                                            disabled={!canAssign}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <option value="manual">Manual</option>
                                            <option value="meta_ads">Meta Ads</option>
                                            <option value="google_ads">Google Ads</option>
                                            <option value="justdial">JustDial</option>
                                            <option value="website">Website</option>
                                            <option value="whatsapp">WhatsApp</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                                        <select
                                            value={form.status}
                                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="follow_up">Follow Up</option>
                                            <option value="converted">Converted</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Assign To</label>
                                        <select
                                            value={form.assignedTo}
                                            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                                            disabled={!canAssign}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.email} ({u.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                            Follow-up Date & Time{form.status === 'follow_up' && <span className="text-red-400"> *</span>}
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={form.followUpDate}
                                            onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                                            required={form.status === 'follow_up'}
                                            step="60"
                                            className={`w-full px-4 py-2.5 bg-slate-800 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] ${
                                                form.status === 'follow_up' ? 'border-orange-500' : 'border-slate-700'
                                            }`}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                        {form.status === 'follow_up' && !form.followUpDate && (
                                            <p className="text-xs text-orange-400 mt-1">Required for Follow Up status (include time)</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        placeholder="Add notes about this lead..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-all font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-600/25"
                                    >
                                        {editingId ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Lead Detail Drawer */}
            {
                selectedLead && (
                    <LeadDetailDrawer
                        lead={selectedLead}
                        onClose={() => setSelectedLead(null)}
                        onUpdate={loadData}
                    />
                )
            }

            {/* WhatsApp In-CRM Chat */}
            {whatsAppLead && (
                <WhatsAppChat lead={whatsAppLead} onClose={() => setWhatsAppLead(null)} />
            )}

            {/* Browser Dialer */}
            {callingLead && (
                <BrowserDialer lead={callingLead} onClose={() => setCallingLead(null)} />
            )}
        </div >
    );
}
