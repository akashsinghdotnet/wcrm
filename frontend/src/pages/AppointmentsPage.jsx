import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Video, Mail, User, Phone, FileText, X, ArrowLeft, MessageCircle, Filter, Trash2, Download } from 'lucide-react';
import { useModules } from '../context/ModuleContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppointmentsPage() {
    const { hasModule } = useModules();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({ date: '', startTime: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [deleteModal, setDeleteModal] = useState(null); // holds appointment to delete
    const isAdmin = user?.role === 'admin';

    // Navigate to CRM's own Email tab with pre-filled contact info
    const handleEmailIcon = (email, name) => {
        navigate('/marketing', { state: { prefillEmail: email, prefillName: name } });
    };

    // Navigate to the full WhatsApp chat UI — always opens the real chat interface
    const handleWhatsappIcon = async (phone, name) => {
        try {
            const digits = phone.replace(/[^0-9]/g, '');
            const last10 = digits.slice(-10);
            const res = await api.get(`/leads?search=${encodeURIComponent(last10)}&limit=5`);
            const leads = res.data?.data || res.data || [];
            const match = leads.find(l => l.phone?.replace(/[^0-9]/g, '').includes(last10));
            if (match) {
                // Lead exists → full chat with history
                navigate(`/whatsapp-chats/${match.id}`);
            } else {
                // No lead → full direct chat UI (no history, but same interface)
                const encodedPhone = encodeURIComponent(digits.length === 10 ? '91' + digits : digits);
                navigate(`/whatsapp-direct/${encodedPhone}?name=${encodeURIComponent(name || phone)}`);
            }
        } catch {
            // On error, still open direct chat UI
            const digits = phone.replace(/[^0-9]/g, '');
            const encodedPhone = encodeURIComponent(digits.length === 10 ? '91' + digits : digits);
            navigate(`/whatsapp-direct/${encodedPhone}?name=${encodeURIComponent(name || phone)}`);
        }
    };

    useEffect(() => {
        fetchAppointments();
        const interval = setInterval(() => {
            fetchAppointments(true);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // Clear selected appointment on navigation
    useEffect(() => {
        setSelectedAppointment(null);
    }, [location.key]);

    const fetchAppointments = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/appointments');
            setAppointments(res.data);
        } catch (err) {
            if (!silent) toast.error('Failed to load appointments');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
        setActionLoading(true);
        try {
            await api.put(`/appointments/${id}/status`, { status: 'cancelled' });
            toast.success('Appointment cancelled');
            setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
            setSelectedAppointment(prev => prev?.id === id ? { ...prev, status: 'cancelled' } : prev);
        } catch (err) {
            toast.error('Failed to cancel appointment');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await api.put(`/appointments/${selectedAppointment.id}/reschedule`, rescheduleData);
            toast.success('Appointment rescheduled successfully');
            setAppointments(appointments.map(a => a.id === selectedAppointment.id ? { ...a, ...res.data } : a));
            setSelectedAppointment(res.data);
            setIsRescheduleModalOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reschedule appointment');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal) return;
        setActionLoading(true);
        try {
            await api.delete(`/appointments/${deleteModal.id}`);
            toast.success('Appointment deleted');
            setAppointments(prev => prev.filter(a => a.id !== deleteModal.id));
            if (selectedAppointment?.id === deleteModal.id) setSelectedAppointment(null);
            setDeleteModal(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete appointment');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExportCSV = () => {
        const rows = [
            ['Name', 'Email', 'Phone', 'Date', 'Start Time', 'End Time', 'Meeting Type', 'Status', 'Notes', 'Booked At'],
            ...filteredAppointments.map(a => [
                a.guestName || '',
                a.guestEmail || '',
                a.guestPhone || '',
                a.date || '',
                a.startTime || '',
                a.endTime || '',
                a.meetingType?.title || '',
                a.status || '',
                (a.guestNotes || '').replace(/,/g, ';'),
                new Date(a.createdAt).toLocaleString('en-IN'),
            ])
        ];
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `appointments_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };



    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Sort so newest bookings are at the top
    const sortedAppointments = [...appointments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filteredAppointments = sortedAppointments.filter(appt => {
        if (filter === 'all') return true;
        const apptDate = new Date(appt.date);
        if (filter === 'today') return appt.date === todayStr;
        if (filter === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return appt.date === tomorrow.toISOString().split('T')[0];
        }
        if (filter === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return appt.date === yesterday.toISOString().split('T')[0];
        }
        if (filter === 'this_month') {
            return apptDate.getMonth() === today.getMonth() && apptDate.getFullYear() === today.getFullYear();
        }
        if (filter === 'this_year') {
            return apptDate.getFullYear() === today.getFullYear();
        }
        if (filter === 'custom') {
            if (customFrom && appt.date < customFrom) return false;
            if (customTo && appt.date > customTo) return false;
            return true;
        }
        return true;
    });

    const upcoming = filteredAppointments.filter(a => a.date >= todayStr && a.status === 'booked');
    const past = filteredAppointments.filter(a => a.date < todayStr || a.status === 'cancelled');

    if (loading) {
        return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    // Appointment Detail View
    if (selectedAppointment) {
        const appt = selectedAppointment;
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <button onClick={() => setSelectedAppointment(null)} className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-500 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Appointments
                </button>

                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
                        <h2 className="text-xl font-bold text-white">{appt.meetingType?.title || 'Meeting'}</h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            {new Date(appt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mb-1">
                                    <Clock className="w-3.5 h-3.5" /> Time
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-white">{appt.startTime} — {appt.endTime}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mb-1">
                                    <Calendar className="w-3.5 h-3.5" /> Status
                                </div>
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${appt.status === 'booked' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                    {appt.status}
                                </span>
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-slate-800" />

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Guest Information</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center"><User className="w-4 h-4 text-indigo-500" /></div>
                                    <div>
                                        <p className="text-xs text-gray-400">Name</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{appt.guestName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center"><Mail className="w-4 h-4 text-sky-500" /></div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400">Email</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{appt.guestEmail}</p>
                                    </div>
                                    {hasModule('MARKETING') && (
                                        <button onClick={() => handleEmailIcon(appt.guestEmail, appt.guestName)} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer" title="Send Email via CRM">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center"><Phone className="w-4 h-4 text-emerald-500" /></div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400">Phone</p>
                                        <p className="font-medium text-gray-900 dark:text-white">{appt.guestPhone || 'No Phone Number'}</p>
                                    </div>
                                    {hasModule('WHATSAPP') && (
                                        <button onClick={() => appt.guestPhone && handleWhatsappIcon(appt.guestPhone, appt.guestName)} className={`p-2 rounded-lg transition-colors cursor-pointer ${appt.guestPhone ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10' : 'text-gray-300 pointer-events-none'}`} title="Send WhatsApp via CRM">
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {appt.guestNotes && (
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mt-0.5"><FileText className="w-4 h-4 text-amber-500" /></div>
                                        <div>
                                            <p className="text-xs text-gray-400">Notes</p>
                                            <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{appt.guestNotes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-slate-800" />

                        <div className="text-xs text-gray-400">
                            Booked on {new Date(appt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        {appt.status === 'booked' && (
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleCancel(appt.id)}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel Appointment
                                </button>
                                <button
                                    onClick={() => {
                                        setRescheduleData({ date: appt.date, startTime: appt.startTime });
                                        setIsRescheduleModalOpen(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    Reschedule
                                </button>
                            </div>
                        )}
                        {isAdmin && (
                            <div className="pt-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteModal(appt); }}
                                    disabled={actionLoading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Appointment
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reschedule Modal */}
                {isRescheduleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-800">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reschedule Appointment</h3>
                                <button onClick={() => setIsRescheduleModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">New Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={rescheduleData.date}
                                        onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">New Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={rescheduleData.startTime}
                                        onChange={(e) => setRescheduleData({ ...rescheduleData, startTime: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading ? 'Saving...' : 'Confirm Reschedule'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-6 h-6 text-red-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Appointment</h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                                    Are you sure you want to permanently delete the appointment for <span className="font-medium text-gray-900 dark:text-white">{deleteModal.guestName}</span>? This cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteModal(null)}
                                    className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-medium disabled:opacity-50"
                                >
                                    {actionLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-indigo-500" />
                        Appointments
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">View all your booked appointments.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="this_month">This Month</option>
                            <option value="this_year">This Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    {filter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-gray-400 text-sm">to</span>
                            <input
                                type="date"
                                value={customTo}
                                min={customFrom}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                        title="Export as CSV"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Upcoming */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Upcoming</h3>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                    {upcoming.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No upcoming appointments.</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-slate-800">
                            {upcoming.map(appt => (
                                <div key={appt.id} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                                    <div className="flex gap-4 items-center flex-1 cursor-pointer" onClick={() => setSelectedAppointment(appt)}>
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <span className="text-xs font-bold uppercase">{new Date(appt.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-lg font-bold leading-none">{new Date(appt.date + 'T00:00:00').getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{appt.guestName}</h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {appt.startTime} - {appt.endTime}</span>
                                                <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {appt.meetingType?.title || 'Meeting'}</span>
                                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {appt.guestPhone || 'No Phone'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasModule('WHATSAPP') && (
                                            <button onClick={() => appt.guestPhone && handleWhatsappIcon(appt.guestPhone, appt.guestName)} className={`p-2 rounded-lg transition-colors cursor-pointer ${appt.guestPhone ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10' : 'text-gray-300 pointer-events-none'}`} title="Send WhatsApp via CRM">
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {appt.guestEmail && hasModule('MARKETING') && (
                                            <button onClick={() => handleEmailIcon(appt.guestEmail, appt.guestName)} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer" title="Send Email via CRM">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span onClick={() => setSelectedAppointment(appt)} className="ml-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 cursor-pointer">
                                            {appt.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Past */}
            {past.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">Past</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                        <div className="divide-y divide-gray-200 dark:divide-slate-800">
                            {past.map(appt => (
                                <div key={appt.id} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left opacity-70 group">
                                    <div className="flex gap-4 items-center flex-1 cursor-pointer" onClick={() => setSelectedAppointment(appt)}>
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
                                            <span className="text-xs font-bold uppercase">{new Date(appt.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                            <span className="text-lg font-bold leading-none">{new Date(appt.date + 'T00:00:00').getDate()}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{appt.guestName}</h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {appt.startTime} - {appt.endTime}</span>
                                                <span>{appt.meetingType?.title || 'Meeting'}</span>
                                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {appt.guestPhone || 'No Phone'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasModule('WHATSAPP') && (
                                            <button onClick={() => appt.guestPhone && handleWhatsappIcon(appt.guestPhone, appt.guestName)} className={`p-2 rounded-lg transition-colors cursor-pointer ${appt.guestPhone ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10' : 'text-gray-300 pointer-events-none'}`} title="Send WhatsApp via CRM">
                                                <MessageCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {appt.guestEmail && hasModule('MARKETING') && (
                                            <button onClick={() => handleEmailIcon(appt.guestEmail, appt.guestName)} className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer" title="Send Email via CRM">
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span onClick={() => setSelectedAppointment(appt)} className="ml-2 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400 capitalize cursor-pointer">
                                            {appt.status === 'booked' ? 'completed' : appt.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Appointment</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                                Are you sure you want to permanently delete the appointment for <span className="font-medium text-gray-900 dark:text-white">{deleteModal.guestName}</span>? This cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal(null)}
                                className="flex-1 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-medium disabled:opacity-50"
                            >
                                {actionLoading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
