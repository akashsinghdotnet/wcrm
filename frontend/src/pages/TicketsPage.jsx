import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Ticket as TicketIcon, UploadCloud, FileText, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TicketsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'announcements'
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ subject: '', department: 'Technical Support', priority: 'Medium', description: '', attachmentUrl: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);

    const isClientUser = ['admin', 'manager'].includes(user?.role);
    const isSuperAdmin = ['super_admin', 'superadmin_admin'].includes(user?.role);

    useEffect(() => {
        if (activeTab === 'tickets') {
            loadTickets();
        } else if (isClientUser) {
            loadAnnouncements();
        }
    }, [activeTab, isClientUser]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tickets');
            setTickets(res.data);
        } catch (err) {
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await api.get('/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setForm({ ...form, attachmentUrl: reader.result });
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tickets', form);
            toast.success('Ticket submitted successfully');
            setShowModal(false);
            setForm({ subject: '', department: 'Technical Support', priority: 'Medium', description: '', attachmentUrl: '' });
            loadTickets();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create ticket');
        }
    };

    if (loading && !tickets.length) {
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your support requests and view system announcements.</p>
                </div>

                {isClientUser && activeTab === 'tickets' && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg"
                    >
                        <Plus className="w-4 h-4" />
                        New Ticket
                    </button>
                )}
            </div>

            {isClientUser && (
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-px">
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tickets'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:border-slate-700'
                            }`}
                    >
                        <TicketIcon className="w-4 h-4" />
                        Support Tickets
                    </button>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'announcements'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:border-slate-700'
                            }`}
                    >
                        <Megaphone className="w-4 h-4" />
                        Announcements
                    </button>
                </div>
            )}

            {loading && tickets.length === 0 && announcements.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : activeTab === 'tickets' ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-slide-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 text-sm">
                                    <th className="p-4 font-medium">Ticket ID</th>
                                    {isSuperAdmin && <th className="p-4 font-medium">Company</th>}
                                    <th className="p-4 font-medium">Department</th>
                                    <th className="p-4 font-medium">Subject</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Last Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800/50 text-sm">
                                {tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={isSuperAdmin ? 6 : 5} className="p-8 text-center text-gray-400 dark:text-slate-500">
                                            <TicketIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            No tickets found.
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map(ticket => (
                                        <tr
                                            key={ticket.id}
                                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                                            className="hover:bg-gray-100 dark:bg-slate-800/30 transition-colors cursor-pointer text-gray-600 dark:text-slate-300"
                                        >
                                            <td className="p-4 font-mono text-indigo-400">{ticket.ticketNumber}</td>
                                            {isSuperAdmin && <td className="p-4">{ticket?.company?.companyName || 'N/A'}</td>}
                                            <td className="p-4">{ticket.department}</td>
                                            <td className="p-4 font-medium text-gray-900 dark:text-white">{ticket.subject}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ticket.status === 'Open' ? 'bg-amber-500/20 text-amber-400' :
                                                    ticket.status === 'Answered' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        'bg-slate-500/20 text-gray-500 dark:text-slate-400'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 dark:text-slate-400">
                                                {new Date(ticket.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-slide-in">
                    {announcements.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                            <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-gray-600 dark:text-slate-300">No Announcements Yet</h3>
                            <p className="text-gray-400 dark:text-slate-500 mt-2">Check back later for company news and updates.</p>
                        </div>
                    ) : (
                        announcements.map((announcement) => (
                            <div key={announcement.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:border-gray-300 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{announcement.title}</h3>
                                    <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-300 dark:border-slate-700">
                                        {new Date(announcement.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="prose prose-invert prose-indigo max-w-none text-gray-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3"
                                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                                />
                                <button
                                    onClick={() => setExpandedAnnouncement(announcement)}
                                    className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                                >
                                    Read Full Announcement →
                                </button>
                                <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-800 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                        {announcement.author?.email?.[0]?.toUpperCase() || 'A'}
                                    </span>
                                    Posted by {announcement.author?.name || announcement.author?.email}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Ticket Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Raise a Support Ticket</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Subject *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Brief description of the issue"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Department</label>
                                    <select
                                        value={form.department}
                                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Sales">Sales</option>
                                        <option value="Technical Support">Technical Support</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Priority</label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Description *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Explain your query in detail..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Attachment (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="ticket-file-upload"
                                    />
                                    <label
                                        htmlFor="ticket-file-upload"
                                        className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-slate-500 transition-colors"
                                    >
                                        {isUploading ? (
                                            <span className="text-gray-500 dark:text-slate-400">Uploading...</span>
                                        ) : form.attachmentUrl ? (
                                            <span className="flex items-center gap-2 text-indigo-400">
                                                <FileText className="w-5 h-5" />
                                                File Attached (Click to change)
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                                                <UploadCloud className="w-5 h-5" />
                                                Click to upload a file (Max 2MB)
                                            </span>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                            >
                                Submit Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Expanded Announcement Modal */}
            {expandedAnnouncement && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white pr-8">{expandedAnnouncement.title}</h3>
                            <button
                                onClick={() => setExpandedAnnouncement(null)}
                                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200 dark:border-slate-800/50">
                                <span className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                                    {expandedAnnouncement.author?.email?.[0]?.toUpperCase() || 'A'}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                                        {expandedAnnouncement.author?.name || expandedAnnouncement.author?.email}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500">
                                        {new Date(expandedAnnouncement.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                            </div>
                            <div
                                className="prose prose-invert prose-indigo max-w-none text-gray-600 dark:text-slate-300 text-base leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: expandedAnnouncement.content }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
