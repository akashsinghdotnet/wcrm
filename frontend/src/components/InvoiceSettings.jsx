import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FileText, Upload } from 'lucide-react';

export default function InvoiceSettings() {
    const { user } = useAuth();
    const isSuperadminTeam = ['super_admin', 'superadmin_admin'].includes(user?.role);
    const settingsId = isSuperadminTeam ? 'super-admin' : user?.companyId;

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            e.target.value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(f => ({ ...f, logoUrl: reader.result }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleQrUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            e.target.value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setForm(f => ({ ...f, upiQrUrl: reader.result }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const [form, setForm] = useState({
        logoUrl: '',
        address: '',
        gstNo: '',
        prefix: 'INV-',
        terms: 'Payment is due within 15 days.',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        upiId: '',
        upiQrUrl: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!settingsId) return;
        api.get(`/billing/settings/${settingsId}`)
            .then(res => {
                if (res.data) {
                    setForm({
                        logoUrl: res.data.logoUrl || '',
                        address: res.data.address || '',
                        gstNo: res.data.gstNo || '',
                        prefix: res.data.prefix || 'INV-',
                        terms: res.data.terms || 'Payment is due within 15 days.',
                        bankName: res.data.bankName || '',
                        accountNumber: res.data.accountNumber || '',
                        ifscCode: res.data.ifscCode || '',
                        accountHolderName: res.data.accountHolderName || '',
                        upiId: res.data.upiId || '',
                        upiQrUrl: res.data.upiQrUrl || '',
                    });
                }
            })
            .catch(() => {
                toast.error('Failed to load invoice settings');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [settingsId]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/billing/settings/${settingsId}`, form);
            toast.success('Invoice settings updated');
        } catch (err) {
            toast.error('Failed to update invoice settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-slate-500 animate-pulse">Loading settings...</div>;
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Invoice Settings</h3>
                    <p className="text-sm text-slate-400">
                        {isSuperadminTeam
                            ? 'Configure invoice settings for system-generated and manually created invoices.'
                            : 'Configure how your invoices appear to clients.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Logo</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-full sm:flex-1 space-y-2">
                            <input
                                value={form.logoUrl?.startsWith('data:') ? '' : (form.logoUrl || '')}
                                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="https://example.com/logo.png"
                            />
                            <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-white hover:border-indigo-500 cursor-pointer transition-all text-sm w-full justify-center sm:justify-start">
                                <Upload className="w-4 h-4" />
                                Upload Logo (max 5MB)
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                        </div>
                        {form.logoUrl && (
                            <div className="w-16 h-16 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center p-1 relative group">
                                <img src={form.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, logoUrl: '' })}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >x</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">GST Number (Optional)</label>
                        <input
                            value={form.gstNo}
                            onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="GSTIN123..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Invoice Prefix</label>
                        <input
                            value={form.prefix}
                            onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="INV-"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Address</label>
                    <textarea
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="123 Business Avenue, Tech Hub..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Default Terms & Conditions</label>
                    <textarea
                        value={form.terms}
                        onChange={(e) => setForm({ ...form, terms: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Payment is due within 15 days..."
                    />
                </div>

                {/* Payment Details Section */}
                <div className="pt-4 border-t border-slate-800">
                    <h4 className="text-md font-semibold text-white mb-4">Payment Details</h4>
                    <p className="text-xs text-slate-400 mb-4">These details will be shown on your invoices for clients to make payments.</p>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Bank Name</label>
                                <input
                                    value={form.bankName}
                                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="State Bank of India"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Holder Name</label>
                                <input
                                    value={form.accountHolderName}
                                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Your Business Name"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Number</label>
                                <input
                                    value={form.accountNumber}
                                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="1234567890"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">IFSC Code</label>
                                <input
                                    value={form.ifscCode}
                                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="SBIN0001234"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">UPI ID</label>
                                <input
                                    value={form.upiId}
                                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="business@upi"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">UPI QR Code</label>
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    <div className="w-full sm:flex-1 space-y-2">
                                        <input
                                            value={form.upiQrUrl?.startsWith('data:') ? '' : (form.upiQrUrl || '')}
                                            onChange={(e) => setForm({ ...form, upiQrUrl: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="https://example.com/qr.png"
                                        />
                                        <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 border-dashed rounded-xl text-slate-400 hover:text-white hover:border-indigo-500 cursor-pointer transition-all text-sm w-full justify-center sm:justify-start">
                                            <Upload className="w-4 h-4" />
                                            Upload QR (max 5MB)
                                            <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                                        </label>
                                    </div>
                                    {form.upiQrUrl && (
                                        <div className="w-16 h-16 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center p-1 relative group">
                                            <img src={form.upiQrUrl} alt="QR Preview" className="max-w-full max-h-full object-contain" />
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, upiQrUrl: '' })}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >x</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
