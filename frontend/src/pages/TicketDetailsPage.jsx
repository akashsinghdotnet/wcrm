import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, Paperclip, ShieldAlert, User as UserIcon, CheckCircle2, FileText, Image as ImageIcon } from 'lucide-react';

export default function TicketDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const messagesEndRef = useRef(null);

    const isSuperAdmin = ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user?.role);

    useEffect(() => {
        loadTicket();
    }, [id]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [ticket?.replies]);

    const loadTicket = async () => {
        try {
            const res = await api.get(`/tickets/${id}`);
            setTicket(res.data);
        } catch (err) {
            toast.error('Failed to load ticket details');
            navigate('/tickets');
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

        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachmentUrl(reader.result);
            toast.success('File attached');
        };
        reader.readAsDataURL(file);
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim() && !attachmentUrl) return;

        setIsSubmitting(true);
        try {
            const res = await api.post(`/tickets/${id}/reply`, {
                message: replyMessage,
                attachmentUrl: attachmentUrl || undefined,
            });
            setTicket(res.data);
            setReplyMessage('');
            setAttachmentUrl('');
            toast.success('Reply posted');
        } catch (err) {
            toast.error('Failed to post reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setIsUpdatingStatus(true);
        try {
            await api.patch(`/tickets/${id}/status`, { status: newStatus });
            setTicket({ ...ticket, status: newStatus });
            toast.success('Ticket status updated');
        } catch (err) {
            toast.error('Failed to update status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!ticket) return null;

    const renderAttachment = (url) => {
        if (!url) return null;
        const isImage = url.startsWith('data:image/');
        return (
            <div className="mt-3">
                {isImage ? (
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="Attachment" className="max-w-[200px] rounded-lg border border-gray-300 dark:border-slate-700 hover:opacity-80 transition-opacity" />
                    </a>
                ) : (
                    <a href={url} download="attachment" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800/50 hover:bg-gray-200 dark:bg-slate-700/50 rounded-lg text-sm text-indigo-400 border border-gray-300 dark:border-slate-700 border-dashed transition-colors">
                        <FileText className="w-4 h-4" />
                        Download Attachment
                    </a>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/tickets')}
                        className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-white dark:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{ticket.subject}</h2>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ticket.status === 'Open' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                                ticket.status === 'Answered' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' :
                                    'bg-slate-500/20 text-gray-500 dark:text-slate-400 border border-slate-500/20'
                                }`}>
                                {ticket.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <span className="font-mono text-indigo-400">{ticket.ticketNumber}</span>
                            <span>•</span>
                            <span>{ticket.department}</span>
                            <span>•</span>
                            <span className="text-gray-400 dark:text-slate-500">Priority: {ticket.priority}</span>
                            {ticket.company && (
                                <>
                                    <span>•</span>
                                    <span>{ticket.company.companyName}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                        <select
                            value={ticket.status}
                            disabled={isUpdatingStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                        >
                            <option value="Open">Status: Open</option>
                            <option value="Answered">Status: Answered</option>
                            <option value="Closed">Status: Closed</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden relative">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Original Ticket Description */}
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <UserIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-medium text-gray-700 dark:text-slate-200">
                                    {ticket.createdBy?.name || ticket.createdBy?.email}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                    {new Date(ticket.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            </div>
                            <div className="bg-gray-100 dark:bg-slate-800/50 rounded-2xl rounded-tl-none p-4 text-gray-600 dark:text-slate-300 text-sm leading-relaxed border border-gray-300 dark:border-slate-700/50">
                                {ticket.description}
                                {renderAttachment(ticket.attachmentUrl)}
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    {ticket.replies?.map((reply) => {
                        const isStaff = ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(reply.user?.role);

                        return (
                            <div key={reply.id} className={`flex items-start gap-4 ${isStaff ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isStaff ? 'bg-indigo-600/20' : 'bg-white dark:bg-slate-800'}`}>
                                    {isStaff ? <ShieldAlert className="w-5 h-5 text-indigo-400" /> : <UserIcon className="w-5 h-5 text-gray-500 dark:text-slate-400" />}
                                </div>
                                <div className={`flex-1 min-w-0 flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                                    <div className={`flex items-baseline gap-2 mb-1 ${isStaff ? 'flex-row-reverse' : ''}`}>
                                        <span className="font-medium text-gray-700 dark:text-slate-200">
                                            {isStaff ? 'Support Staff' : (reply.user?.name || reply.user?.email)}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-slate-500">
                                            {new Date(reply.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                    <div className={`rounded-2xl p-4 text-sm leading-relaxed max-w-[85%] border ${isStaff
                                        ? 'bg-indigo-600/30 text-white rounded-tr-none border-indigo-500/50'
                                        : 'bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-200 rounded-tl-none border-gray-300 dark:border-slate-700/50'
                                        }`}>
                                        <div className="whitespace-pre-wrap" style={{ color: isStaff ? '#ffffff' : '#e2e8f0' }}>{reply.message}</div>
                                        {renderAttachment(reply.attachmentUrl)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply Input Area */}
                {ticket.status === 'Closed' ? (
                    <div className="p-4 bg-gray-100 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-800 text-center">
                        <p className="text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            This ticket has been marked as closed.
                        </p>
                    </div>
                ) : (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
                        {attachmentUrl && (
                            <div className="mb-3 flex items-center gap-2">
                                <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2 text-xs text-indigo-400">
                                    <Paperclip className="w-3 h-3" />
                                    File Attached
                                    <button onClick={() => setAttachmentUrl('')} className="ml-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white">&times;</button>
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleReply} className="flex items-end gap-3">
                            <div className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl flex items-center focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-shadow">
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type your reply here..."
                                    className="w-full bg-transparent border-none px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none resize-none min-h-[44px] max-h-32"
                                    rows={1}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply(e);
                                        }
                                    }}
                                />
                                <div className="pr-2 border-l border-gray-300 dark:border-slate-700/50 my-2">
                                    <input
                                        type="file"
                                        id="reply-attachment"
                                        className="hidden"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={handleFileUpload}
                                    />
                                    <label
                                        htmlFor="reply-attachment"
                                        className="cursor-pointer p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-400 transition-colors block"
                                        title="Attach file"
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </label>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || (!replyMessage.trim() && !attachmentUrl)}
                                className="h-[46px] px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
