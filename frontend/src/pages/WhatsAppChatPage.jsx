import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, MessageCircle, Check, CheckCheck, Clock, AlertCircle, Paperclip, FileText, Image as ImageIcon, MoreVertical, Reply, Forward, Trash2, X, Users } from 'lucide-react';

const statusIcons = {
    sent: <Check size={14} className="text-gray-500 dark:text-gray-400" />,
    delivered: <CheckCheck size={14} className="text-gray-500 dark:text-gray-400" />,
    read: <CheckCheck size={14} className="text-[#34B7F1]" />,
    failed: <AlertCircle size={14} className="text-red-400" />,
};

const AVATAR_COLORS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-700',
    'from-teal-500 to-green-600',
    'from-red-500 to-pink-600',
];

const getLeadColor = (name) => {
    if (!name) return AVATAR_COLORS[0];
    const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
};

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

    if (loading) return <div className="w-48 h-48 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg animate-pulse"><ImageIcon size={24} className="opacity-50" /></div>;
    if (!blobUrl) return <div className="p-3 bg-red-100/10 text-red-500 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> Image unavailable</div>;

    return <img src={blobUrl} alt={alt} className="max-w-[240px] md:max-w-xs rounded-lg object-contain cursor-pointer shadow-sm hover:opacity-95 transition-opacity" onClick={() => window.open(blobUrl, '_blank')} />;
};

const AudioWithAuth = ({ mediaId }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        api.get(`/whatsapp/media/${mediaId}`, { responseType: 'blob' })
            .then(res => {
                if(isMounted) {
                    const url = URL.createObjectURL(res.data);
                    setBlobUrl(url);
                    setLoading(false);
                }
            })
            .catch(() => {
                if(isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [mediaId]);

    if (loading) return <div className="w-48 h-12 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full animate-pulse"><div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;
    if (!blobUrl) return <div className="p-3 bg-red-100/10 text-red-500 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> Audio unavailable</div>;

    return <audio controls src={blobUrl} className="max-w-[240px] md:max-w-xs h-12 rounded-full outline-none" />;
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
        <button onClick={handleDownload} disabled={downloading} className="w-full text-left flex items-center gap-3 mb-1 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors p-3 rounded-xl border border-black/5 dark:border-white/10 group">
            {downloading ? <div className="w-5 h-5 flex-shrink-0 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> : <FileText size={20} className={`flex-shrink-0 ${isOut ? "text-green-100 group-hover:text-white" : "text-blue-500 dark:text-blue-400 group-hover:dark:text-blue-300"}`} />}
            <span className="text-sm truncate font-medium flex-1 overflow-hidden" title={filename || 'Download Document'}>{filename || 'Download Document'}</span>
        </button>
    );
};

const LinkPreview = ({ url }) => {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        api.get(`/whatsapp/link-preview?url=${encodeURIComponent(url)}`)
            .then(res => {
                if(isMounted) {
                    setPreview(res.data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if(isMounted) setLoading(false);
            });
        return () => { isMounted = false; };
    }, [url]);

    if (loading) return (
        <div className="mt-2 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 p-3 flex gap-3 animate-pulse">
            <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-lg shrink-0"></div>
            <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-3/4"></div>
                <div className="h-2 bg-black/10 dark:bg-white/10 rounded w-1/2"></div>
            </div>
        </div>
    );

    if (!preview || (!preview.title && !preview.image && !preview.description)) return null;

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex overflow-hidden rounded-xl border border-black/10 dark:border-black/30 bg-black/5 hover:bg-black/10 dark:bg-black/20 dark:hover:bg-black/30 transition-colors group text-left max-w-sm">
            {preview.image && (
                <div className="w-16 h-16 shrink-0 border-r border-black/10 dark:border-black/30 overflow-hidden bg-gray-100 dark:bg-slate-800">
                    <img src={preview.image} alt="preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => e.target.style.display='none'} />
                </div>
            )}
            <div className="flex-1 p-2.5 min-w-0 flex flex-col justify-center gap-0.5">
                <p className="text-[13px] font-bold leading-tight truncate px-0">{preview.title || preview.domain}</p>
                {preview.description && <p className="text-[11px] opacity-70 leading-snug line-clamp-1">{preview.description}</p>}
                <p className="text-[10px] opacity-50 uppercase tracking-widest truncate">{preview.domain}</p>
            </div>
        </a>
    );
};

const MessageText = ({ text, isOut, className = "text-[15px] leading-relaxed whitespace-pre-wrap break-words" }) => {
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
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-medium text-blue-600 hover:text-blue-700 dark:text-[#53bdeb] dark:hover:text-[#34B7F1]">
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
                    {uniqueUrls.map((url, i) => <LinkPreview key={i} url={url} />)}
                </div>
            )}
        </div>
    );
};

