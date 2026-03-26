import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { X, Send, MessageCircle, CheckCheck, Clock, AlertCircle } from 'lucide-react';

const statusIcons = {
    sent: <CheckCheck size={12} className="text-gray-400 dark:text-slate-500" />,
    delivered: <CheckCheck size={12} className="text-blue-400" />,
    read: <CheckCheck size={12} className="text-green-400" />,
    failed: <AlertCircle size={12} className="text-red-400" />,
};

export default function WhatsAppChat({ lead, onClose }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (lead?.id) fetchMessages();
    }, [lead?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/whatsapp/messages/${lead.id}`);
            setMessages(res.data);
        } catch {
            // Config may not exist yet — show empty chat
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (phone) => {
        const digits = phone.replace(/[^0-9]/g, '');
        if (digits.length === 10) return `91${digits}`;
        return digits;
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        const msg = text.trim();
        setText('');
        setSending(true);

        try {
            const res = await api.post('/whatsapp/send', {
                leadId: lead.id,
                to: formatPhone(lead.phone),
                message: msg,
            });

            if (res.data.status === 'failed') {
                toast.error('Message failed to send. Check server logs or WhatsApp API config.', {
                    duration: 5000,
                });
                console.error('WhatsApp send failed:', res.data);
            } else {
                toast.success('Message sent');
            }

            fetchMessages();
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to send message';
            console.error('WhatsApp send error:', err.response?.data || err);

            if (errorMsg.includes('not configured')) {
                toast.error('WhatsApp not configured. Please go to Settings → Integrations → WhatsApp.', {
                    duration: 6000,
                });
            } else {
                toast.error(errorMsg, { duration: 5000 });
            }
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const formatTime = (date) =>
        new Date(date).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Chat Panel */}
            <div className="relative w-full max-w-md h-[600px] max-h-[85vh] bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-green-600 rounded-t-2xl">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <MessageCircle size={20} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 dark:text-white font-semibold truncate">{lead.name}</h3>
                        <p className="text-green-100 text-xs truncate">{lead.phone}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-900 dark:text-white/70 hover:text-gray-900 dark:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 dark:bg-slate-950/50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23334155\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                            <MessageCircle size={40} className="mb-3 text-slate-600" />
                            <p className="text-sm font-medium">No messages yet</p>
                            <p className="text-xs mt-1">Send a message to start the conversation</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                        msg.direction === 'outbound'
                                            ? 'bg-green-600 text-white rounded-br-md'
                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 rounded-bl-md'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                    {msg.status === 'failed' && msg.errorDetail && (
                                        <p className="text-[10px] mt-1 text-red-300 opacity-80 break-words">
                                            ⚠ {msg.errorDetail}
                                        </p>
                                    )}
                                    <div className={`flex items-center gap-1.5 mt-1 ${
                                        msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                                    }`}>
                                        <span className={`text-[10px] ${
                                            msg.status === 'failed' ? 'text-red-300' :
                                            msg.direction === 'outbound' ? 'text-green-200' : 'text-gray-400 dark:text-slate-500'
                                        }`}>
                                            {formatTime(msg.createdAt)}
                                        </span>
                                        {msg.direction === 'outbound' && statusIcons[msg.status]}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                {!lead.phone ? (
                    <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-700 text-center">
                        <p className="text-xs text-gray-400 dark:text-slate-500">No phone number available for this lead</p>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border-t border-gray-300 dark:border-slate-700">
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-200 dark:bg-slate-700 border border-gray-400 dark:border-slate-600 rounded-full px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition-colors"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={sending || !text.trim()}
                            className="w-10 h-10 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
                        >
                            {sending ? (
                                <Clock size={16} className="animate-pulse" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
