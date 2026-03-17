import { useState, useEffect } from 'react';
import { Users, Upload, Plus, Search, Filter, Tag, List, Download, UserCheck, UserX } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';

export default function WhatsAppContactsPage() {
    const [contacts, setContacts] = useState([]);
    const [lists, setLists] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [filters, setFilters] = useState({ listId: '', tagId: '', optedIn: '', search: '' });
    const [importFile, setImportFile] = useState(null);
    const [stats, setStats] = useState({ total: 0, optedIn: 0, optedOut: 0, pending: 0 });

    const [contactForm, setContactForm] = useState({
        name: '',
        phone: '',
        email: '',
        notes: '',
        isOptedIn: false,
        optInSource: 'manual',
    });

    const [listForm, setListForm] = useState({ name: '', description: '', color: '#6366f1' });
    const [tagForm, setTagForm] = useState({ name: '', color: '#10b981' });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.listId) params.set('listId', filters.listId);
            if (filters.tagId) params.set('tagId', filters.tagId);
            if (filters.optedIn) params.set('optedIn', filters.optedIn);
            if (filters.search) params.set('search', filters.search);

            const [contactsRes, listsRes, tagsRes, statsRes] = await Promise.all([
                api.get(`/whatsapp-crm/contacts?${params}`),
                api.get('/whatsapp-crm/lists'),
                api.get('/whatsapp-crm/tags'),
                api.get('/whatsapp-crm/stats/opt-in'),
            ]);

            setContacts(contactsRes.data);
            setLists(listsRes.data);
            setTags(tagsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateContact = async (e) => {
        e.preventDefault();
        try {
            if (selectedContact) {
                await api.put(`/whatsapp-crm/contacts/${selectedContact.id}`, contactForm);
                toast.success('Contact updated');
            } else {
                await api.post('/whatsapp-crm/contacts', contactForm);
                toast.success('Contact created');
            }
            setShowContactModal(false);
            setSelectedContact(null);
            setContactForm({ name: '', phone: '', email: '', notes: '', isOptedIn: false, optInSource: 'manual' });
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save contact');
        }
    };

    const handleImportContacts = async (e) => {
        e.preventDefault();
        if (!importFile) {
            toast.error('Please select a CSV file');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target.result;
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

                const contacts = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const values = lines[i].split(',');
                    const contact = {};
                    headers.forEach((header, index) => {
                        contact[header] = values[index]?.trim();
                    });

                    if (contact.name && contact.phone) {
                        contacts.push({
                            name: contact.name,
                            phone: contact.phone,
                            email: contact.email || '',
                            notes: contact.notes || '',
                            isOptedIn: contact.isoptedin === 'true' || contact.isoptedin === '1',
                            optInSource: 'imported',
                        });
                    }
                }

                const res = await api.post('/whatsapp-crm/contacts/import', {
                    contacts,
                    skipDuplicates: true,
                    defaultOptInSource: 'imported',
                });

                toast.success(`Imported ${res.data.imported} contacts. Skipped ${res.data.skipped} duplicates.`);
                if (res.data.errors.length > 0) {
                    console.error('Import errors:', res.data.errors);
                }
                setShowImportModal(false);
                setImportFile(null);
                loadData();
            };
            reader.readAsText(importFile);
        } catch (err) {
            toast.error('Failed to import contacts');
        }
    };

    const handleToggleOptIn = async (contact) => {
        try {
            await api.put(`/whatsapp-crm/contacts/${contact.id}/opt-in`, {
                optedIn: !contact.isOptedIn,
                source: 'manual',
            });
            toast.success(contact.isOptedIn ? 'Contact opted out' : 'Contact opted in');
            loadData();
        } catch (err) {
            toast.error('Failed to update opt-in status');
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        try {
            await api.post('/whatsapp-crm/lists', listForm);
            toast.success('List created');
            setShowListModal(false);
            setListForm({ name: '', description: '', color: '#6366f1' });
            loadData();
        } catch (err) {
            toast.error('Failed to create list');
        }
    };

    const handleCreateTag = async (e) => {
        e.preventDefault();
        try {
            await api.post('/whatsapp-crm/tags', tagForm);
            toast.success('Tag created');
            setShowTagModal(false);
            setTagForm({ name: '', color: '#10b981' });
            loadData();
        } catch (err) {
            toast.error('Failed to create tag');
        }
    };

    const downloadSampleCSV = () => {
        const csv = 'name,phone,email,notes,isOptedIn\nJohn Doe,+919876543210,john@example.com,Sample contact,true\nJane Smith,+919876543211,jane@example.com,Another contact,false';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_contacts.csv';
        a.click();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-green-400" />
                            WhatsApp Contacts
                        </h1>
                        <p className="text-slate-400 mt-1">Manage your WhatsApp contacts, lists, and tags</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowListModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2"
                        >
                            <List className="w-4 h-4" />
                            New List
                        </button>
                        <button
                            onClick={() => setShowTagModal(true)}
                            className="px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 flex items-center gap-2"
                        >
                            <Tag className="w-4 h-4" />
                            New Tag
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Import CSV
                        </button>
                        <button
                            onClick={() => { setSelectedContact(null); setShowContactModal(true); }}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Contact
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1">Total Contacts</div>
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-green-500/20">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-green-400" />
                            Opted In
                        </div>
                        <div className="text-2xl font-bold text-green-400">{stats.optedIn}</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-red-500/20">
                        <div className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                            <UserX className="w-4 h-4 text-red-400" />
                            Opted Out
                        </div>
                        <div className="text-2xl font-bold text-red-400">{stats.optedOut}</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="text-slate-400 text-sm mb-1">Pending</div>
                        <div className="text-2xl font-bold text-slate-400">{stats.pending}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <div className="flex-1 flex gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search contacts..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <select
                                value={filters.listId}
                                onChange={(e) => setFilters({ ...filters, listId: e.target.value })}
                                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">All Lists</option>
                                {lists.map(list => (
                                    <option key={list.id} value={list.id}>{list.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.tagId}
                                onChange={(e) => setFilters({ ...filters, tagId: e.target.value })}
                                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">All Tags</option>
                                {tags.map(tag => (
                                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.optedIn}
                                onChange={(e) => setFilters({ ...filters, optedIn: e.target.value })}
                                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">All Status</option>
                                <option value="true">Opted In</option>
                                <option value="false">Not Opted In</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contacts Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Phone</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Lists</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Tags</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Opt-in Status</th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td>
                                </tr>
                            ) : contacts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No contacts found. Click "Add Contact" or "Import CSV" to get started.
                                    </td>
                                </tr>
                            ) : (
                                contacts.map(contact => (
                                    <tr key={contact.id} className="hover:bg-slate-700/50">
                                        <td className="px-6 py-4 text-white">{contact.name}</td>
                                        <td className="px-6 py-4 text-slate-300">{contact.phone}</td>
                                        <td className="px-6 py-4 text-slate-300">{contact.email || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {contact.lists?.map(list => (
                                                    <span
                                                        key={list.id}
                                                        className="px-2 py-1 rounded-full text-xs"
                                                        style={{ backgroundColor: list.color + '20', color: list.color }}
                                                    >
                                                        {list.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {contact.tags?.map(tag => (
                                                    <span
                                                        key={tag.id}
                                                        className="px-2 py-1 rounded-full text-xs"
                                                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                                    >
                                                        {tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleOptIn(contact)}
                                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                                    contact.isOptedIn
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-slate-700 text-slate-400 border border-slate-600'
                                                }`}
                                            >
                                                {contact.isOptedIn ? '✓ Opted In' : 'Not Opted In'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedContact(contact);
                                                    setContactForm({
                                                        name: contact.name,
                                                        phone: contact.phone,
                                                        email: contact.email || '',
                                                        notes: contact.notes || '',
                                                        isOptedIn: contact.isOptedIn,
                                                        optInSource: contact.optInSource || 'manual',
                                                    });
                                                    setShowContactModal(true);
                                                }}
                                                className="text-blue-400 hover:text-blue-300 text-sm"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-6 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Import Contacts from CSV</h2>
                        <form onSubmit={handleImportContacts}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    CSV should have columns: name, phone, email, notes, isOptedIn
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={downloadSampleCSV}
                                className="mb-4 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Sample CSV
                            </button>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowImportModal(false); setImportFile(null); }}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                                >
                                    Import
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-6 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            {selectedContact ? 'Edit Contact' : 'Add Contact'}
                        </h2>
                        <form onSubmit={handleCreateContact}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                                    <input
                                        type="text"
                                        value={contactForm.name}
                                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone *</label>
                                    <input
                                        type="tel"
                                        value={contactForm.phone}
                                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Opt-in Source</label>
                                    <select
                                        value={contactForm.optInSource}
                                        onChange={(e) => setContactForm({ ...contactForm, optInSource: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                    >
                                        <option value="manual">Manual</option>
                                        <option value="website">Website Form</option>
                                        <option value="imported">Imported</option>
                                        <option value="lead_form">Lead Form</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                <textarea
                                    value={contactForm.notes}
                                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={contactForm.isOptedIn}
                                        onChange={(e) => setContactForm({ ...contactForm, isOptedIn: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm text-slate-300">Contact has opted in to receive WhatsApp messages</span>
                                </label>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowContactModal(false); setSelectedContact(null); }}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                                >
                                    {selectedContact ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List Modal */}
            {showListModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Create List</h2>
                        <form onSubmit={handleCreateList}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">List Name *</label>
                                <input
                                    type="text"
                                    value={listForm.name}
                                    onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                                <textarea
                                    value={listForm.description}
                                    onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                                <input
                                    type="color"
                                    value={listForm.color}
                                    onChange={(e) => setListForm({ ...listForm, color: e.target.value })}
                                    className="w-full h-12 rounded-xl border border-slate-700 cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowListModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tag Modal */}
            {showTagModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Create Tag</h2>
                        <form onSubmit={handleCreateTag}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Tag Name *</label>
                                <input
                                    type="text"
                                    value={tagForm.name}
                                    onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                                <input
                                    type="color"
                                    value={tagForm.color}
                                    onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                                    className="w-full h-12 rounded-xl border border-slate-700 cursor-pointer"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTagModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
