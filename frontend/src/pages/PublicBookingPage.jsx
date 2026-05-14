import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Clock, Video, User, Mail, FileText, CheckCircle } from 'lucide-react';

export default function PublicBookingPage() {
    const { bookingSlug, slug } = useParams();
    const [searchParams] = useSearchParams();
    const isEmbed = searchParams.get('embed') === 'true';
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState(null);
    const [meetingType, setMeetingType] = useState(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    
    const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', guestNotes: '' });
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [design, setDesign] = useState({ brandColor: '#4f46e5', bgColor: '#ffffff', textColor: '#111827', buttonTextColor: '#ffffff', borderRadius: '12', submitButtonText: 'Schedule Event' });

    useEffect(() => {
        fetchDetails();
    }, [bookingSlug, slug]);

    useEffect(() => {
        if (meetingType) {
            fetchAvailability();
        }
    }, [date, meetingType]);

    const fetchDetails = async () => {
        try {
            const res = await api.get(`/public/booking/${bookingSlug}/${slug}`);
            setCompany(res.data.company);
            setMeetingType(res.data.meetingType);
            if (res.data.settings) {
                const s = res.data.settings;
                setDesign({
                    brandColor: s.brandColor || '#4f46e5',
                    bgColor: s.bgColor || '#ffffff',
                    textColor: s.textColor || '#111827',
                    buttonTextColor: s.buttonTextColor || '#ffffff',
                    borderRadius: s.borderRadius || '12',
                    submitButtonText: s.submitButtonText || 'Schedule Event'
                });
            }
        } catch (err) {
            toast.error('Meeting type not found or inactive');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailability = async () => {
        setLoadingSlots(true);
        setSelectedSlot(null);
        try {
            const res = await api.get(`/public/booking/${bookingSlug}/${slug}/availability?date=${date}`);
            setSlots(res.data.availableSlots);
        } catch (err) {
            toast.error('Failed to load availability');
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleBook = async (e) => {
        e.preventDefault();
        if (!selectedSlot) return toast.error('Please select a time slot');
        setBooking(true);
        try {
            const res = await api.post(`/public/booking/${bookingSlug}/${slug}/book`, {
                ...form,
                date,
                startTime: selectedSlot
            });

            // Check if there's a redirect URL
            if (res.data.thankYouUrl) {
                window.location.href = res.data.thankYouUrl;
                return;
            }

            setConfirmationMessage(res.data.confirmationMessage || 'Your appointment has been booked successfully!');
            setSuccess(true);
            toast.success('Appointment booked successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to book appointment');
        } finally {
            setBooking(false);
        }
    };

    if (loading) {
        return <div className={`${isEmbed ? '' : 'min-h-screen bg-slate-50'} flex items-center justify-center`}><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    if (!meetingType) {
        return (
            <div className={`${isEmbed ? '' : 'min-h-screen bg-slate-50'} flex items-center justify-center p-4`}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Not Found</h2>
                    <p className="text-gray-500">This booking link is invalid or has been deactivated.</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={`${isEmbed ? '' : 'min-h-screen bg-slate-50'} flex items-center justify-center p-4`}>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                    <p className="text-gray-600 mb-4">{confirmationMessage}</p>
                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Meeting</span>
                            <span className="font-medium text-gray-900">{meetingType.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Date</span>
                            <span className="font-medium text-gray-900">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Time</span>
                            <span className="font-medium text-gray-900">{selectedSlot}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-4">A confirmation email has been sent to {form.guestEmail}.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isEmbed ? 'py-4 px-2' : 'min-h-screen py-12 px-4 sm:px-6 lg:px-8'} flex justify-center`} style={{ backgroundColor: isEmbed ? 'transparent' : '#f8fafc' }}>
            <div className="max-w-4xl w-full overflow-hidden flex flex-col md:flex-row" style={{ backgroundColor: design.bgColor, borderRadius: `${design.borderRadius}px`, boxShadow: '0 25px 50px -12px rgba(0,0,0,.15)', border: '1px solid #f3f4f6' }}>
                
                {/* Left Panel */}
                <div className="w-full md:w-1/3 p-8 border-b md:border-b-0 md:border-r" style={{ backgroundColor: design.brandColor + '0a', borderColor: design.brandColor + '20' }}>
                    <h4 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: design.textColor, opacity: 0.5 }}>{company?.companyName}</h4>
                    <h1 className="text-2xl font-bold mb-4" style={{ color: design.textColor }}>{meetingType.title}</h1>
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3" style={{ color: design.textColor, opacity: 0.7 }}>
                            <Clock className="w-5 h-5" style={{ opacity: 0.5 }} />
                            <span>{meetingType.duration} minutes</span>
                        </div>
                    </div>
                    {meetingType.description && (
                        <p className="text-sm whitespace-pre-wrap" style={{ color: design.textColor, opacity: 0.6 }}>{meetingType.description}</p>
                    )}
                </div>

                {/* Right Panel */}
                <div className="w-full md:w-2/3 p-8">
                    {!selectedSlot ? (
                        <div>
                            <h2 className="text-xl font-bold mb-6" style={{ color: design.textColor }}>Select a Date & Time</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: design.textColor, opacity: 0.7 }}>Date</label>
                                    <input 
                                        type="date" 
                                        value={date}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2"
                                        style={{ backgroundColor: design.bgColor, borderColor: design.brandColor + '40', color: design.textColor, borderRadius: `${design.borderRadius}px`, '--tw-ring-color': design.brandColor }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: design.textColor, opacity: 0.7 }}>Available Times</label>
                                    <div className="space-y-2 h-64 overflow-y-auto pr-2">
                                        {loadingSlots ? (
                                            <div className="text-sm text-center py-4" style={{ color: design.textColor, opacity: 0.5 }}>Loading availability...</div>
                                        ) : slots.length === 0 ? (
                                            <div className="text-sm text-center py-4" style={{ color: design.textColor, opacity: 0.5, backgroundColor: design.brandColor + '08', borderRadius: `${design.borderRadius}px` }}>No slots available on this date.</div>
                                        ) : (
                                            slots.map(slot => (
                                                <button
                                                    key={slot}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className="w-full px-4 py-3 text-center border font-medium hover:opacity-80 transition-colors"
                                                    style={{ borderColor: design.brandColor + '40', color: design.brandColor, borderRadius: `${design.borderRadius}px` }}
                                                >
                                                    {slot}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleBook} className="space-y-5">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                                <button type="button" onClick={() => setSelectedSlot(null)} className="p-2 rounded-full hover:opacity-70" style={{ color: design.textColor }}>←</button>
                                <div>
                                    <h2 className="text-xl font-bold" style={{ color: design.textColor }}>Enter Details</h2>
                                    <p className="text-sm font-medium" style={{ color: design.brandColor }}>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })} @ {selectedSlot}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: design.textColor, opacity: 0.7 }}>Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input required type="text" value={form.guestName} onChange={(e) => setForm({...form, guestName: e.target.value})} className="w-full pl-10 pr-4 py-3 border focus:ring-2" style={{ backgroundColor: design.bgColor, borderColor: design.brandColor + '40', color: design.textColor, borderRadius: `${design.borderRadius}px` }} placeholder="John Doe" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: design.textColor, opacity: 0.7 }}>Email *</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 opacity-40" style={{ color: design.textColor }} />
                                    <input required type="email" value={form.guestEmail} onChange={(e) => setForm({...form, guestEmail: e.target.value})} className="w-full pl-10 pr-4 py-3 border focus:ring-2" style={{ backgroundColor: design.bgColor, borderColor: design.brandColor + '40', color: design.textColor, borderRadius: `${design.borderRadius}px` }} placeholder="john@example.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-80" style={{ color: design.textColor }}>Mobile Number *</label>
                                <div className="relative">
                                    <input required type="tel" value={form.guestPhone} onChange={(e) => setForm({...form, guestPhone: e.target.value})} className="w-full px-4 py-3 border focus:ring-2" style={{ backgroundColor: design.bgColor, borderColor: design.brandColor + '40', color: design.textColor, borderRadius: `${design.borderRadius}px` }} placeholder="+1 (555) 000-0000" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: design.textColor, opacity: 0.7 }}>Please share anything that will help prepare for our meeting.</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <textarea value={form.guestNotes} onChange={(e) => setForm({...form, guestNotes: e.target.value})} className="w-full pl-10 pr-4 py-3 border focus:ring-2 min-h-[100px] resize-none" style={{ backgroundColor: design.bgColor, borderColor: design.brandColor + '40', color: design.textColor, borderRadius: `${design.borderRadius}px` }} placeholder="Notes..."></textarea>
                                </div>
                            </div>

                            <button disabled={booking} type="submit" className="w-full py-3.5 font-bold shadow-lg transition-all disabled:opacity-50 mt-4" style={{ backgroundColor: design.brandColor, color: design.buttonTextColor, borderRadius: `${design.borderRadius}px` }}>
                                {booking ? 'Confirming...' : (design.submitButtonText || 'Schedule Event')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
