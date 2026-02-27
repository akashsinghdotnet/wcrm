import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { MessageCircle, Search, Phone, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function WhatsAppChatsPage() {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchConversations();

        // Polling to keep recent messages/conversations list fresh
        const interval = setInterval(() => {
            fetchConversations(true);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const fetchConversations = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const res = await api.get('/whatsapp/conversations');
            setConversations(res.data);
        } catch {
            // No config or no messages yet
            setConversations([]);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const filtered = conversations.filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            c.lead.name?.toLowerCase().includes(q) ||
            c.lead.phone?.includes(q) ||
            c.lead.email?.toLowerCase().includes(q)
        );
    });

    const formatTime = (date) => {
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

    const statusColors = {
        new: 'bg-blue-500',
        contacted: 'bg-yellow-500',
        follow_up: 'bg-orange-500',
        converted: 'bg-emerald-500',
        lost: 'bg-red-500',
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 text-green-400" />
                        WhatsApp Chats
                    </h2>
                    <p className="text-slate-400 mt-1">View and continue conversations with your leads</p>
                </div>
                <span className="text-xs text-slate-500">{conversations.length} conversations</span>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, or email..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
            </div>

            {/* Conversations List */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <MessageCircle size={48} className="mb-4 text-slate-600" />
                    <p className="text-lg font-medium text-slate-400">
                        {conversations.length === 0 ? 'No conversations yet' : 'No matching conversations'}
                    </p>
                    <p className="text-sm mt-1">
                        {conversations.length === 0
                            ? 'Start chatting with leads from the Leads page'
                            : 'Try a different search term'}
                    </p>
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                    {filtered.map((conv) => (
                        <button
                            key={conv.lead.id}
                            onClick={() => navigate(`/whatsapp-chats/${conv.lead.id}`)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                        >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                                    <span className="text-green-400 font-semibold text-sm">
                                        {conv.lead.name?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${statusColors[conv.lead.status] || 'bg-slate-500'}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-sm font-semibold text-white truncate">{conv.lead.name}</h3>
                                    {conv.lastMessage && (
                                        <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">
                                            {formatTime(conv.lastMessage.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {conv.lastMessage && (
                                            <>
                                                {conv.lastMessage.direction === 'outbound' ? (
                                                    <ArrowUpRight size={12} className="text-green-400 flex-shrink-0" />
                                                ) : (
                                                    <ArrowDownLeft size={12} className="text-blue-400 flex-shrink-0" />
                                                )}
                                                <p className="text-xs text-slate-400 truncate">
                                                    {conv.lastMessage.content?.includes('(Media)') ? 'Media attached' : conv.lastMessage.content}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                        {conv.unreadCount > 0 && (
                                            <span className="min-w-[20px] h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    {conv.lead.phone && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <Phone size={9} /> {conv.lead.phone}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                        <Clock size={9} /> {conv.messageCount} messages
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
