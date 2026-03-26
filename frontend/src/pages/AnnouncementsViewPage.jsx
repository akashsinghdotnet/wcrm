import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Megaphone, ArrowLeft, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AnnouncementsViewPage() {
    const navigate = useNavigate();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        try {
            const res = await api.get('/announcements/for-me');
            setAnnouncements(res.data);
        } catch {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/announcements/mark-all-read');
            setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
            toast.success('All marked as read');
        } catch { }
    };

    const unreadCount = announcements.filter(a => !a.isRead).length;

    if (loading) {
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
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h2>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Stay updated with the latest news and updates</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:text-white text-sm font-medium rounded-xl transition-all border border-gray-300 dark:border-slate-700"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read ({unreadCount})
                    </button>
                )}
            </div>

            {announcements.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                    <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-slate-300">No Announcements Yet</h3>
                    <p className="text-gray-400 dark:text-slate-500 mt-2">Check back later for company news and updates.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((a) => (
                        <div
                            key={a.id}
                            className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 transition-all hover:border-gray-300 dark:border-slate-700 ${!a.isRead ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-gray-200 dark:border-slate-800'}`}
                        >
                            <div className="flex items-start gap-3">
                                {!a.isRead && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                )}
                                <div className={`flex-1 ${a.isRead ? 'ml-[22px]' : ''}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className={`text-lg font-semibold ${a.isRead ? 'text-gray-600 dark:text-slate-300' : 'text-gray-900 dark:text-white'}`}>{a.title}</h3>
                                        <span className="text-xs text-gray-400 dark:text-slate-500">
                                            {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div
                                        className="text-sm text-gray-500 dark:text-slate-400 prose prose-invert prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: a.content }}
                                    />
                                    {a.author && (
                                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">
                                            By {a.author.name || a.author.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
