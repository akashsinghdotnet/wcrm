import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Clock, Plus, Video, Link, Trash2, Edit, Globe, ExternalLink, X, Code, Copy, Check, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_SCHEDULE = {
    '0': [],
    '1': [{ start: '09:00', end: '17:00' }],
    '2': [{ start: '09:00', end: '17:00' }],
    '3': [{ start: '09:00', end: '17:00' }],
    '4': [{ start: '09:00', end: '17:00' }],
    '5': [{ start: '09:00', end: '17:00' }],
    '6': [],
};

export default function AppointmentSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({ bookingSlug: '', thankYouUrl: '', confirmationMessage: '', brandColor: '#4f46e5', bgColor: '#ffffff', textColor: '#111827', buttonTextColor: '#ffffff', borderRadius: '12', submitButtonText: 'Schedule Event' });
    const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
    const [meetingTypes, setMeetingTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [currentMeetingType, setCurrentMeetingType] = useState(null);
    const [mtForm, setMtForm] = useState({ title: '', duration: 30, description: '', slug: '' });

    const baseUrl = window.location.origin;

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, typesRes] = await Promise.all([
                api.get('/appointments/settings'),
                api.get('/appointments/meeting-types')
            ]);
            const s = settingsRes.data;
            setSettings({
                bookingSlug: s.bookingSlug || '',
                thankYouUrl: s.thankYouUrl || '',
                confirmationMessage: s.confirmationMessage || '',
                brandColor: s.brandColor || '#4f46e5',
                bgColor: s.bgColor || '#ffffff',
                textColor: s.textColor || '#111827',
                buttonTextColor: s.buttonTextColor || '#ffffff',
                borderRadius: s.borderRadius || '12',
                submitButtonText: s.submitButtonText || 'Schedule Event'
            });
            // Parse schedule from DB
            if (s.schedule) {
                try { setSchedule(typeof s.schedule === 'string' ? JSON.parse(s.schedule) : s.schedule); } catch { setSchedule(DEFAULT_SCHEDULE); }
            }
            setMeetingTypes(typesRes.data);
        } catch (err) {
            toast.error('Failed to load appointment settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await api.put('/appointments/settings', { ...settings, schedule });
            toast.success('Appointment settings updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setSavingSettings(false);
        }
    };

    // Schedule helpers
    const toggleDay = (day) => {
        setSchedule(prev => {
            const blocks = prev[day] || [];
            if (blocks.length > 0) {
                return { ...prev, [day]: [] };
            } else {
                return { ...prev, [day]: [{ start: '09:00', end: '17:00' }] };
            }
        });
    };

    const addBlock = (day) => {
        setSchedule(prev => ({
            ...prev,
            [day]: [...(prev[day] || []), { start: '09:00', end: '17:00' }]
        }));
    };

    const removeBlock = (day, idx) => {
        setSchedule(prev => ({
            ...prev,
            [day]: prev[day].filter((_, i) => i !== idx)
        }));
    };

    const updateBlock = (day, idx, field, value) => {
        setSchedule(prev => ({
            ...prev,
            [day]: prev[day].map((block, i) => i === idx ? { ...block, [field]: value } : block)
        }));
    };

    // Meeting type handlers
    const handleSaveMeetingType = async () => {
        try {
            if (currentMeetingType) {
                await api.put(`/appointments/meeting-types/${currentMeetingType.id}`, mtForm);
                toast.success('Meeting type updated');
            } else {
                await api.post('/appointments/meeting-types', mtForm);
                toast.success('Meeting type created');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save meeting type');
        }
    };

    const handleDeleteMeetingType = async (id) => {
        if (!window.confirm('Delete this meeting type?')) return;
        try {
            await api.delete(`/appointments/meeting-types/${id}`);
            toast.success('Meeting type deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const copyLink = (slug) => {
        navigator.clipboard.writeText(`${baseUrl}/book/${settings.bookingSlug}/${slug}`);
        toast.success('Booking link copied!');
    };

    const [copiedEmbed, setCopiedEmbed] = useState(null);
    const copyEmbed = (code, type) => {
        navigator.clipboard.writeText(code);
        setCopiedEmbed(type);
        toast.success('Embed code copied!');
        setTimeout(() => setCopiedEmbed(null), 2000);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="space-y-8 max-w-3xl">

            {/* Booking URL */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-sky-100 dark:bg-sky-500/10 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Booking URL</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Your unique booking page address</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 whitespace-nowrap">{baseUrl}/book/</span>
                    <input
                        type="text"
                        value={settings.bookingSlug}
                        onChange={(e) => setSettings({ ...settings, bookingSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm"
                        placeholder="your-company"
                    />
                </div>
            </div>

            {/* Schedule - Per Day */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Working Hours</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Set different hours for each day. Add multiple time blocks for breaks.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {['0', '1', '2', '3', '4', '5', '6'].map(day => {
                        const blocks = schedule[day] || [];
                        const isActive = blocks.length > 0;

                        return (
                            <div key={day} className={`rounded-xl border transition-colors ${isActive ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/5' : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30'}`}>
                                <div className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleDay(day)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className={`text-sm font-semibold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                                            {DAY_NAMES[parseInt(day)]}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <button onClick={() => addBlock(day)} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium">
                                            <Plus className="w-3.5 h-3.5" /> Add Block
                                        </button>
                                    )}
                                </div>

                                {isActive && (
                                    <div className="px-4 pb-3 space-y-2">
                                        {blocks.map((block, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={block.start}
                                                    onChange={(e) => updateBlock(day, idx, 'start', e.target.value)}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white"
                                                />
                                                <span className="text-gray-400 text-xs">to</span>
                                                <input
                                                    type="time"
                                                    value={block.end}
                                                    onChange={(e) => updateBlock(day, idx, 'end', e.target.value)}
                                                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white"
                                                />
                                                {blocks.length > 1 && (
                                                    <button onClick={() => removeBlock(day, idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Thank You Page */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <ExternalLink className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">After Booking</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Customize the confirmation experience</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Confirmation Message</label>
                        <textarea
                            value={settings.confirmationMessage}
                            onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white h-20 resize-none"
                            placeholder="Your appointment has been booked successfully!"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Redirect URL (Optional)</label>
                        <input
                            type="url"
                            value={settings.thankYouUrl}
                            onChange={(e) => setSettings({ ...settings, thankYouUrl: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
                            placeholder="https://example.com/thank-you"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">If set, clients will be redirected here after booking.</p>
                    </div>
                </div>
            </div>

            {/* Widget Design */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-pink-100 dark:bg-pink-500/10 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-pink-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Widget Design</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Customize how the booking widget looks when embedded on external websites</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Brand / Button Color</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={settings.brandColor} onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer" />
                            <input type="text" value={settings.brandColor} onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Background Color</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={settings.bgColor} onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer" />
                            <input type="text" value={settings.bgColor} onChange={(e) => setSettings({ ...settings, bgColor: e.target.value })} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Text Color</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={settings.textColor} onChange={(e) => setSettings({ ...settings, textColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer" />
                            <input type="text" value={settings.textColor} onChange={(e) => setSettings({ ...settings, textColor: e.target.value })} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Button Text Color</label>
                        <div className="flex items-center gap-2">
                            <input type="color" value={settings.buttonTextColor} onChange={(e) => setSettings({ ...settings, buttonTextColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer" />
                            <input type="text" value={settings.buttonTextColor} onChange={(e) => setSettings({ ...settings, buttonTextColor: e.target.value })} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Border Radius ({settings.borderRadius}px)</label>
                        <input type="range" min="0" max="24" value={settings.borderRadius} onChange={(e) => setSettings({ ...settings, borderRadius: e.target.value })} className="w-full mt-2" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">Button Text</label>
                        <input type="text" value={settings.submitButtonText} onChange={(e) => setSettings({ ...settings, submitButtonText: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white" placeholder="Schedule Event" />
                    </div>
                </div>

                {/* Live Preview */}
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-400 mb-3">PREVIEW</p>
                    <div style={{ backgroundColor: settings.bgColor, borderRadius: `${settings.borderRadius}px`, padding: '24px', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ color: settings.textColor, fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Discovery Call</h4>
                        <p style={{ color: settings.textColor, opacity: 0.6, fontSize: '14px', marginBottom: '16px' }}>30 minutes</p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ padding: '10px 16px', border: `2px solid ${settings.brandColor}`, color: settings.brandColor, borderRadius: `${settings.borderRadius}px`, fontSize: '14px', fontWeight: 600 }}>09:00</div>
                            <div style={{ padding: '10px 16px', backgroundColor: settings.brandColor, color: settings.buttonTextColor, borderRadius: `${settings.borderRadius}px`, fontSize: '14px', fontWeight: 600 }}>10:00</div>
                            <div style={{ padding: '10px 16px', border: `2px solid ${settings.brandColor}`, color: settings.brandColor, borderRadius: `${settings.borderRadius}px`, fontSize: '14px', fontWeight: 600 }}>11:00</div>
                        </div>
                        <button style={{ backgroundColor: settings.brandColor, color: settings.buttonTextColor, padding: '12px 24px', border: 'none', borderRadius: `${settings.borderRadius}px`, fontSize: '15px', fontWeight: 700, width: '100%', cursor: 'default' }}>{settings.submitButtonText || 'Schedule Event'}</button>
                    </div>
                </div>
            </div>

            {/* Save */}
            <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                {savingSettings ? 'Saving...' : 'Save Appointment Settings'}
            </button>

            {/* Meeting Types */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <Video className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Meeting Types</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Create different types of meetings clients can book</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setCurrentMeetingType(null); setMtForm({ title: '', duration: 30, description: '', slug: '' }); setShowModal(true); }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New Type
                    </button>
                </div>

                <div className="space-y-3">
                    {meetingTypes.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl">
                            No meeting types created yet.
                        </div>
                    ) : (
                        meetingTypes.map(type => (
                            <div key={type.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                        <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{type.title}</h4>
                                        <p className="text-sm text-gray-500">{type.duration} mins • /{type.slug}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => copyLink(type.slug)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors">
                                        <Link className="w-3.5 h-3.5" /> Copy Link
                                    </button>
                                    <button onClick={() => { setCurrentMeetingType(type); setMtForm({ title: type.title, duration: type.duration, description: type.description || '', slug: type.slug }); setShowModal(true); }} className="p-2 text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteMeetingType(type.id)} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Embed on Website */}
            {meetingTypes.length > 0 && settings.bookingSlug && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                            <Code className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Embed on Website</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Add booking to any website — WordPress, Wix, Shopify, or custom HTML</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {meetingTypes.map(type => {
                            const widgetUrl = 'https://api.magnetcrm.com/widget/booking.js';
                            const inlineCode = `<script src="${widgetUrl}" data-slug="${settings.bookingSlug}" data-meeting="${type.slug}" data-mode="inline"></script>`;
                            const popupCode = `<script src="${widgetUrl}" data-slug="${settings.bookingSlug}" data-meeting="${type.slug}" data-mode="popup" data-button-text="Book ${type.title}"></script>`;

                            return (
                                <div key={type.id} className="border border-gray-200 dark:border-slate-800 rounded-xl p-4">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">{type.title}</h4>

                                    <div className="space-y-4">
                                        {/* Inline Embed */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Inline (renders calendar on page)</span>
                                                <button onClick={() => copyEmbed(inlineCode, `inline-${type.id}`)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                                    {copiedEmbed === `inline-${type.id}` ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                </button>
                                            </div>
                                            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-gray-600 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap break-all font-mono">{inlineCode}</pre>
                                        </div>

                                        {/* Popup Button */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Popup Button (opens booking in modal)</span>
                                                <button onClick={() => copyEmbed(popupCode, `popup-${type.id}`)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                                    {copiedEmbed === `popup-${type.id}` ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                </button>
                                            </div>
                                            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-gray-600 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap break-all font-mono">{popupCode}</pre>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-xs text-gray-400 mt-4">Paste the embed code into any HTML page, WordPress text block, Wix HTML embed, or any website builder's custom code section. No iframe needed!</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 border border-gray-200 dark:border-slate-800 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{currentMeetingType ? 'Edit Meeting Type' : 'New Meeting Type'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Meeting Name</label>
                                <input type="text" value={mtForm.title} onChange={(e) => setMtForm({ ...mtForm, title: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white" placeholder="e.g. Discovery Call" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Duration (mins)</label>
                                    <input type="number" value={mtForm.duration} onChange={(e) => setMtForm({ ...mtForm, duration: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Custom Slug</label>
                                    <input type="text" value={mtForm.slug} onChange={(e) => setMtForm({ ...mtForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white" placeholder="auto-generated" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                                <textarea value={mtForm.description} onChange={(e) => setMtForm({ ...mtForm, description: e.target.value })} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white h-24 resize-none" placeholder="Details clients will see..." />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-medium">Cancel</button>
                            <button onClick={handleSaveMeetingType} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
