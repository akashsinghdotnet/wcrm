import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    MessageCircle, Search, Clock, ArrowLeft,
    Paperclip, FileText, Image as ImageIcon, MoreVertical, Reply, Forward,
    Trash2, X, Check, CheckCheck, AlertCircle,
    RotateCw, Lock, MessageSquarePlus, ExternalLink, Send
} from 'lucide-react';

const statusIcons = {
    sent: <Check size={14} className="text-gray-400 dark:text-gray-400" />,
    delivered: <CheckCheck size={14} className="text-gray-400 dark:text-gray-400" />,
    read: <CheckCheck size={14} className="text-teal-300" />,
    failed: <AlertCircle size={14} className="text-red-400" />,
};

const AVATAR_COLORS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-700',
    'from-teal-500 to-green-600',
    'from-rose-500 to-red-600',
];

const getLeadColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
};

const leadStatusStyles = {
    new: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
    contacted: { bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-500' },
    follow_up: { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
    converted: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
    lost: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', dot: 'bg-red-500' },
};

// ----------------- Media Components -----------------
const ImageWithAuth = ({ mediaId, alt }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let url;
        api.get(`/whatsapp/media/${mediaId}`, { responseType: 'blob' })
            .then(res => {
                url = URL.createObjectURL(res.data);
                setBlobUrl(url);
                setLoading(false);
            })
            .catch(() => setLoading(false));

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [mediaId]);

    if (loading) {
        return (
            <div className="w-56 h-56 flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse">
                <ImageIcon size={28} className="opacity-40 text-emerald-600 dark:text-emerald-400" />
            </div>
        );
    }
    if (!blobUrl) {
        return (
            <div className="p-3 bg-red-100/10 text-red-500 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle size={15} /> Image unavailable
            </div>
        );
    }

    return (
        <img
            src={blobUrl}
            alt={alt || 'WhatsApp image'}
            className="max-w-[280px] sm:max-w-xs rounded-xl object-contain cursor-pointer shadow-sm hover:opacity-95 transition-opacity"
            onClick={() => window.open(blobUrl, '_blank')}
        />
    );
};

const AudioWithAuth = ({ mediaId }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        api.get(`/whatsapp/media/${mediaId}`, { responseType: 'blob' })
            .then(res => {
                if (isMounted) {
                    const url = URL.createObjectURL(res.data);
                    setBlobUrl(url);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [mediaId]);

    if (loading) {
        return (
            <div className="w-48 h-12 flex items-center justify-center bg-gray-100 dark:bg-slate-800 rounded-full animate-pulse">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    if (!blobUrl) {
        return (
            <div className="p-3 bg-red-100/10 text-red-500 rounded-lg flex items-center gap-2 text-xs">
                <AlertCircle size={15} /> Audio unavailable
            </div>
        );
    }

    return <audio controls src={blobUrl} className="max-w-[260px] sm:max-w-xs h-11 rounded-full outline-none" />;
};

const DocumentWithAuth = ({ mediaId, filename, isOut }) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async (e) => {
        e.preventDefault();
        setDownloading(true);
        try {
            const res = await api.get(`/whatsapp/media/${mediaId}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch {
            toast.error('Failed to download file');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full text-left flex items-center gap-3 mb-1 transition-colors p-3 rounded-xl border group cursor-pointer ${
                isOut
                    ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-200'
            }`}
        >
            {downloading ? (
                <div className="w-5 h-5 flex-shrink-0 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
                <FileText size={20} className={`flex-shrink-0 ${isOut ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
            )}
            <span className="text-sm truncate font-medium flex-1 overflow-hidden" title={filename || 'Download Document'}>
                {filename || 'Download Document'}
            </span>
        </button>
    );
};

const LinkPreview = ({ url, isOut }) => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        api.get(`/whatsapp/link-preview?url=${encodeURIComponent(url)}`)
            .then(res => {
                if (isMounted) {
                    setPreview(res.data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [url]);

    if (loading) {
        return (
            <div className={`mt-2 rounded-xl border p-3 flex gap-3 animate-pulse ${
                isOut ? 'bg-white/10 border-white/20' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
            }`}>
                <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
            </div>
        );
    }

    if (!preview || (!preview.title && !preview.image && !preview.description)) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 flex overflow-hidden rounded-xl border transition-colors group text-left max-w-sm ${
                isOut
                    ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-750 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white'
            }`}
        >
            {preview.image && (
                <div className="w-16 h-16 shrink-0 border-r border-black/10 dark:border-white/10 overflow-hidden bg-gray-200 dark:bg-slate-800">
                    <img
                        src={preview.image}
                        alt="preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}
            <div className="flex-1 p-2.5 min-w-0 flex flex-col justify-center gap-0.5">
                <p className="text-[13px] font-bold leading-tight truncate">{preview.title || preview.domain}</p>
                {preview.description && (
                    <p className={`text-[11px] leading-snug line-clamp-1 ${isOut ? 'text-white/80' : 'text-gray-500 dark:text-slate-400'}`}>
                        {preview.description}
                    </p>
                )}
                <p className={`text-[10px] uppercase tracking-wider truncate ${isOut ? 'text-white/60' : 'text-gray-400 dark:text-slate-500'}`}>
                    {preview.domain}
                </p>
            </div>
        </a>
    );
};

const MessageText = ({ text, isOut, className = "text-[14.5px] leading-relaxed whitespace-pre-wrap break-words" }) => {
    if (!text) return null;
    const stringText = typeof text === 'string' ? text : (typeof text === 'object' ? JSON.stringify(text) : String(text || ''));
    if (!stringText) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = stringText.split(urlRegex);
    const urls = [];

    const elements = parts.map((part, i) => {
        if (part.match(urlRegex)) {
            urls.push(part);
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline underline-offset-2 font-medium ${
                        isOut ? 'text-white hover:text-white/80 font-semibold' : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300'
                    }`}
                >
                    {part}
                </a>
            );
        }
        return <span key={i}>{part}</span>;
    });

    const uniqueUrls = [...new Set(urls)];

    return (
        <div className="flex flex-col">
            <p className={className}>{elements}</p>
            {uniqueUrls.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                    {uniqueUrls.map((url, i) => <LinkPreview key={i} url={url} isOut={isOut} />)}
                </div>
            )}
        </div>
    );
};

// ----------------- Date Grouping Helper -----------------
const formatMessageDate = (timestamp) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

// ----------------- Main WhatsApp Web Component -----------------
export default function WhatsAppChatsPage() {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Conversation List State
    const [conversations, setConversations] = useState([]);
    const [convLoading, setConvLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'unread'
    const [refreshing, setRefreshing] = useState(false);

    // Active Chat State
    const [lead, setLead] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [forwardMsg, setForwardMsg] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [allLeads, setAllLeads] = useState([]);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);

    // Direct Message Modal State
    const [dmModal, setDmModal] = useState(false);
    const [dmPhone, setDmPhone] = useState('');
    const [dmName, setDmName] = useState('');
    const [dmMsg, setDmMsg] = useState('');
    const [dmSending, setDmSending] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const activeLeadIdRef = useRef(leadId);

    // Sync activeLeadIdRef
    useEffect(() => {
        activeLeadIdRef.current = leadId;
    }, [leadId]);

    // Direct message prefill from route state
    useEffect(() => {
        if (location.state?.prefillPhone) {
            setDmPhone(location.state.prefillPhone);
            setDmName(location.state.prefillName || '');
            setDmModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Fetch conversations list & poll
    const fetchConversations = async (silent = false) => {
        try {
            if (!silent) setConvLoading(true);
            const res = await api.get('/whatsapp/conversations');
            setConversations(res.data || []);
        } catch {
            setConversations([]);
        } finally {
            if (!silent) setConvLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations(true);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    // Load active lead & messages when leadId changes
    useEffect(() => {
        if (!leadId) {
            setLead(null);
            setMessages([]);
            return;
        }

        const loadActiveChat = async () => {
            setChatLoading(true);
            try {
                const [leadRes, msgRes] = await Promise.all([
                    api.get(`/leads/${leadId}`),
                    api.get(`/whatsapp/messages/${leadId}`)
                ]);
                setLead(leadRes.data);
                setMessages(msgRes.data || []);
                // Mark messages read
                api.patch(`/whatsapp/messages/${leadId}/read`).catch(() => {});
                // Update unread badge in list locally
                setConversations(prev => prev.map(c => c.lead.id === leadId ? { ...c, unreadCount: 0 } : c));
            } catch (err) {
                toast.error('Unable to open this chat');
                navigate('/inbox', { replace: true });
            } finally {
                setChatLoading(false);
            }
        };

        loadActiveChat();
    }, [leadId]);

    // Poll messages for active chat
    useEffect(() => {
        if (!leadId) return;

        const pollMessages = async () => {
            if (!activeLeadIdRef.current) return;
            try {
                const res = await api.get(`/whatsapp/messages/${activeLeadIdRef.current}`);
                setMessages(res.data || []);
            } catch { /* silent */ }
        };

        const interval = setInterval(pollMessages, 4000);
        return () => clearInterval(interval);
    }, [leadId]);

    // Auto-scroll chat to bottom
    const prevMsgLength = useRef(0);
    useEffect(() => {
        if (messages.length > prevMsgLength.current || prevMsgLength.current === 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMsgLength.current = messages.length;
    }, [messages.length]);

    // Load all leads for forwarding
    const fetchAllLeads = async () => {
        try {
            const res = await api.get('/leads?limit=200');
            const data = res.data.data || res.data || [];
            setAllLeads(data.filter(l => l.id !== leadId && l.phone));
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchAllLeads();
    }, [leadId]);

    // Format phone number
    const formatPhone = (phone) => {
        const digits = phone?.replace(/[^0-9]/g, '') || '';
        if (digits.length === 10) return `91${digits}`;
        return digits;
    };

    // Format message time
    const formatTime = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const oneDay = 86400000;

        if (diff < oneDay && d.getDate() === now.getDate()) {
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
        if (diff < oneDay * 2) return 'Yesterday';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // Send text message
    const handleSend = async (e) => {
        e?.preventDefault();
        if (!text.trim() || sending || !lead) return;

        const msg = text.trim();
        const replyId = replyTo?.whatsappMessageId || null;
        setText('');
        setReplyTo(null);
        setSending(true);

        try {
            const res = await api.post('/whatsapp/send', {
                leadId: lead.id,
                to: formatPhone(lead.phone),
                message: msg,
                type: 'text',
                replyToMessageId: replyId || undefined,
            });

            if (res.data?.status === 'failed') {
                toast.error('Message failed to send. Check WhatsApp API configuration.');
            }

            // Immediately refresh messages and conversation list
            const updated = await api.get(`/whatsapp/messages/${lead.id}`);
            setMessages(updated.data || []);
            fetchConversations(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    // Send file attachment
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !lead) return;

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await api.post('/whatsapp/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const mediaId = uploadRes.data.mediaId;

            let type = 'document';
            if (file.type.startsWith('image/')) type = 'image';

            await api.post('/whatsapp/send', {
                leadId: lead.id,
                to: formatPhone(lead.phone),
                type,
                mediaId,
                message: file.name
            });

            toast.success('File sent');
            const updated = await api.get(`/whatsapp/messages/${lead.id}`);
            setMessages(updated.data || []);
            fetchConversations(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send file');
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Clear Chat
    const handleClearChat = async () => {
        if (!leadId) return;
        try {
            await api.delete(`/whatsapp/messages/${leadId}`);
            setMessages([]);
            setClearConfirm(false);
            setShowMenu(false);
            fetchConversations(true);
            toast.success('Chat history cleared');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to clear chat');
        }
    };

    // Forward message
    const handleForward = async (targetLead) => {
        if (!forwardMsg) return;
        try {
            await api.post('/whatsapp/send', {
                leadId: targetLead.id,
                to: formatPhone(targetLead.phone),
                message: forwardMsg.content,
                type: forwardMsg.type || 'text',
                mediaId: forwardMsg.mediaId || undefined,
            });
            toast.success(`Forwarded to ${targetLead.name}`);
            setShowForwardModal(false);
            setForwardMsg(null);
            fetchConversations(true);
        } catch (err) {
            toast.error('Failed to forward message');
        }
    };

    // Send Direct Message from modal
    const handleSendDirectMessage = async (e) => {
        e.preventDefault();
        if (!dmPhone.trim()) return toast.error('Phone number required');
        if (!dmMsg.trim()) return toast.error('Message required');

        setDmSending(true);
        try {
            const cleanPhone = dmPhone.replace(/[^0-9]/g, '');
            const res = await api.post('/whatsapp/send', {
                to: cleanPhone,
                message: dmMsg.trim(),
                type: 'text'
            });

            toast.success('WhatsApp message sent');
            setDmModal(false);
            setDmPhone('');
            setDmName('');
            setDmMsg('');
            fetchConversations();

            // If a lead was created or found, open it
            if (res.data?.lead?.id) {
                navigate(`/inbox/${res.data.lead.id}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        } finally {
            setDmSending(false);
        }
    };

    // Filter conversations
    const filteredConversations = conversations.filter(c => {
        if (filterTab === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            c.lead.name?.toLowerCase().includes(q) ||
            c.lead.phone?.includes(q) ||
            c.lead.email?.toLowerCase().includes(q) ||
            c.lastMessage?.content?.toLowerCase().includes(q)
        );
    });

    const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

    return (
        <div className="w-full h-full flex overflow-hidden bg-gray-50 dark:bg-slate-950 select-text">
            {/* ---------------- LEFT PANEL: Conversations Sidebar ---------------- */}
            <div className={`w-full md:w-[380px] lg:w-[410px] xl:w-[430px] flex-shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 ${
                leadId ? 'hidden md:flex' : 'flex'
            }`}>
                {/* Header */}
                <div className="h-16 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-white/20">
                            <MessageCircle size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Inbox
                                {totalUnreadCount > 0 && (
                                    <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500 text-white rounded-full">
                                        {totalUnreadCount}
                                    </span>
                                )}
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                                {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                setRefreshing(true);
                                fetchConversations();
                            }}
                            title="Refresh conversations"
                            className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            <RotateCw size={18} className={refreshing ? 'animate-spin text-emerald-500' : ''} />
                        </button>
                        <button
                            onClick={() => setDmModal(true)}
                            title="Start New Direct Chat"
                            className="p-2 text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                            <MessageSquarePlus size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Bar & Filter Chips */}
                <div className="p-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0 space-y-2.5">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search or start new chat..."
                            className="w-full pl-10 pr-9 py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/60 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterTab('all')}
                            className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                filterTab === 'all'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilterTab('unread')}
                            className={`px-3.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                filterTab === 'unread'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Unread
                            {totalUnreadCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    filterTab === 'unread' ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white'
                                }`}>
                                    {totalUnreadCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60">
                    {convLoading ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-800 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2" />
                                        <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3">
                                <MessageCircle size={28} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {conversations.length === 0 ? 'No conversations yet' : 'No matching chats'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs">
                                {conversations.length === 0
                                    ? 'Start a new conversation using the button above or receive messages from leads.'
                                    : 'Try checking your search spelling or switch filter to All.'}
                            </p>
                            {conversations.length === 0 && (
                                <button
                                    onClick={() => setDmModal(true)}
                                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                    Start New Chat
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isSelected = conv.lead.id === leadId;
                            const statusInfo = leadStatusStyles[conv.lead.status] || leadStatusStyles.new;
                            const isOut = conv.lastMessage?.direction === 'outbound';

                            return (
                                <button
                                    key={conv.lead.id}
                                    onClick={() => {
                                        navigate(`/inbox/${conv.lead.id}`);
                                    }}
                                    className={`w-full px-4 py-3.5 flex items-center gap-3.5 text-left transition-colors cursor-pointer relative group ${
                                        isSelected
                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    {/* Active Bar indicator */}
                                    {isSelected && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                    )}

                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getLeadColor(conv.lead.name)} flex items-center justify-center shadow-sm text-white font-bold text-sm`}>
                                            {conv.lead.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${statusInfo.dot}`} />
                                    </div>

                                    {/* Contact Details & Last Message */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`text-sm truncate font-semibold ${
                                                isSelected ? 'text-emerald-950 dark:text-emerald-200' : 'text-gray-900 dark:text-white'
                                            }`}>
                                                {conv.lead.name || conv.lead.phone}
                                            </h3>
                                            {conv.lastMessage && (
                                                <span className={`text-[11px] shrink-0 ml-2 ${
                                                    conv.unreadCount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-400 dark:text-slate-500'
                                                }`}>
                                                    {formatTime(conv.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 min-w-0 truncate">
                                                {isOut && (
                                                    <span className="shrink-0 inline-flex items-center">
                                                        {statusIcons[conv.lastMessage?.status] || <Check size={14} className="text-gray-400" />}
                                                    </span>
                                                )}
                                                <span className="truncate">
                                                    {conv.lastMessage?.messageType === 'image'
                                                        ? '📷 Photo'
                                                        : conv.lastMessage?.messageType === 'audio'
                                                        ? '🎵 Voice Note'
                                                        : conv.lastMessage?.messageType === 'document'
                                                        ? '📄 Document'
                                                        : conv.lastMessage?.content?.includes('(Media)')
                                                        ? '📎 Media file'
                                                        : conv.lastMessage?.content || 'No messages yet'}
                                                </span>
                                            </div>

                                            {/* Unread badge */}
                                            {conv.unreadCount > 0 && (
                                                <span className="shrink-0 min-w-[20px] h-5 bg-emerald-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        {/* Phone & Status Pill */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                                                {conv.lead.phone}
                                            </span>
                                            {conv.lead.status && (
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold border ${statusInfo.bg}`}>
                                                    {conv.lead.status.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ---------------- RIGHT PANEL: Chat Window ---------------- */}
            <div className={`flex-1 flex flex-col h-full min-w-0 bg-gray-50 dark:bg-slate-950 relative ${
                leadId ? 'flex' : 'hidden md:flex'
            }`}>
                {!leadId ? (
                    // Wcrm Welcome / Default Screen
                    <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-slate-950 border-b-4 border-emerald-500">
                        <div className="max-w-md flex flex-col items-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/20">
                                <MessageCircle size={40} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Wcrm Inbox
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-6">
                                Connect with your customers and leads seamlessly. Select a contact from the left sidebar to start chatting, view history, and send media in real-time.
                            </p>
                            <button
                                onClick={() => setDmModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                <MessageSquarePlus size={18} />
                                Start Direct Message
                            </button>

                            <div className="mt-12 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                                <Lock size={13} className="text-emerald-500" />
                                <span>Direct integration with official Meta WhatsApp Cloud API</span>
                            </div>
                        </div>
                    </div>
                ) : chatLoading && !lead ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-slate-950">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-600 dark:text-slate-400">Loading conversation...</p>
                    </div>
                ) : lead ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-5 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex-shrink-0 z-10 shadow-xs">
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Mobile Back Button */}
                                <button
                                    onClick={() => navigate('/inbox')}
                                    className="p-1.5 -ml-1 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl md:hidden transition-colors cursor-pointer"
                                    title="Back to chats"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getLeadColor(lead.name)} flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0`}>
                                    {lead.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                            {lead.name || 'Unknown Contact'}
                                        </h3>
                                        {lead.status && (
                                            <span className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                leadStatusStyles[lead.status]?.bg || leadStatusStyles.new.bg
                                            }`}>
                                                {lead.status.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                        {lead.phone || 'No phone'}
                                    </p>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-1.5 relative">
                                {/* Kept as requested by user ("Don't remove it for now") */}
                                <a
                                    href={`/leads`}
                                    title="View Leads Table"
                                    className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden sm:flex"
                                >
                                    <ExternalLink size={18} />
                                </a>

                                <button
                                    onClick={() => setShowMenu(p => !p)}
                                    title="More Options"
                                    className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                >
                                    <MoreVertical size={18} />
                                </button>

                                {showMenu && (
                                    <div
                                        className="absolute right-0 top-12 z-50 w-52 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl py-1 overflow-hidden"
                                        onMouseLeave={() => setShowMenu(false)}
                                    >
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                setClearConfirm(true);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                            Clear Chat History
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages Body */}
                        <div
                            className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-3 bg-gray-50 dark:bg-slate-950"
                        >
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-16 text-gray-500 dark:text-slate-400">
                                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
                                        <MessageCircle size={28} />
                                    </div>
                                    <p className="text-base font-semibold text-gray-800 dark:text-slate-200">No messages in this chat yet</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xs">
                                        Type a message below to start chatting with {lead.name || lead.phone}.
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isOut = msg.direction === 'outbound';
                                    const hasMediaId = !!msg.mediaId;
                                    const isImage = msg.messageType === 'image' || (hasMediaId && msg.mimeType?.startsWith('image/'));
                                    const isAudio = msg.messageType === 'audio' || (hasMediaId && msg.mimeType?.startsWith('audio/'));
                                    const isDocument = msg.messageType === 'document' || msg.messageType === 'video' || (hasMediaId && !isImage && !isAudio);

                                    // Fallback for older messages
                                    const isLegacyMedia = !msg.messageType && (msg.content?.includes('(Media)') || msg.content?.includes('.pdf') || msg.content?.includes('.png') || msg.content?.includes('.jpg'));
                                    const isLegacyImage = isLegacyMedia && (msg.content?.toLowerCase().includes('.png') || msg.content?.toLowerCase().includes('.jpg'));

                                    // Show date separator if first message or day changed
                                    const showDateDivider = idx === 0 || formatMessageDate(msg.createdAt) !== formatMessageDate(messages[idx - 1].createdAt);

                                    return (
                                        <div key={msg.id || idx} className="space-y-3">
                                            {showDateDivider && (
                                                <div className="flex justify-center my-3">
                                                    <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 shadow-xs border border-gray-200 dark:border-slate-700">
                                                        {formatMessageDate(msg.createdAt)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`flex w-full ${isOut ? 'justify-end' : 'justify-start'} group`}>
                                                <div className={`flex flex-col relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${isOut ? 'items-end' : 'items-start'}`}>
                                                    {/* Hover Action Buttons */}
                                                    <div className={`absolute ${isOut ? '-left-16' : '-right-16'} top-1.5 hidden group-hover:flex items-center gap-1 z-10`}>
                                                        <button
                                                            onClick={() => setReplyTo(msg)}
                                                            title="Reply"
                                                            className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer border border-gray-200 dark:border-slate-700"
                                                        >
                                                            <Reply size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setForwardMsg(msg);
                                                                setShowForwardModal(true);
                                                            }}
                                                            title="Forward"
                                                            className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer border border-gray-200 dark:border-slate-700"
                                                        >
                                                            <Forward size={13} />
                                                        </button>
                                                    </div>

                                                    {/* Chat Bubble */}
                                                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm w-fit ${
                                                        isOut
                                                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-md shadow-emerald-600/10'
                                                            : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-tl-xs border border-gray-200 dark:border-slate-800'
                                                    }`}>
                                                        {/* Referral Meta Ad Banner */}
                                                        {msg.referral && (
                                                            <div className={`mb-2.5 p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                                                                isOut ? 'bg-white/15 border-white/20' : 'bg-emerald-50 dark:bg-slate-800 border-emerald-200 dark:border-slate-700'
                                                            }`}>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit bg-emerald-500 text-white">
                                                                    From Meta Ad
                                                                </span>
                                                                {msg.referral.headline && (
                                                                    <p className="font-semibold text-xs leading-tight">{msg.referral.headline}</p>
                                                                )}
                                                                {msg.referral.body && (
                                                                    <p className="text-[11px] opacity-80 leading-snug line-clamp-2">{msg.referral.body}</p>
                                                                )}
                                                                {msg.referral.source_url && (
                                                                    <a
                                                                        href={msg.referral.source_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`inline-flex items-center gap-1 text-[11px] font-semibold hover:underline mt-1 ${
                                                                            isOut ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                                                                        }`}
                                                                    >
                                                                        View Ad &rarr;
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Media Content */}
                                                        {hasMediaId ? (
                                                            <div className="flex flex-col gap-1.5 mb-1">
                                                                {isImage ? (
                                                                    <ImageWithAuth mediaId={msg.mediaId} alt={msg.content} />
                                                                ) : isAudio ? (
                                                                    <AudioWithAuth mediaId={msg.mediaId} />
                                                                ) : (
                                                                    <DocumentWithAuth mediaId={msg.mediaId} filename={msg.content} isOut={isOut} />
                                                                )}
                                                                {msg.content &&
                                                                    msg.content !== '[image message]' &&
                                                                    msg.content !== '[document message]' &&
                                                                    msg.content !== '[audio message]' &&
                                                                    msg.content !== '[video message]' && (
                                                                        <MessageText text={msg.content} isOut={isOut} className="text-[14px] leading-relaxed whitespace-pre-wrap break-words mt-1" />
                                                                    )}
                                                            </div>
                                                        ) : isLegacyMedia ? (
                                                            <div className="flex items-center gap-2 mb-1 bg-black/10 p-2.5 rounded-lg border border-white/10">
                                                                {isLegacyImage ? (
                                                                    <ImageIcon size={20} className={isOut ? 'text-white' : 'text-emerald-500'} />
                                                                ) : (
                                                                    <FileText size={20} className={isOut ? 'text-white' : 'text-emerald-500'} />
                                                                )}
                                                                <span className="text-sm truncate font-medium">{msg.content.replace(' (Media)', '')}</span>
                                                            </div>
                                                        ) : (
                                                            <MessageText text={msg.content} isOut={isOut} />
                                                        )}

                                                        {/* Timestamp & Status Checkmarks */}
                                                        <div className={`flex items-center gap-1.5 mt-1 ${isOut ? 'justify-end text-emerald-100/90' : 'justify-start text-gray-400 dark:text-slate-500'}`}>
                                                            <span className="text-[10px]">
                                                                {msg.createdAt
                                                                    ? new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                                                    : ''}
                                                            </span>
                                                            {isOut && statusIcons[msg.status]}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Reply Banner */}
                        {replyTo && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-t border-gray-200 dark:border-slate-800 border-l-4 border-emerald-500 flex-shrink-0">
                                <Reply size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                        Replying to {replyTo.direction === 'outbound' ? 'You' : lead.name}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-slate-300 truncate">
                                        {replyTo.content?.substring(0, 80) || 'Attachment'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-gray-500 cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {/* Input Footer */}
                        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex-shrink-0">
                            <form onSubmit={handleSend} className="flex items-end gap-2.5 sm:gap-3 w-full">
                                {/* Hidden file input */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept="image/*,.pdf,.doc,.docx"
                                />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending}
                                    className="p-2.5 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
                                    title="Attach Document or Image"
                                >
                                    <Paperclip size={20} />
                                </button>

                                <div className="flex-1 bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                                    <textarea
                                        ref={inputRef}
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend(e);
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        className="w-full max-h-28 bg-transparent px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                                        rows="1"
                                        style={{ minHeight: '42px' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending || (!text.trim() && !sending)}
                                    className="w-10 h-10 flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                                >
                                    {sending ? (
                                        <Clock size={18} className="animate-pulse" />
                                    ) : (
                                        <Send size={18} className="ml-0.5" />
                                    )}
                                </button>
                            </form>
                            <div className="text-center mt-1.5 hidden sm:block">
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                    Press Enter to send, Shift + Enter for new line
                                </span>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>

            {/* ---------------- MODALS ---------------- */}
            {/* 1. Direct Message Modal */}
            {dmModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={() => setDmModal(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <MessageSquarePlus size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Start New Chat</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Send a direct WhatsApp message to any number</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDmModal(false)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSendDirectMessage} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                    Phone Number (with Country Code)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={dmPhone}
                                    onChange={(e) => setDmPhone(e.target.value)}
                                    placeholder="e.g. 919876543210"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                    Contact Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={dmName}
                                    onChange={(e) => setDmName(e.target.value)}
                                    placeholder="e.g. Rahul Sharma"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                                    Message
                                </label>
                                <textarea
                                    required
                                    rows="3"
                                    value={dmMsg}
                                    onChange={(e) => setDmMsg(e.target.value)}
                                    placeholder="Hi, thanks for connecting..."
                                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDmModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={dmSending}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    {dmSending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <span>Send WhatsApp</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Forward Message Modal */}
            {showForwardModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={() => setShowForwardModal(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Forward size={20} />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Forward Message</h3>
                        </div>

                        <div className="max-h-64 overflow-y-auto mb-4 border border-gray-200 dark:border-slate-700 rounded-xl divide-y divide-gray-100 dark:divide-slate-800">
                            {allLeads.length === 0 ? (
                                <p className="text-gray-500 dark:text-slate-400 text-sm py-8 text-center bg-gray-50 dark:bg-slate-800/50">
                                    No other contacts available
                                </p>
                            ) : (
                                allLeads.map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => handleForward(l)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 flex items-center gap-3 transition-colors bg-white dark:bg-slate-900 cursor-pointer"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
                                            <span className="text-white text-xs font-bold">{l.name?.charAt(0)?.toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{l.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{l.phone}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setShowForwardModal(false)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* 3. Clear Chat Confirmation Modal */}
            {clearConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={() => setClearConfirm(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600">
                                <Trash2 size={20} />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Clear Chat History</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-5 leading-relaxed">
                            This will permanently delete all messages in this chat from your CRM. The messages on the customer's phone will not be affected.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setClearConfirm(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearChat}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors cursor-pointer"
                            >
                                Clear Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
