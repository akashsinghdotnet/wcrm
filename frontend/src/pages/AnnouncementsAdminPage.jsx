import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Megaphone, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function AnnouncementsAdminPage() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ title: '', content: '' });

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await api.get('/announcements');
            setAnnouncements(res.data);
        } catch (err) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (announcement = null) => {
        if (announcement) {
            setEditingId(announcement.id);
            setForm({ title: announcement.title, content: announcement.content });
        } else {
            setEditingId(null);
            setForm({ title: '', content: '' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setForm({ title: '', content: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                await api.patch(`/announcements/${editingId}`, form);
                toast.success('Announcement updated');
            } else {
                await api.post('/announcements', form);
                toast.success('Announcement broadcasted');
            }
            handleCloseModal();
            loadAnnouncements();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to save announcement');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            await api.delete(`/announcements/${id}`);
            toast.success('Announcement deleted');
            loadAnnouncements();
        } catch (err) {
            toast.error('Failed to delete announcement');
        }
    };

    if (loading && !announcements.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Megaphone className="w-6 h-6 text-indigo-400" />
                        Announcement Broadcasts
                    </h2>
                    <p className="text-slate-400 mt-1">Manage platform-wide announcements for all companies.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg"
                >
                    <Plus className="w-4 h-4" />
                    New Broadcast
                </button>
            </div>

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                        <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-slate-300">No Announcements</h3>
                        <p className="text-slate-500 mt-2">Create an announcement to instantly notify all client users.</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div key={announcement.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 transition-all hover:border-slate-700 relative group">
                            <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenModal(announcement)}
                                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(announcement.id)}
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-4 pr-20">
                                <h3 className="text-xl font-bold text-white">{announcement.title}</h3>
                                <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                                    {new Date(announcement.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="prose prose-invert prose-indigo max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: announcement.content }}
                            />
                            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                                    {announcement.author?.email?.[0]?.toUpperCase() || 'A'}
                                </span>
                                Author: {announcement.author?.name || announcement.author?.email}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900">
                            <h3 className="text-lg font-semibold text-white">
                                {editingId ? 'Edit Announcement' : 'New Broadcast'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Announcement Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Platform Update v2.0"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Message Content *</label>
                                <div className="bg-white rounded-xl overflow-hidden [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-slate-900 border border-slate-700">
                                    <ReactQuill
                                        theme="snow"
                                        value={form.content}
                                        onChange={(content) => setForm({ ...form, content })}
                                        readOnly={isSubmitting}
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, false] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['link'],
                                                ['clean']
                                            ],
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !form.title.trim() || !form.content.trim() || form.content === '<p><br></p>'}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 mt-4"
                            >
                                {isSubmitting ? 'Saving...' : editingId ? 'Update Broadcast' : 'Send Broadcast'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
