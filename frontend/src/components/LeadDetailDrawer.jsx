import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    X,
    Phone,
    Mail,
    MapPin,
    Clock,
    User,
    MessageSquare,
    MessageCircle,
    PhoneCall,
    Send,
    ArrowRightLeft,
    CheckCircle,
    Plus,
} from 'lucide-react';
import WhatsAppChat from './WhatsAppChat';
import BrowserDialer from './BrowserDialer';

const TYPE_META = {
    note: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Note' },
    call: { icon: PhoneCall, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Call' },
    email: { icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'Email' },
    status_change: { icon: ArrowRightLeft, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Status' },
    whatsapp: { icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/10', label: 'WhatsApp' },
    assignment: { icon: User, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Assigned' },
};

export default function LeadDetailDrawer({ lead, onClose, onUpdate }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [noteType, setNoteType] = useState('note');
    const [noteContent, setNoteContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showWhatsAppChat, setShowWhatsAppChat] = useState(false);
    const [showDialer, setShowDialer] = useState(false);
    const [callLogs, setCallLogs] = useState([]);

    useEffect(() => {
        if (lead?.id) {
            fetchActivities();
            fetchCallLogs();
        }
    }, [lead?.id]);

    const fetchCallLogs = async () => {
        try {
            const res = await api.get(`/calling/logs?leadId=${lead.id}`);
            setCallLogs(res.data);
        } catch { }
    };

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/leads/${lead.id}/activities`);
            setActivities(res.data);
        } catch {
            toast.error('Failed to load activities');
        } finally {
            setLoading(false);
        }
    };

    const handleAddActivity = async (e) => {
        e.preventDefault();
        if (!noteContent.trim()) return;
        setSubmitting(true);
        try {
            await api.post(`/leads/${lead.id}/activities`, {
                type: noteType,
                content: noteContent.trim(),
            });
            toast.success('Activity added');
            setNoteContent('');
            fetchActivities();
        } catch {
            toast.error('Failed to add activity');
        } finally {
            setSubmitting(false);
        }
    };

    const statusColors = {
        new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        follow_up: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        converted: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        lost: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const sourceLabels = {
        meta_ads: 'Meta Ads',
        google_ads: 'Google Ads',
        justdial: 'JustDial',
        indiamart: 'IndiaMart',
        tradeindia: 'TradeIndia',
        website: 'Website',
        whatsapp: 'WhatsApp',
        manual: 'Manual',
    };

    if (!lead) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            Added {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content — scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Contact Info */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Contact</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {lead.phone && (
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                                    <Phone size={14} className="text-gray-400 dark:text-slate-500" />
                                    <span>{lead.phone}</span>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <button
                                            onClick={() => setShowDialer(true)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                            title="Call from browser"
                                        >
                                            <Phone size={12} />
                                            Call
                                        </button>
                                        <button
                                            onClick={() => setShowWhatsAppChat(true)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                            title="Chat on WhatsApp"
                                        >
                                            <MessageCircle size={12} />
                                            WhatsApp
                                        </button>
                                    </div>
                                </div>
                            )}
                            {lead.email && (
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                                    <Mail size={14} className="text-gray-400 dark:text-slate-500" />
                                    <span>{lead.email}</span>
                                </div>
                            )}
                            {(lead.city || lead.state) && (
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                                    <MapPin size={14} className="text-gray-400 dark:text-slate-500" />
                                    <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                                <Send size={14} className="text-gray-400 dark:text-slate-500" />
                                <span>Source: {sourceLabels[lead.source] || lead.source}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status & Assignment */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Details</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColors[lead.status] || 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                                {lead.status?.replace('_', ' ')}
                            </span>
                            {lead.assignedUser && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-full border border-gray-300 dark:border-slate-700">
                                    <User size={12} />
                                    {lead.assignedUser.email}
                                </span>
                            )}
                        </div>
                        {lead.notes && (
                            <p className="text-sm text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-300 dark:border-slate-700/50">
                                {lead.notes}
                            </p>
                        )}
                    </div>

                    {/* Add Activity Form */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Add Activity</h3>
                        <form onSubmit={handleAddActivity} className="space-y-3">
                            <div className="flex gap-2">
                                {['note', 'call', 'email', 'whatsapp'].map((t) => {
                                    const meta = TYPE_META[t];
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNoteType(t)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${noteType === t
                                                    ? `${meta.bg} ${meta.color} border-current`
                                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-300 dark:border-slate-700 hover:text-gray-900 dark:text-white'
                                                }`}
                                        >
                                            <meta.icon size={12} />
                                            {meta.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder={`Add a ${noteType}...`}
                                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !noteContent.trim()}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-all cursor-pointer"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Call History & Recordings */}
                    {callLogs.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                Call History ({callLogs.length})
                            </h3>
                            <div className="space-y-2">
                                {callLogs.map((log) => (
                                    <div key={log.id} className="bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 rounded-xl p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <PhoneCall size={14} className="text-emerald-400" />
                                                <span className="text-sm text-gray-900 dark:text-white">{log.phoneNumber}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    log.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                                                    log.status === 'failed' || log.status === 'busy' ? 'bg-red-500/15 text-red-400' :
                                                    log.status === 'no-answer' ? 'bg-amber-500/15 text-amber-400' :
                                                    'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                                                }`}>
                                                    {log.status?.replace(/[_-]/g, ' ')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 dark:text-slate-500">
                                                {new Date(log.createdAt).toLocaleString('en-IN', {
                                                    day: 'numeric', month: 'short',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        {log.duration > 0 && (
                                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                                Duration: {Math.floor(log.duration / 60)}m {log.duration % 60}s
                                            </p>
                                        )}
                                        {log.disposition && (
                                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                                Outcome: <span className="text-gray-600 dark:text-slate-300 font-medium">{log.disposition.replace(/_/g, ' ')}</span>
                                                {log.notes && ` — ${log.notes}`}
                                            </p>
                                        )}
                                        {log.recordingUrl && (
                                            <div className="pt-1">
                                                <audio controls className="w-full h-8" style={{ filter: 'invert(1) hue-rotate(180deg)' }}>
                                                    <source src={`${import.meta.env.VITE_API_URL || 'https://api.magnetcrm.com/api'}/calling/recording/${log.id}?token=${localStorage.getItem('magnetcrm_token')}`} type="audio/mpeg" />
                                                </audio>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activity Timeline */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                            Timeline ({activities.length})
                        </h3>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : activities.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No activity yet</p>
                        ) : (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700/50" />

                                <div className="space-y-4">
                                    {activities.map((act) => {
                                        const meta = TYPE_META[act.type] || TYPE_META.note;
                                        const Icon = meta.icon;
                                        return (
                                            <div key={act.id} className="flex gap-4 relative">
                                                <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0 z-10`}>
                                                    <Icon size={14} className={meta.color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-900 dark:text-white">{act.content}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                                                        {act.type === 'status_change' && act.userId && act.userId !== lead.assignedTo && (
                                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                                Manager Action
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-400 dark:text-slate-500">
                                                            {new Date(act.createdAt).toLocaleString('en-IN', {
                                                                day: 'numeric', month: 'short',
                                                                hour: '2-digit', minute: '2-digit',
                                                            })}
                                                        </span>
                                                        {act.user && (
                                                            <span className="text-xs text-gray-400 dark:text-slate-500">
                                                                by {act.user.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* WhatsApp In-CRM Chat */}
            {showWhatsAppChat && (
                <WhatsAppChat lead={lead} onClose={() => setShowWhatsAppChat(false)} />
            )}

            {/* Browser Dialer */}
            {showDialer && (
                <BrowserDialer lead={lead} onClose={() => setShowDialer(false)} />
            )}
        </>
    );
}
