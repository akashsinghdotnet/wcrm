import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, MessageCircle, Clock, Paperclip, AlertCircle, Check, CheckCheck } from 'lucide-react';

const statusIcons = {
    sent: <Check size={14} className="text-gray-400" />,
    delivered: <CheckCheck size={14} className="text-gray-400" />,
    read: <CheckCheck size={14} className="text-[#34B7F1]" />,
    failed: <AlertCircle size={14} className="text-red-400" />,
};

export default function WhatsAppDirectChatPage() {
    const { phone } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const name = searchParams.get('name') || phone;

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const pollRef = useRef(null);

    // Normalise phone for sending (strip non-digits, ensure country code)
    const formatPhone = (p) => {
        const digits = p?.replace(/[^0-9]/g, '') || '';
        if (digits.length === 10) return '91' + digits;
        return digits;
    };

    const formattedPhone = formatPhone(phone);

    const fetchMessages = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            // Try to fetch messages by searching existing conversations
            const res = await api.get(`/whatsapp/messages/phone/${formattedPhone}`);
            setMessages(res.data || []);
        } catch {
            // No messages yet — that's fine, start fresh
            setMessages([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        pollRef.current = setInterval(() => fetchMessages(true), 5000);
        return () => clearInterval(pollRef.current);
    }, [phone]);

    // Lock background page scroll when chat is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!text.trim() || sending) return;
        const msg = text.trim();
        setText('');
        setSending(true);
        try {
            await api.post('/whatsapp/send', {
                to: formattedPhone,
                message: msg,
                type: 'text',
            });
            // Optimistically add sent message
            setMessages(prev => [...prev, {
                id: `local_${Date.now()}`,
                content: msg,
                direction: 'outbound',
                status: 'sent',
                createdAt: new Date().toISOString(),
                messageType: 'text',
            }]);
            setTimeout(() => fetchMessages(true), 1000);
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
            const type = file.type.startsWith('image/') ? 'image' : 'document';
            await api.post('/whatsapp/send', {
                to: formattedPhone,
                type,
                mediaId,
                message: file.name,
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
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit',
        });

    const initials = name?.charAt(0)?.toUpperCase() || '?';

    return (
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)]">
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-4 bg-gray-100 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
                <button
                    onClick={() => navigate('/whatsapp-chats')}
                    className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-bold text-base">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{name}</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-sm truncate">{phone}</p>
                </div>
            </div>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-50 dark:bg-slate-950/50"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23334155\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
            >
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-500">
                        <MessageCircle size={48} className="mb-4 text-slate-500" />
                        <p className="text-base font-medium">No messages yet</p>
                        <p className="text-sm mt-1">Send a message to start the conversation</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOut = msg.direction === 'outbound';
                        return (
                            <div key={msg.id} className={`flex w-full ${isOut ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                                    isOut
                                        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-br-md'
                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-bl-md'
                                }`}>
                                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                                    <div className={`flex items-center gap-1.5 mt-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTime(msg.createdAt)}</span>
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
            <div className="px-4 pt-2 pb-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
                <form onSubmit={handleSend} className="flex items-end gap-3 w-full">
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
                        className="p-3 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex-shrink-0"
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
                        disabled={sending || !text.trim()}
                        className="w-12 h-12 flex-shrink-0 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all shadow-lg"
                    >
                        {sending ? <Clock size={20} className="animate-pulse" /> : <Send size={20} className="ml-1" />}
                    </button>
                </form>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">Press Enter to send · Shift+Enter for new line</span>
                </div>
            </div>
        </div>
    );
}
