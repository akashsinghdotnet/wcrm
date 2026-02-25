import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, FileText, Calendar, Building } from 'lucide-react';
import dayjs from 'dayjs';

export default function CreateInvoicePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Access control
    if (user?.role === 'staff' && !user?.canCreateInvoices) {
        return <Navigate to="/" replace />;
    }

    const [clients, setClients] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [useManualEntry, setUseManualEntry] = useState(false);

    const [form, setForm] = useState({
        clientId: '',
        guestClientName: '',
        guestClientEmail: '',
        guestClientPhone: '',
        guestClientAddress: '',
        clientGst: '',
        invoiceDate: dayjs().format('YYYY-MM-DD'),
        dueDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
        status: 'pending',
        notes: '',
        taxRate: 18,
        invoiceNumber: '',
    });

    const [items, setItems] = useState([
        { id: 1, description: '', quantity: 1, rate: 0 }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientsRes, settingsRes] = await Promise.all([
                    api.get('/clients?limit=1000'), // Assuming clients endpoint
                    api.get(`/billing/settings/${user.companyId}`)
                ]);

                // NestJS might return { data: [...] } or just an array
                const clientsList = clientsRes.data.data ? clientsRes.data.data : clientsRes.data;
                setClients(clientsList || []);

                if (settingsRes.data) {
                    setSettings(settingsRes.data);
                    if (settingsRes.data.terms) {
                        setForm(f => ({ ...f, notes: settingsRes.data.terms }));
                    }
                }
            } catch (err) {
                toast.error('Failed to load necessary data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.companyId]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', quantity: 1, rate: 0 }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length === 1) return;
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate)), 0);
    const taxAmount = (subtotal * Number(form.taxRate)) / 100;
    const total = subtotal + taxAmount;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!useManualEntry && !form.clientId) {
            toast.error('Please select a client or use manual entry');
            return;
        }

        if (useManualEntry && !form.guestClientName.trim()) {
            toast.error('Please enter client name');
            return;
        }

        if (items.some(item => !item.description.trim())) {
            toast.error('All line items must have a description');
            return;
        }

        setSaving(true);
        try {
            const invoiceData = {
                companyId: user.companyId,
                month: dayjs(form.invoiceDate).format('MMM YYYY'),
                invoiceDate: form.invoiceDate,
                dueDate: form.dueDate,
                status: form.status,
                items: items.map(({ id, ...rest }) => rest), // remove internal UI id
                subtotal,
                tax: taxAmount,
                total,
                amount: total,
                notes: form.notes
            };

            // Add client GST if provided
            if (form.clientGst) {
                invoiceData.clientGst = form.clientGst;
            }
            if (form.invoiceNumber) {
                invoiceData.invoiceNumber = form.invoiceNumber;
            }

            // Add client data based on entry method
            if (useManualEntry) {
                invoiceData.guestClientName = form.guestClientName;
                invoiceData.guestClientEmail = form.guestClientEmail;
                invoiceData.guestClientPhone = form.guestClientPhone;
                invoiceData.guestClientAddress = form.guestClientAddress;
            } else {
                invoiceData.clientId = form.clientId;
            }

            const res = await api.post('/billing', invoiceData);
            toast.success('Invoice created successfully');
            navigate(`/invoices/${res.data.id}`);
        } catch (err) {
            toast.error('Failed to create invoice');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 text-slate-400">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    to="/invoices"
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Create Invoice</h1>
                    <p className="text-sm text-slate-400 mt-1">Fill out the details to generate a new invoice.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">

                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {/* Toggle between client selection and manual entry */}
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Building className="w-4 h-4" /> Billed To
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseManualEntry(!useManualEntry);
                                        setForm({ ...form, clientId: '', guestClientName: '', guestClientEmail: '', guestClientPhone: '', guestClientAddress: '' });
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                >
                                    {useManualEntry ? '← Select from clients' : '✍️ Enter manually'}
                                </button>
                            </div>

                            {!useManualEntry ? (
                                <select
                                    value={form.clientId}
                                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    required
                                >
                                    <option value="" disabled>Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Client Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.guestClientName}
                                            onChange={(e) => setForm({ ...form, guestClientName: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={form.guestClientEmail}
                                            onChange={(e) => setForm({ ...form, guestClientEmail: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={form.guestClientPhone}
                                            onChange={(e) => setForm({ ...form, guestClientPhone: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
                                        <textarea
                                            value={form.guestClientAddress}
                                            onChange={(e) => setForm({ ...form, guestClientAddress: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            placeholder="123 Main St, City, State"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Client GST */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Client GST Number (Optional)</label>
                                <input
                                    type="text"
                                    value={form.clientGst}
                                    onChange={(e) => setForm({ ...form, clientGst: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. 27AABCU9603R1ZM"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Invoice Number
                                    </label>
                                    <input
                                        type="text"
                                        value={form.invoiceNumber}
                                        onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Auto-generated if empty"
                                    />
                                </div>
                                <div className="hidden"></div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Invoice Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.invoiceDate}
                                        onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Due Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.dueDate}
                                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="draft">Draft</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" /> Line Items
                            </h3>
                        </div>

                        <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/30">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700 bg-slate-800/80 text-sm font-medium text-slate-300">
                                <div className="col-span-6 md:col-span-7">Description</div>
                                <div className="col-span-2 text-right">Qty</div>
                                <div className="col-span-2 text-right">Rate</div>
                                <div className="col-span-2 md:col-span-1 text-right"></div>
                            </div>

                            <div className="p-2 space-y-2">
                                {items.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                                        <div className="col-span-6 md:col-span-7">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Item description"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-right focus:outline-none focus:border-indigo-500 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                required
                                                value={item.rate}
                                                onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-right focus:outline-none focus:border-indigo-500 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                disabled={items.length === 1}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Item
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Calculations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes / Terms</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                placeholder="Thank you for your business!"
                            />
                        </div>

                        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4">
                            <div className="flex justify-between items-center text-sm text-slate-300">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-300">
                                <div className="flex items-center gap-2">
                                    <span>GST (%)</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={form.taxRate}
                                        onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-right focus:outline-none"
                                    />
                                </div>
                                <span>₹{taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
                                <span className="text-lg font-bold text-white">Total</span>
                                <span className="text-2xl font-bold text-indigo-400">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-6 md:p-8 bg-slate-800/50 border-t border-slate-800 flex justify-end gap-4">
                    <Link
                        to="/invoices"
                        className="px-6 py-2.5 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                    >
                        {saving ? 'Creating...' : 'Create Invoice'}
                    </button>
                </div>
            </form>
        </div>
    );
}
