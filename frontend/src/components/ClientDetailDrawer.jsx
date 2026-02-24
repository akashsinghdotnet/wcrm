import { useState, useEffect } from 'react';
import { X, Pencil, Trash2, Phone, Mail, Globe, MapPin, IndianRupee, Layers } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-amber-500/20 text-amber-400',
    closed: 'bg-red-500/20 text-red-400',
};

export default function ClientDetailDrawer({ client, isOpen, onClose, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (client) {
            setForm({
                clientName: client.clientName,
                phone: client.phone || '',
                email: client.email || '',
                address: client.address || '',
                gstNo: client.gstNo || '',
                serviceType: client.serviceType || '',
                monthlyFee: client.monthlyFee || '',
                status: client.status,
            });
        }
    }, [client]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const payload = { ...form, monthlyFee: Number(form.monthlyFee) };
            await api.patch(`/clients/${client.id}`, payload);
            toast.success('Client updated');
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            toast.error('Failed to update client');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex-1 min-w-0 pr-4">
                        <h2 className="text-xl font-bold text-white truncate">{client.clientName}</h2>
                        <span className={`inline-flex mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[client.status]}`}>
                            {client.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <Pencil size={18} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Details Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Client Details</h3>
                            {isEditing && (
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            )}
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 space-y-4 border border-slate-800">
                            {/* Form Fields */}
                            <div className="grid gap-4">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Company Name</label>
                                    {isEditing ? (
                                        <input
                                            value={form.clientName}
                                            onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    ) : (
                                        <div className="text-sm text-white font-medium">{client.clientName}</div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Address</label>
                                        {isEditing ? (
                                            <input
                                                value={form.address}
                                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-white">
                                                <MapPin size={14} className="text-slate-400" />
                                                {client.address || '—'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">GST No</label>
                                        {isEditing ? (
                                            <input
                                                value={form.gstNo}
                                                onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        ) : (
                                            <div className="text-sm text-white font-mono">{client.gstNo || '—'}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Status</label>
                                        {isEditing ? (
                                            <select
                                                value={form.status}
                                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="active">Active</option>
                                                <option value="paused">Paused</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        ) : (
                                            <div className="text-sm text-white capitalize">{client.status}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Monthly Fee (₹)</label>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={form.monthlyFee}
                                                onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        ) : (
                                            <div className="text-sm text-white font-mono">
                                                ₹{Number(client.monthlyFee).toLocaleString('en-IN')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Service Type</label>
                                    {isEditing ? (
                                        <input
                                            value={form.serviceType}
                                            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-white">
                                            <Layers size={14} className="text-indigo-400" />
                                            {client.serviceType}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Email</label>
                                        {isEditing ? (
                                            <input
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-white">
                                                <Mail size={14} className="text-slate-400" />
                                                <a href={`mailto:${client.email}`} className="hover:text-indigo-400 transition-colors">{client.email || '—'}</a>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Phone</label>
                                        {isEditing ? (
                                            <input
                                                value={form.phone}
                                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-white">
                                                <Phone size={14} className="text-slate-400" />
                                                <a href={`tel:${client.phone}`} className="hover:text-indigo-400 transition-colors">{client.phone || '—'}</a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
