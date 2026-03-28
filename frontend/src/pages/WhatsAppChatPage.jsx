import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, MessageCircle, CheckCheck, Clock, AlertCircle, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';

const statusIcons = {
    sent: <CheckCheck size={12} className="text-gray-400 dark:text-slate-500" />,
    delivered: <CheckCheck size={12} className="text-blue-400" />,
    read: <CheckCheck size={12} className="text-green-400" />,
    failed: <AlertCircle size={12} className="text-red-400" />,
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

export default function WhatsAppChatPage() {
    const { leadId } = useParams();
    const navigate = useNavigate();

    const [lead, setLead] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const leadRef = useRef(null);

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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchLead = async () => {
        try {
            const res = await api.get(`/leads/${leadId}`);
            setLead(res.data);
        } catch (err) {
            toast.error('Failed to load lead details');
            navigate('/whatsapp-chats');
        }
    };

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
        setText('');
        setSending(true);

        try {
            const res = await api.post('/whatsapp/send', {
                leadId: lead.id,
                to: formatPhone(lead.phone),
                message: msg,
                type: 'text'
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
        <div className="h-[calc(100vh-8rem)] max-w-4xl mx-auto flex flex-col bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 bg-gray-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
                <button
                    onClick={() => navigate('/whatsapp-chats')}
                    className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                    <span className="text-green-400 font-semibold">{lead.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{lead.name}</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-sm truncate">{lead.phone}</p>
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
                        const isDocument = msg.messageType === 'document' || msg.messageType === 'audio' || msg.messageType === 'video' || (hasMediaId && !isImage);
                        
                        // Fallback for older messages
                        const isLegacyMedia = !msg.messageType && (msg.content?.includes('(Media)') || msg.content?.includes('.pdf') || msg.content?.includes('.png') || msg.content?.includes('.jpg') || msg.content?.includes('.jpeg'));
                        const isLegacyImage = isLegacyMedia && (msg.content?.toLowerCase().includes('.png') || msg.content?.toLowerCase().includes('.jpg') || msg.content?.toLowerCase().includes('.jpeg'));

                        return (
                            <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${isOut ? 'bg-green-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-bl-md'
                                    }`}>
                                    {hasMediaId ? (
                                        <div className="flex flex-col gap-1.5 mb-1.5">
                                            {isImage ? (
                                                <ImageWithAuth mediaId={msg.mediaId} alt={msg.content} />
                                            ) : (
                                                <DocumentWithAuth mediaId={msg.mediaId} filename={msg.content} isOut={isOut} />
                                            )}
                                            {msg.content && msg.content !== '[image message]' && msg.content !== '[document message]' && msg.content !== '[audio message]' && msg.content !== '[video message]' && (
                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words mt-1">{msg.content}</p>
                                            )}
                                        </div>
                                    ) : isLegacyMedia ? (
                                        <div className="flex items-center gap-2 mb-1 bg-black/10 p-2.5 rounded-lg border border-white/10">
                                            {isLegacyImage ? <ImageIcon size={20} className={isOut ? "text-green-100" : "text-blue-400"} /> : <FileText size={20} className={isOut ? "text-green-100" : "text-blue-400"} />}
                                            <span className="text-sm truncate font-medium">{msg.content.replace(' (Media)', '')}</span>
                                        </div>
                                    ) : (
                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                    )}
                                    <div className={`flex items-center gap-1.5 mt-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
                                        <span className={`text-[10px] ${isOut ? 'text-green-200' : 'text-gray-400 dark:text-slate-500'}`}>
                                            {formatTime(msg.createdAt)}
                                        </span>
                                        {isOut && statusIcons[msg.status]}
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
                <div className="px-4 py-4 bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-700">
                    <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto relative">
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
