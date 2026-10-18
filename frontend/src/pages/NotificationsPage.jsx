import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useConfig } from '../context/ConfigContext';
import { fetchCommunityFeed, getDismissedAnnouncements } from '../services/communityFeed';
import toast from 'react-hot-toast';
import { 
    Bell, MessageCircle, Send, Bot, AlertTriangle, CheckCircle2, 
    Clock, Trash2, Filter, ArrowRight, Sparkles, ExternalLink 
} from 'lucide-react';

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { config } = useConfig();
    const isSelfHosted = config?.deployment_mode === 'self_hosted';
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Fetch unread whatsapp count & recent conversations to synthesize live notifications
            const [unreadRes, convRes] = await Promise.all([
                api.get('/whatsapp/unread-count').catch(() => ({ data: { count: 0 } })),
                api.get('/whatsapp/conversations').catch(() => ({ data: [] }))
            ]);

            const list = [];
            const convs = convRes.data || [];
            
            // Generate notifications from recent unread messages
            convs.filter(c => c.unreadCount > 0).forEach(c => {
                list.push({
                    id: `chat-${c.lead.id}`,
                    type: 'chat',
                    title: `New WhatsApp Message from ${c.lead.name || c.lead.phone}`,
                    message: c.lastMessage?.message || 'New inbound message received',
                    time: c.lastMessage?.createdAt || new Date().toISOString(),
                    unread: true,
                    link: `/inbox/${c.lead.id}`,
                    leadId: c.lead.id,
                });
            });


            // In self-hosted mode, inject remote community announcements & promotions
            if (isSelfHosted) {
                try {
                    const feed = await fetchCommunityFeed(config);
                    const dismissed = getDismissedAnnouncements();
                    feed?.announcements?.forEach(a => {
                        list.unshift({
                            id: a.id,
                            type: 'promo',
                            title: a.title,
                            message: a.message,
                            time: a.publishedAt || new Date().toISOString(),
                            unread: !dismissed.includes(a.id),
                            externalLink: a.ctaUrl,
                            ctaText: a.ctaText || 'Learn More',
                            isPromo: true,
                            badge: a.badge || 'Wcrm Cloud',
                        });
                    });
                } catch { /* ignore */ }
            }

            setNotifications(list);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
        toast.success('All notifications marked as read');
    };

    const clearAll = () => {
        setNotifications([]);
        toast.success('Notifications cleared');
    };

    const filtered = notifications.filter(n => {
        if (filter === 'all') return true;
        return n.type === filter;
    });

    const getIcon = (type) => {
        switch (type) {
            case 'chat':
                return <MessageCircle className="w-5 h-5 text-emerald-500" />;
            case 'broadcast':
                return <Send className="w-5 h-5 text-teal-500" />;
            case 'ai':
                return <Bot className="w-5 h-5 text-green-400" />;
            case 'promo':
                return <Sparkles className="w-5 h-5 text-indigo-400" />;
            default:
                return <Bell className="w-5 h-5 text-emerald-400" />;
        }
    };

    const formatTimestamp = (dateStr) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' +
                   d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                            <Bell className="w-6 h-6" />
                        </div>
                        WhatsApp Notifications
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Real-time alerts for customer chats, AI handovers, and broadcast status updates.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllAsRead}
                        className="px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                    >
                        Mark all as read
                    </button>
                    <button
                        onClick={clearAll}
                        className="px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all flex items-center gap-1.5"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                    { id: 'all', label: 'All Alerts' },
                    { id: 'chat', label: 'Customer Chats' },
                    { id: 'broadcast', label: 'Broadcasts' },
                    { id: 'ai', label: 'AI Agent' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                            filter === tab.id
                                ? 'bg-gradient-to-r from-[#075E54] to-[#25D366] text-white shadow-sm shadow-[#25D366]/20'
                                : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-3 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900/60 rounded-2xl border border-gray-200 dark:border-slate-800/80 p-8">
                    <CheckCircle2 className="w-12 h-12 text-[#25D366] mx-auto mb-3 opacity-80" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Caught Up!</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        No pending notifications right now. New inbound WhatsApp chats and campaign alerts will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                                item.unread 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/50' 
                                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
                            }`}
                        >
                            <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 shrink-0 mt-0.5">
                                {getIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {item.title}
                                    </h4>
                                    <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTimestamp(item.time)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 line-clamp-2">
                                    {item.message}
                                </p>
                            </div>
                            {item.externalLink ? (
                                <a
                                    href={item.externalLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shrink-0 transition-all shadow-sm"
                                >
                                    <span>{item.ctaText || 'Learn More'}</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            ) : item.link ? (
                                <button
                                    onClick={() => navigate(item.link)}
                                    className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                                    title="View"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
