import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Phone, Mail, BedDouble, Calendar as CalendarIcon, Check, ChevronRight, User, Loader2, Building2 } from 'lucide-react';
import api from '../services/api'; // Or use fetch if we want to be fully public without axios interceptors, but api is fine

export default function PublicHotelBookingPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [hotelData, setHotelData] = useState(null);
    const [step, setStep] = useState('select-room'); // select-room, select-dates, details, success
    const [selectedRoom, setSelectedRoom] = useState(null);
    
    // Booking Form State
    const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
    const [guests, setGuests] = useState(1);
    const [guestDetails, setGuestDetails] = useState({ guestName: '', guestEmail: '', guestPhone: '', guestNotes: '' });
    
    // Availability & Pricing State
    const [availability, setAvailability] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [bookingError, setBookingError] = useState('');
    const [confirmationCode, setConfirmationCode] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchHotel = async () => {
            try {
                // Using standard fetch to bypass auth headers for public endpoint if needed,
                // but if api.js handles public routes fine, we can use it.
                // Let's use fetch just to be safe for public page
                const res = await fetch(`https://api.magnetcrm.com/api/public/hotels/${slug}`);
                if (!res.ok) throw new Error('Hotel not found');
                const data = await res.json();
                setHotelData(data);
                
                // Set page title and theme color
                document.title = `Book a Stay at ${data.hotel.name}`;
            } catch (err) {
                toast.error('Could not load hotel details.');
            } finally {
                setLoading(false);
            }
        };
        fetchHotel();
    }, [slug]);

    const handleCheckAvailability = async (e) => {
        e.preventDefault();
        if (!dates.checkIn || !dates.checkOut) return toast.error('Please select dates');
        if (new Date(dates.checkIn) >= new Date(dates.checkOut)) return toast.error('Check-out must be after check-in');
        
        setCheckingAvailability(true);
        setBookingError('');
        try {
            const res = await fetch(`https://api.magnetcrm.com/api/public/hotels/${slug}/availability?roomTypeId=${selectedRoom.id}&checkIn=${dates.checkIn}&checkOut=${dates.checkOut}`);
            const data = await res.json();
            
            if (!res.ok || !data.available) {
                setBookingError('No rooms available for the selected dates. Please try different dates.');
                setAvailability(null);
            } else {
                setAvailability(data);
                setStep('details');
            }
        } catch (err) {
            setBookingError('Failed to check availability.');
        } finally {
            setCheckingAvailability(false);
        }
    };

    const handleBook = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                roomTypeId: selectedRoom.id,
                checkIn: dates.checkIn,
                checkOut: dates.checkOut,
                guests: parseInt(guests),
                ...guestDetails
            };
            
            const res = await fetch(`https://api.magnetcrm.com/api/public/hotels/${slug}/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.message || 'Booking failed');
            
            setConfirmationCode(data.confirmationCode);
            setStep('success');
            window.scrollTo(0, 0);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!hotelData?.hotel) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
                <Building2 className="w-16 h-16 text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Hotel Not Found</h1>
                <p className="text-gray-500 mt-2">The link you followed may be broken or the hotel is no longer accepting bookings.</p>
            </div>
        );
    }

    const { hotel, roomTypes } = hotelData;
    const brandColor = hotel.brandColor || '#4f46e5';

    // Helper for dynamic brand styles
    const brandBg = { backgroundColor: brandColor };
    const brandText = { color: brandColor };
    const brandBorder = { borderColor: brandColor };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {hotel.logoUrl ? (
                            <img src={hotel.logoUrl} alt={hotel.name} className="h-10 w-auto rounded" />
                        ) : (
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                                <BedDouble className="w-6 h-6" />
                            </div>
                        )}
                        <h1 className="text-xl font-bold">{hotel.name}</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Hotel Info Banner (Only show in step 1) */}
                {step === 'select-room' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                        <p className="text-gray-600 mb-4">{hotel.description || 'Welcome to our hotel. Book your stay with us directly for the best rates.'}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {hotel.address && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {hotel.address}, {hotel.city}</span>}
                            {hotel.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {hotel.phone}</span>}
                            {hotel.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {hotel.email}</span>}
                        </div>
                    </div>
                )}

                {/* Breadcrumbs for navigation */}
                {step !== 'success' && step !== 'select-room' && (
                    <button 
                        onClick={() => setStep(step === 'details' ? 'select-dates' : 'select-room')}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back
                    </button>
                )}

                {/* Step 1: Select Room */}
                {step === 'select-room' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Select a Room</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {roomTypes.map(rt => (
                                <div key={rt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-transform hover:-translate-y-1 hover:shadow-md">
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-lg font-bold">{rt.name}</h3>
                                            <div className="text-right">
                                                <div className="font-bold text-lg" style={brandText}>₹{Number(rt.pricePerNight).toLocaleString('en-IN')}</div>
                                                <div className="text-xs text-gray-400">per night</div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-4">{rt.description}</p>
                                        
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                            <User className="w-4 h-4" /> Up to {rt.capacity} Guests
                                        </div>

                                        {rt.amenities && rt.amenities.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {rt.amenities.map((amenity, i) => (
                                                    <span key={i} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-100">
                                                        {amenity}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                                        <button 
                                            onClick={() => { setSelectedRoom(rt); setStep('select-dates'); }}
                                            className="w-full py-2.5 rounded-xl font-medium text-white transition-opacity hover:opacity-90 flex justify-center items-center gap-2"
                                            style={brandBg}
                                        >
                                            Select Room <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {roomTypes.length === 0 && (
                                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-100">
                                    <p className="text-gray-500">No rooms are currently available for booking.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Dates */}
                {step === 'select-dates' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold mb-1">Check Availability</h2>
                            <p className="text-gray-500 text-sm">For <strong>{selectedRoom.name}</strong> (₹{Number(selectedRoom.pricePerNight).toLocaleString('en-IN')} / night)</p>
                        </div>
                        <form onSubmit={handleCheckAvailability} className="p-6 space-y-6">
                            {bookingError && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                                    {bookingError}
                                </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-in Date</label>
                                    <div className="relative">
                                        <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="date" 
                                            required
                                            min={new Date().toISOString().split('T')[0]}
                                            value={dates.checkIn} 
                                            onChange={e => setDates(prev => ({ ...prev, checkIn: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-shadow"
                                            style={{ ':focus': { borderColor: brandColor, boxShadow: `0 0 0 2px ${brandColor}33` } }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Check-out Date</label>
                                    <div className="relative">
                                        <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="date" 
                                            required
                                            min={dates.checkIn || new Date().toISOString().split('T')[0]}
                                            value={dates.checkOut} 
                                            onChange={e => setDates(prev => ({ ...prev, checkOut: e.target.value }))}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 outline-none transition-shadow"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Guests</label>
                                <select 
                                    value={guests} 
                                    onChange={e => setGuests(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none"
                                >
                                    {[...Array(selectedRoom.capacity)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'Guest' : 'Guests'}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                type="submit" 
                                disabled={checkingAvailability}
                                className="w-full py-3 rounded-xl font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex justify-center items-center"
                                style={brandBg}
                            >
                                {checkingAvailability ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Check Availability'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 3: Guest Details & Confirmation */}
                {step === 'details' && availability && (
                    <div className="grid md:grid-cols-5 gap-8">
                        <div className="md:col-span-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <h2 className="text-xl font-bold">Guest Details</h2>
                                </div>
                                <form id="booking-form" onSubmit={handleBook} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                                        <input type="text" required value={guestDetails.guestName} onChange={e => setGuestDetails({...guestDetails, guestName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none" placeholder="John Doe" />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                                            <input type="email" required value={guestDetails.guestEmail} onChange={e => setGuestDetails({...guestDetails, guestEmail: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none" placeholder="john@example.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                            <input type="tel" value={guestDetails.guestPhone} onChange={e => setGuestDetails({...guestDetails, guestPhone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none" placeholder="+1 234 567 8900" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Requests</label>
                                        <textarea rows="3" value={guestDetails.guestNotes} onChange={e => setGuestDetails({...guestDetails, guestNotes: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none resize-none" placeholder="Any special requirements?"></textarea>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                                <div className="p-6 border-b border-gray-100">
                                    <h3 className="font-bold text-lg">Booking Summary</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <div className="text-sm text-gray-500 mb-1">Room</div>
                                        <div className="font-medium">{selectedRoom.name}</div>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-y border-gray-100">
                                        <div>
                                            <div className="text-xs text-gray-500">Check-in</div>
                                            <div className="font-medium">{new Date(dates.checkIn).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{hotel.checkInTime}</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300" />
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Check-out</div>
                                            <div className="font-medium">{new Date(dates.checkOut).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{hotel.checkOutTime}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">{availability.nights} {availability.nights === 1 ? 'night' : 'nights'} × ₹{Number(availability.pricePerNight).toLocaleString('en-IN')}</span>
                                        <span>₹{Number(availability.totalAmount).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-gray-100">
                                        <span>Total</span>
                                        <span style={brandText}>₹{Number(availability.totalAmount).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="pt-4">
                                        <button 
                                            type="submit" 
                                            form="booking-form"
                                            disabled={submitting}
                                            className="w-full py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex justify-center items-center shadow-md"
                                            style={brandBg}
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                                        </button>
                                        <p className="text-xs text-center text-gray-500 mt-3">You will pay at the property.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 'success' && (
                    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6" style={{ backgroundColor: `${brandColor}15`, color: brandColor }}>
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                        <p className="text-gray-500 mb-8">{hotel.confirmationMessage || "We've sent a confirmation email with your booking details."}</p>
                        
                        <div className="bg-gray-50 rounded-xl p-6 text-left space-y-4 mb-8 border border-gray-100">
                            <div>
                                <div className="text-sm text-gray-500">Confirmation Code</div>
                                <div className="text-xl font-mono font-bold tracking-wider" style={brandText}>{confirmationCode}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                <div>
                                    <div className="text-xs text-gray-500">Guest Name</div>
                                    <div className="font-medium">{guestDetails.guestName}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Dates</div>
                                    <div className="font-medium">{new Date(dates.checkIn).toLocaleDateString()} - {new Date(dates.checkOut).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Book Another Room
                        </button>
                    </div>
                )}

            </main>
        </div>
    );
}
