import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CalendarDays, MapPin, Users, IndianRupee, Plus, X, ArrowLeft, Ticket, FileText, CheckCircle2, Clock, Trash2, Edit2, Link2, Copy, Check } from 'lucide-react';

export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [eventForm, setEventForm] = useState({
        title: '', slug: '', description: '', location: '', address: '',
        category: '', startDate: '', endDate: '', startTime: '', endTime: '',
        timezone: 'Asia/Kolkata', capacity: 0, price: 0, status: 'draft', isPublic: true
    });
    const [isSaving, setIsSaving] = useState(false);
    const [copiedLink, setCopiedLink] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events');
            setEvents(res.data);
        } catch {
            toast.error('Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEvent = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (eventForm.id) {
                const res = await api.patch(`/events/${eventForm.id}`, eventForm);
                setEvents(events.map(ev => ev.id === eventForm.id ? res.data : ev));
                toast.success('Event updated');
                if (selectedEvent?.id === eventForm.id) setSelectedEvent(res.data);
            } else {
                const res = await api.post('/events', eventForm);
                setEvents([res.data, ...events]);
                toast.success('Event created');
            }
            setIsEventModalOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save event');
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteEvent = (id) => {
        setEventToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        try {
            await api.delete(`/events/${eventToDelete}`);
            toast.success('Event deleted');
            setEvents(events.filter(ev => ev.id !== eventToDelete));
            if (selectedEvent?.id === eventToDelete) setSelectedEvent(null);
            setIsDeleteModalOpen(false);
            setEventToDelete(null);
        } catch {
            toast.error('Failed to delete event');
        }
    };

    const copyToClipboard = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(key);
        toast.success('Link copied');
        setTimeout(() => setCopiedLink(null), 2000);
    };

    if (loading) return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <>
            {selectedEvent ? (
                <EventDetailView 
                    event={selectedEvent} 
                    onBack={() => setSelectedEvent(null)} 
                    onEdit={() => { 
                        setEventForm({
                            ...selectedEvent,
                            startDate: selectedEvent.startDate ? new Date(selectedEvent.startDate).toISOString().split('T')[0] : '',
                            endDate: selectedEvent.endDate ? new Date(selectedEvent.endDate).toISOString().split('T')[0] : ''
                        }); 
                        setIsEventModalOpen(true); 
                    }}
                />
            ) : (
                <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CalendarDays className="w-6 h-6 text-violet-500" />
                        Events
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your events, ticket types, and bookings.</p>
                </div>
                <button
                    onClick={() => {
                        setEventForm({ title: '', slug: '', description: '', location: '', address: '', category: '', startDate: '', endDate: '', startTime: '', endTime: '', timezone: 'Asia/Kolkata', capacity: 0, status: 'draft', isPublic: true });
                        setIsEventModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-violet-600/20"
                >
                    <Plus className="w-4 h-4" /> Create Event
                </button>
            </div>

            {/* Events List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {events.map(event => (
                    <div key={event.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 hover:border-violet-500/30 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0 pr-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-violet-500" onClick={() => setSelectedEvent(event)}>
                                    {event.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${event.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {event.status}
                                    </span>
                                    {event.isPublic && <span className="text-[10px] text-violet-500 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded font-medium">PUBLIC</span>}
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex flex-col items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                                <span className="text-[10px] font-bold uppercase leading-none mb-0.5">{event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}</span>
                                <span className="text-lg font-bold leading-none">{event.startDate ? new Date(event.startDate).getDate() : '-'}</span>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                <Clock className="w-4 h-4 shrink-0" />
                                <span className="truncate">{event.startTime || 'Time TBA'} {event.endTime ? `- ${event.endTime}` : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="truncate">{event.location || 'Location TBA'}</span>
                            </div>
                            {event.capacity > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                    <Users className="w-4 h-4 shrink-0" />
                                    <span>Max {event.capacity} attendees</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                            <button onClick={() => setSelectedEvent(event)} className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                                Manage Event
                            </button>
                            {event.status === 'published' && (
                                <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/event/${event.slug}`, event.id)}
                                    className="p-2 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 rounded-lg transition-colors"
                                    title="Copy Public Link"
                                >
                                    {copiedLink === event.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
                                </button>
                            )}
                            <button onClick={() => confirmDeleteEvent(event.id)} className="p-2 border border-gray-200 dark:border-slate-700 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Delete Event">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {events.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl border-dashed">
                        <CalendarDays className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-600 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No events yet</h3>
                        <p className="text-sm mb-4">Create your first event to start selling tickets.</p>
                        <button
                            onClick={() => { setEventForm({ title: '', slug: '', status: 'draft', isPublic: true, capacity: 0, price: 0 }); setIsEventModalOpen(true); }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Create Event
                        </button>
                    </div>
                )}
                </div>
                </div>
            )}

            {/* Event Form Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {eventForm.id ? 'Edit Event' : 'Create Event'}
                            </h3>
                            <button onClick={() => setIsEventModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <form id="event-form" onSubmit={handleSaveEvent} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Event Title</label>
                                    <input type="text" required value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" placeholder="e.g. Summer Music Festival" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                                    <textarea rows="3" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" placeholder="Tell attendees what this event is about..." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Date</label>
                                        <input type="date" required value={eventForm.startDate} onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End Date</label>
                                        <input type="date" value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Time <span className="text-gray-400 text-xs">(optional)</span></label>
                                        <input type="time" value={eventForm.startTime} onChange={e => setEventForm({ ...eventForm, startTime: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End Time <span className="text-gray-400 text-xs">(optional)</span></label>
                                        <input type="time" value={eventForm.endTime} onChange={e => setEventForm({ ...eventForm, endTime: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Event Price (₹)</label>
                                        <input type="number" min="0" step="0.01" value={eventForm.price} onChange={e => setEventForm({ ...eventForm, price: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" placeholder="0 = Free" />
                                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Set to 0 for free events. You can also add ticket types with separate pricing later.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Location Name</label>
                                        <input type="text" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" placeholder="e.g. Central Park" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max Capacity (0 = Unlimited)</label>
                                        <input type="number" min="0" required value={eventForm.capacity} onChange={e => setEventForm({ ...eventForm, capacity: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                                        <select value={eventForm.status} onChange={e => setEventForm({ ...eventForm, status: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none">
                                            <option value="draft">Draft (Hidden)</option>
                                            <option value="published">Published (Live)</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-slate-800 flex gap-3">
                            <button onClick={() => setIsEventModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button form="event-form" type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-full">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Event</h3>
                        </div>
                        <p className="text-gray-600 dark:text-slate-300 mb-6 font-medium">
                            If the event will be deleted all the data related to that event also will be deleted and can't be recovered again.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setIsDeleteModalOpen(false); setEventToDelete(null); }}
                                className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteEvent}
                                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function EventDetailView({ event, onBack, onEdit }) {
    const [activeTab, setActiveTab] = useState('tickets');
    const [ticketTypes, setTicketTypes] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [ticketForm, setTicketForm] = useState({ name: '', price: 0, quantity: 0, maxPerBooking: 10, isActive: true });
    
    // Widget Customizer State
    const [customPrimaryColor, setCustomPrimaryColor] = useState('#8b5cf6'); // Default violet-500
    const [customBgColor, setCustomBgColor] = useState('#020617'); // Default slate-950
    const [customFont, setCustomFont] = useState('Inter'); // Default
    
    
    useEffect(() => {
        fetchEventDetails();
    }, [event.id]);

    const handleStatusChange = async (bookingId, newStatus) => {
        try {
            await api.patch(`/events/bookings/${bookingId}/status`, { status: newStatus });
            setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
            toast.success('Status updated');
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const fetchEventDetails = async () => {
        setLoading(true);
        try {
            const [ttRes, bkRes, stRes] = await Promise.all([
                api.get(`/events/${event.id}/ticket-types`),
                api.get(`/events/${event.id}/bookings`),
                api.get(`/events/${event.id}/stats`)
            ]);
            setTicketTypes(ttRes.data);
            setBookings(bkRes.data);
            setStats(stRes.data);
        } catch {
            toast.error('Failed to load event details');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTicket = async (e) => {
        e.preventDefault();
        try {
            if (ticketForm.id) {
                const res = await api.patch(`/events/ticket-types/${ticketForm.id}`, ticketForm);
                setTicketTypes(ticketTypes.map(t => t.id === ticketForm.id ? res.data : t));
                toast.success('Ticket type updated');
            } else {
                const res = await api.post(`/events/${event.id}/ticket-types`, ticketForm);
                setTicketTypes([...ticketTypes, res.data]);
                toast.success('Ticket type created');
            }
            setIsTicketModalOpen(false);
        } catch {
            toast.error('Failed to save ticket type');
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-violet-500 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Events
            </button>

            {/* Event Header Banner */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-8 relative">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="text-white">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${event.status === 'published' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-white/20 text-white'}`}>
                                    {event.status}
                                </span>
                                {event.isPublic && <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-white/20 text-white">PUBLIC</span>}
                            </div>
                            <h2 className="text-3xl font-bold mb-2">{event.title}</h2>
                            <div className="flex flex-wrap items-center gap-4 text-violet-100 text-sm font-medium">
                                {event.startDate && <div className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {new Date(event.startDate).toLocaleDateString()}</div>}
                                {event.location && <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {event.location}</div>}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {event.status === 'published' && (
                                <>
                                    <button onClick={() => {
                                        const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin;
                                        const snippet = `<script src="${apiUrl}/widget/event-booking.js" data-slug="${event.slug}"></script>`;
                                        navigator.clipboard.writeText(snippet);
                                        toast.success('Widget snippet copied to clipboard!');
                                    }} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm flex items-center gap-2">
                                        <Copy className="w-4 h-4" /> Copy Widget
                                    </button>
                                    <a href={`/event/${event.slug}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm flex items-center gap-2">
                                        <Link2 className="w-4 h-4" /> View Public Page
                                    </a>
                                </>
                            )}
                            <button onClick={onEdit} className="px-4 py-2 bg-white text-violet-600 hover:bg-violet-50 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                                <Edit2 className="w-4 h-4" /> Edit Details
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                {!loading && stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-slate-800 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                        <div className="p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Total Bookings</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBookings}</p>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Confirmed</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.confirmedBookings}</p>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Pending</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingBookings}</p>
                        </div>
                        <div className="p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                )}
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-slate-800 px-6 pt-2">
                    <button onClick={() => setActiveTab('tickets')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tickets' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                        <Ticket className="w-4 h-4" /> Ticket Types
                    </button>
                    <button onClick={() => setActiveTab('bookings')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'bookings' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                        <Users className="w-4 h-4" /> Bookings
                    </button>
                    <button onClick={() => setActiveTab('integration')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'integration' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
                        <Copy className="w-4 h-4" /> Integration
                    </button>
                </div>
                
                {/* Tab Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : activeTab === 'tickets' ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ticket Types</h3>
                                <button onClick={() => { setTicketForm({ name: '', price: 0, quantity: 0, maxPerBooking: 10, isActive: true }); setIsTicketModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 dark:text-violet-400 rounded-lg text-sm font-medium transition-colors">
                                    <Plus className="w-4 h-4" /> Add Ticket Tier
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ticketTypes.map(ticket => (
                                    <div key={ticket.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/30 relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{ticket.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${ticket.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                                <button onClick={() => { setTicketForm(ticket); setIsTicketModalOpen(true); }} className="text-gray-400 hover:text-violet-500"><Edit2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-violet-600 dark:text-violet-400 mb-3">
                                            {Number(ticket.price) === 0 ? 'Free' : `₹${ticket.price}`}
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-500 dark:text-slate-400">
                                            <div className="flex justify-between"><span>Available:</span> <span className="font-medium">{ticket.quantity === 0 ? 'Unlimited' : `${ticket.quantity - ticket.quantitySold} / ${ticket.quantity}`}</span></div>
                                            <div className="flex justify-between"><span>Max per order:</span> <span className="font-medium">{ticket.maxPerBooking}</span></div>
                                        </div>
                                    </div>
                                ))}
                                {ticketTypes.length === 0 && (
                                    <div className="col-span-full py-8 text-center text-gray-500 dark:text-slate-400 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl">
                                        No ticket types created yet. Add one to allow bookings.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'bookings' ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Bookings</h3>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3">Reference</th>
                                            <th className="px-4 py-3">Guest</th>
                                            <th className="px-4 py-3">Ticket</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Method</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700 text-gray-700 dark:text-slate-300">
                                        {bookings.map(bk => (
                                            <tr key={bk.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3 font-mono text-xs">{bk.bookingRef}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-white">{bk.firstName} {bk.lastName}</div>
                                                    <div className="text-xs text-gray-500">{bk.guestEmail}</div>
                                                </td>
                                                <td className="px-4 py-3">{bk.quantity}x {bk.ticketTypeName}</td>
                                                <td className="px-4 py-3 font-medium">₹{bk.totalAmount}</td>
                                                <td className="px-4 py-3 capitalize text-xs">{(bk.paymentMethod || 'none').replace('_', ' ')}</td>
                                                <td className="px-4 py-3">
                                                    <select 
                                                        value={bk.status}
                                                        onChange={(e) => handleStatusChange(bk.id, e.target.value)}
                                                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border-0 outline-none cursor-pointer ${
                                                            bk.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                            bk.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                                            'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                                        }`}
                                                    >
                                                        <option value="pending" className="text-gray-900 bg-white">Pending</option>
                                                        <option value="confirmed" className="text-gray-900 bg-white">Confirmed</option>
                                                        <option value="cancelled" className="text-gray-900 bg-white">Cancelled</option>
                                                        <option value="refunded" className="text-gray-900 bg-white">Refunded</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-xs">{new Date(bk.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {bookings.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No bookings yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeTab === 'integration' ? (
                        <div className="space-y-6 max-w-4xl">
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Website Widget</h3>
                                </div>
                                <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">
                                    Embed the booking widget directly into your WordPress site or landing page. Customize the colors and fonts below to perfectly match your brand's UI. The widget will automatically resize to fit your page.
                                </p>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-5">
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Customization</h4>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Primary Theme Color</label>
                                            <div className="flex items-center gap-3">
                                                <input type="color" value={customPrimaryColor} onChange={(e) => setCustomPrimaryColor(e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer p-0 bg-transparent" />
                                                <input type="text" value={customPrimaryColor} onChange={(e) => setCustomPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Background Color (Dark mode recommended)</label>
                                            <div className="flex items-center gap-3">
                                                <input type="color" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="w-10 h-10 rounded border-0 cursor-pointer p-0 bg-transparent" />
                                                <input type="text" value={customBgColor} onChange={(e) => setCustomBgColor(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Font Family</label>
                                            <select value={customFont} onChange={(e) => setCustomFont(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none">
                                                <option value="Inter">Inter (Modern Sans)</option>
                                                <option value="Roboto">Roboto</option>
                                                <option value="Outfit">Outfit</option>
                                                <option value="system-ui">System Default (Matches OS)</option>
                                                <option value="Georgia">Georgia (Serif)</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 dark:bg-slate-950 rounded-xl p-5 border border-gray-200 dark:border-slate-800 flex flex-col justify-center items-center relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${customPrimaryColor} 0%, transparent 70%)` }}></div>
                                        <div className="relative z-10 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: `${customPrimaryColor}40`, backgroundColor: customBgColor, fontFamily: customFont }}>
                                            <div className="p-4 border-b" style={{ borderColor: `${customPrimaryColor}30` }}>
                                                <div className="w-20 h-4 rounded-full opacity-30 mb-2" style={{ backgroundColor: customPrimaryColor }}></div>
                                                <div className="w-full h-8 rounded-lg opacity-80" style={{ backgroundColor: customPrimaryColor }}></div>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <div className="flex gap-2">
                                                    <div className="w-6 h-6 rounded-full opacity-40" style={{ backgroundColor: customPrimaryColor }}></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="w-full h-2 rounded opacity-20" style={{ backgroundColor: customPrimaryColor }}></div>
                                                        <div className="w-2/3 h-2 rounded opacity-20" style={{ backgroundColor: customPrimaryColor }}></div>
                                                    </div>
                                                </div>
                                                <button className="w-full py-2 rounded-lg text-white text-xs font-bold mt-2 shadow-lg" style={{ backgroundColor: customPrimaryColor, boxShadow: `0 4px 14px 0 ${customPrimaryColor}66` }}>Confirm & Pay</button>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-xs text-gray-500 font-medium">Live Preview</p>
                                    </div>
                                </div>
                                
                                <div className="relative group mt-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider mb-3">Embed Code</h4>
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl opacity-20 group-hover:opacity-30 transition-opacity blur"></div>
                                    <div className="relative bg-slate-950 rounded-xl p-4 font-mono text-sm overflow-x-auto border border-slate-800">
                                        <button onClick={() => {
                                            const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin;
                                            const snippet = `<script src="${apiUrl}/widget/event-booking.js" data-slug="${event.slug}" data-theme-color="${customPrimaryColor}" data-bg-color="${customBgColor}" data-font="${customFont}"></script>`;
                                            navigator.clipboard.writeText(snippet);
                                            toast.success('Customized widget copied to clipboard');
                                        }} className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2">
                                            <Copy className="w-4 h-4" /> <span className="text-xs font-medium">Copy Snippet</span>
                                        </button>
                                        <pre className="text-slate-300 mt-2">
                                            <code>
<span className="text-pink-400">&lt;script</span> <span className="text-emerald-400">src</span>=<span className="text-amber-300">"{import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : window.location.origin}/widget/event-booking.js"</span>
        <span className="text-emerald-400">data-slug</span>=<span className="text-amber-300">"{event.slug}"</span>
        <span className="text-emerald-400">data-theme-color</span>=<span className="text-amber-300">"{customPrimaryColor}"</span>
        <span className="text-emerald-400">data-bg-color</span>=<span className="text-amber-300">"{customBgColor}"</span>
        <span className="text-emerald-400">data-font</span>=<span className="text-amber-300">"{customFont}"</span><span className="text-pink-400">&gt;&lt;/script&gt;</span>
                                            </code>
                                        </pre>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 rounded-xl">
                                    <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <strong>Note:</strong> Ensure you have published your event before embedding the widget, as unpublished events will not display available ticket tiers.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Ticket Modal */}
            {isTicketModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-slate-800">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {ticketForm.id ? 'Edit Ticket' : 'Add Ticket Type'}
                            </h3>
                            <button onClick={() => setIsTicketModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSaveTicket} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ticket Name</label>
                                <input type="text" required value={ticketForm.name} onChange={e => setTicketForm({...ticketForm, name: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500" placeholder="e.g. VIP, General" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Price (₹)</label>
                                    <input type="number" min="0" required value={ticketForm.price} onChange={e => setTicketForm({...ticketForm, price: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Max qty per order</label>
                                    <input type="number" min="1" required value={ticketForm.maxPerBooking} onChange={e => setTicketForm({...ticketForm, maxPerBooking: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Total Available (0 = Unlimited)</label>
                                <input type="number" min="0" required value={ticketForm.quantity} onChange={e => setTicketForm({...ticketForm, quantity: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-violet-500" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input type="checkbox" checked={ticketForm.isActive} onChange={e => setTicketForm({...ticketForm, isActive: e.target.checked})} className="w-4 h-4 text-violet-600 rounded border-gray-300" />
                                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Ticket type is active (visible to public)</span>
                            </label>
                            <button type="submit" className="w-full mt-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors">
                                Save Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