export default function WhatsAppChatPage() {
    const { leadId } = useParams();
    const navigate = useNavigate();

    const [lead, setLead] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null); // { id, content, direction }
    const [forwardMsg, setForwardMsg] = useState(null); // { content, type, mediaId }
    const [showMenu, setShowMenu] = useState(false);
    const [allLeads, setAllLeads] = useState([]);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const leadRef = useRef(null);

    // Lock background page scroll when chat is open (MUST be before any conditional returns)
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        leadRef.current = lead;
    }, [lead]);

    useEffect(() => {
        fetchLead();
    }, [leadId]);

    useEffect(() => {
        if (lead) {
            fetchMessages();
            // Mark messages as read when opening chat
            api.patch(`/whatsapp/messages/${leadId}/read`).catch(() => {});
        }
    }, [lead]);

    // Polling for real-time updates — uses ref to avoid stale closure
    useEffect(() => {
        const interval = setInterval(() => {
            if (leadRef.current) fetchMessages(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [leadId]);

    const prevMessagesLengthRef = useRef(0);
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current || prevMessagesLengthRef.current === 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLengthRef.current = messages.length;
    }, [messages.length]);

    const fetchLead = async () => {
        try {
            const res = await api.get(`/leads/${leadId}`);
            setLead(res.data);
        } catch (err) {
            toast.error('Failed to load lead details');
            navigate('/inbox');
        }
    };

    const fetchAllLeads = async () => {
        try {
            const res = await api.get('/leads?limit=200');
            setAllLeads((res.data.data || res.data || []).filter(l => l.id !== leadId && l.phone));
        } catch { /* silent */ }
    };

    useEffect(() => { fetchAllLeads(); }, []);

    const fetchMessages = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get(`/whatsapp/messages/${leadId}`);
            setMessages(res.data);
        } catch {
            setMessages([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const formatPhone = (phone) => {
        const digits = phone?.replace(/[^0-9]/g, '') || '';
        if (digits.length === 10) return `91${digits}`;
        return digits;
    };

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!text.trim() || sending) return;

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

            if (res.data.status === 'failed') {
                toast.error('Message failed to send. Check your WhatsApp API config.');
            }

            fetchMessages(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
            fetchMessages(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send file');
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClearChat = async () => {
        try {
            await api.delete(`/whatsapp/messages/${leadId}`);
            setMessages([]);
            setClearConfirm(false);
            setShowMenu(false);
            toast.success('Chat history cleared');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to clear chat');
        }
    };

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
        } catch (err) {
            toast.error('Failed to forward message');
        }
    };

    const formatTime = (date) =>
        new Date(date).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });

    if (!lead) {
        return (
            <div className="flex justify-center flex-col gap-4 items-center h-[60vh]">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-slate-400">Loading chat...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)]">
            {/* Forward Message Modal */}
            {showForwardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForwardModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                <Forward size={20} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Forward Message</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto mb-4 border border-gray-200 dark:border-slate-700 rounded-xl divide-y divide-gray-100 dark:divide-slate-700/50">
                            {allLeads.length === 0 ? (
                                <p className="text-gray-500 dark:text-slate-400 text-sm py-8 text-center bg-gray-50 dark:bg-slate-800/50">No other contacts available</p>
                            ) : (
                                allLeads.map(l => (
                                    <button
                                        key={l.id}
                                        onClick={() => handleForward(l)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors bg-white dark:bg-slate-800"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0">
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
                        <button onClick={() => setShowForwardModal(false)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Clear Chat Confirm */}
            {clearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setClearConfirm(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <Trash2 size={20} className="text-red-600" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">Clear Chat History</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-5">This will permanently delete all messages in this chat from your CRM. The messages on the customer's phone will not be affected.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setClearConfirm(false)} className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleClearChat} className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                                Clear Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 bg-gray-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
                <button
                    onClick={() => navigate('/inbox')}
                    className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getLeadColor(lead.name)} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <span className="text-white font-bold text-base">{lead.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{lead.name}</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-sm truncate">{lead.phone}</p>
                </div>
                {/* Three-dot menu */}
                <div className="relative">
                    <button onClick={() => setShowMenu(p => !p)} className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                        <MoreVertical size={20} />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-10 z-50 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden" onMouseLeave={() => setShowMenu(false)}>
                            <button onClick={() => { setClearConfirm(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 size={16} />
                                Clear Chat History
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-50 dark:bg-slate-950/50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23334155\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-500">
                        <MessageCircle size={48} className="mb-4 text-slate-600" />
                        <p className="text-base font-medium">No messages yet</p>
                        <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOut = msg.direction === 'outbound';
                        // Determine media type
                        const hasMediaId = !!msg.mediaId;
                        const isImage = msg.messageType === 'image' || (hasMediaId && msg.mimeType?.startsWith('image/'));
                        const isAudio = msg.messageType === 'audio' || (hasMediaId && msg.mimeType?.startsWith('audio/'));
                        const isDocument = msg.messageType === 'document' || msg.messageType === 'video' || (hasMediaId && !isImage && !isAudio);
                        
                        // Fallback for older messages
                        const isLegacyMedia = !msg.messageType && (msg.content?.includes('(Media)') || msg.content?.includes('.pdf') || msg.content?.includes('.png') || msg.content?.includes('.jpg') || msg.content?.includes('.jpeg'));
                        const isLegacyImage = isLegacyMedia && (msg.content?.toLowerCase().includes('.png') || msg.content?.toLowerCase().includes('.jpg') || msg.content?.toLowerCase().includes('.jpeg'));

                        return (
                            <div key={msg.id} className={`flex w-full ${isOut ? 'justify-end' : 'justify-start'} group`}>
                                <div className={`flex flex-col relative max-w-[85%] md:max-w-[75%] ${isOut ? 'items-end' : 'items-start'}`}>
                                {/* Action Buttons on hover */}
                                <div className={`absolute ${isOut ? '-left-16' : '-right-16'} top-2 hidden group-hover:flex items-center gap-1 z-10`}>
                                    <button
                                        onClick={() => setReplyTo(msg)}
                                        title="Reply"
                                        className="p-1.5 bg-white dark:bg-slate-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 transition-colors"
                                    >
                                        <Reply size={14} />
                                    </button>
                                    <button
                                        onClick={() => { setForwardMsg(msg); setShowForwardModal(true); }}
                                        title="Forward"
                                        className="p-1.5 bg-white dark:bg-slate-700 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 transition-colors"
                                    >
                                        <Forward size={14} />
                                    </button>
                                </div>
                                <div className={`rounded-2xl px-4 py-3 shadow-md w-fit ${isOut ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] border border-transparent dark:border-[#005c4b] rounded-br-md' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-bl-md'
                                    }`}>
                                    {msg.referral && (
                                        <div className={`mb-3 p-3 rounded-xl border flex flex-col gap-2 ${isOut ? 'bg-white/10 border-white/20' : 'bg-green-50/50 dark:bg-slate-700/50 border-green-200 dark:border-slate-600'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isOut ? 'bg-white/20 text-white' : 'bg-green-100 dark:bg-slate-600 text-green-700 dark:text-slate-300'}`}>
                                                    From Meta Ad
                                                </span>
                                            </div>
                                            <div>
                                                {msg.referral.headline && <p className="font-semibold text-sm leading-tight mb-1">{msg.referral.headline}</p>}
                                                {msg.referral.body && <p className="text-xs opacity-80 leading-snug line-clamp-3">{msg.referral.body}</p>}
                                                {msg.referral.source_url && (
                                                    <a href={msg.referral.source_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 mt-2 text-[11px] font-medium hover:underline ${isOut ? 'text-green-100' : 'text-blue-600 dark:text-blue-400'}`}>
                                                        View Ad Link &rarr;
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {hasMediaId ? (
                                        <div className="flex flex-col gap-1.5 mb-1.5">
                                            {isImage ? (
                                                <ImageWithAuth mediaId={msg.mediaId} alt={msg.content} />
                                            ) : isAudio ? (
                                                <AudioWithAuth mediaId={msg.mediaId} />
                                            ) : (
                                                <DocumentWithAuth mediaId={msg.mediaId} filename={msg.content} isOut={isOut} />
                                            )}
                                            {msg.content && msg.content !== '[image message]' && msg.content !== '[document message]' && msg.content !== '[audio message]' && msg.content !== '[video message]' && (
                                                <MessageText text={msg.content} isOut={isOut} className="text-[14px] leading-relaxed whitespace-pre-wrap break-words mt-1" />
                                            )}
                                        </div>
                                    ) : isLegacyMedia ? (
                                        <div className="flex items-center gap-2 mb-1 bg-black/10 p-2.5 rounded-lg border border-white/10">
                                            {isLegacyImage ? <ImageIcon size={20} className={isOut ? "text-green-100" : "text-blue-400"} /> : <FileText size={20} className={isOut ? "text-green-100" : "text-blue-400"} />}
                                            <span className="text-sm truncate font-medium">{msg.content.replace(' (Media)', '')}</span>
                                        </div>
                                    ) : (
                                        <MessageText text={msg.content} isOut={isOut} />
                                    )}
                                    <div className={`flex items-center gap-1.5 mt-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
                                        <span className={`text-[10px] ${isOut ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-slate-500'}`}>
                                            {formatTime(msg.createdAt)}
                                        </span>
                                        {isOut && statusIcons[msg.status]}
                                    </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            {!lead.phone ? (
                <div className="px-6 py-4 bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-700 text-center">
                    <p className="text-sm text-gray-500 dark:text-slate-400">No phone number available for this lead</p>
                </div>
            ) : (
                <div className="px-4 pt-2 pb-4 bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-700">
                    {/* Reply bar */}
                    {replyTo && (
                        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-xl border-l-4 border-green-500">
                            <Reply size={14} className="text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-green-600 dark:text-green-400">{replyTo.direction === 'outbound' ? 'You' : lead.name}</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400 truncate">{replyTo.content?.substring(0, 80)}</p>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSend} className="flex items-end gap-3 w-full relative">
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
                            className="p-3 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 rounded-xl transition-colors flex-shrink-0"
                            title="Attach File"
                        >
                            <Paperclip size={22} />
                        </button>

                        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all">
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
                                placeholder="Message..."
                                className="w-full max-h-32 bg-transparent px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-slate-500 focus:outline-none resize-none"
                                rows="1"
                                style={{ minHeight: '48px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending || (!text.trim() && !sending)}
                            className="w-12 h-12 flex-shrink-0 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg"
                        >
                            {sending ? <Clock size={20} className="animate-pulse" /> : <Send size={20} className="ml-1" />}
                        </button>
                    </form>
                    <div className="text-center mt-2.5">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">Press Enter to send, Shift+Enter for new line</span>
                    </div>
                </div>
            )}
        </div>
    );
}
