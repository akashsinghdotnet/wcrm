import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    Hotel,
    CalendarDays,
    Settings,
    BedDouble,
    Plus,
    Building2,
    Trash2,
    Edit2,
    Copy,
    Download,
    CheckCircle2,
    XCircle,
    User,
    Mail,
    Phone,
    MapPin,
    IndianRupee,
    CreditCard,
    ArrowRight,
    LayoutDashboard
} from 'lucide-react';

export default function HotelsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);

    // Data states
    const [stats, setStats] = useState({ total: 0, confirmed: 0, checkedIn: 0, revenueThisMonth: 0 });
    const [hotels, setHotels] = useState([]);
    const [bookings, setBookings] = useState([]);

    // Modal states
    const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);

    // Form states
    const [hotelForm, setHotelForm] = useState({ name: '', description: '', address: '', city: '', phone: '', email: '', checkInTime: '14:00', checkOutTime: '11:00', isActive: true });
    const [roomForm, setRoomForm] = useState({ name: '', description: '', pricePerNight: 0, capacity: 2, totalRooms: 1, amenities: '', isActive: true });
    
    // Filters
    const [bookingFilter, setBookingFilter] = useState({ status: '', hotelId: '' });

    useEffect(() => {
        fetchData();
    }, [activeTab, bookingFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'dashboard') {
                const [statsRes, bookingsRes] = await Promise.all([
                    api.get('/hotels/stats'),
                    api.get('/hotels/bookings?limit=5')
                ]);
                setStats(statsRes.data);
                setBookings(bookingsRes.data);
            } else if (activeTab === 'reservations') {
                const query = new URLSearchParams();
                if (bookingFilter.status) query.append('status', bookingFilter.status);
                if (bookingFilter.hotelId) query.append('hotelId', bookingFilter.hotelId);
                const [bookingsRes, hotelsRes] = await Promise.all([
                    api.get(`/hotels/bookings?${query.toString()}`),
                    api.get('/hotels')
                ]);
                setBookings(bookingsRes.data);
                setHotels(hotelsRes.data);
            } else if (activeTab === 'hotels') {
                const res = await api.get('/hotels');
                setHotels(res.data);
            } else if (activeTab === 'settings') {
                const res = await api.get('/hotels');
                setHotels(res.data);
            }
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // --- Hotel Actions ---
    const handleHotelSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedHotel) {
                await api.patch(`/hotels/${selectedHotel.id}`, hotelForm);
                toast.success('Hotel updated');
            } else {
                await api.post('/hotels', hotelForm);
                toast.success('Hotel created');
            }
            setIsHotelModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    const handleDeleteHotel = async (id) => {
        if (!window.confirm('Are you sure? This will delete all rooms and bookings.')) return;
        try {
            await api.delete(`/hotels/${id}`);
            toast.success('Hotel deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete hotel');
        }
    };

    // --- Room Actions ---
    const handleRoomSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...roomForm,
                amenities: roomForm.amenities.split(',').map(s => s.trim()).filter(Boolean)
            };
            if (selectedRoom) {
                await api.patch(`/hotels/room-types/${selectedRoom.id}`, data);
                toast.success('Room updated');
            } else {
                await api.post(`/hotels/${selectedHotel.id}/room-types`, data);
                toast.success('Room created');
            }
            setIsRoomModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    const handleDeleteRoom = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await api.delete(`/hotels/room-types/${id}`);
            toast.success('Room deleted');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete room');
        }
    };

    // --- Booking Actions ---
    const updateBookingStatus = async (id, status) => {
        try {
            await api.patch(`/hotels/bookings/${id}/status`, { status });
            toast.success(`Booking marked as ${status.replace('_', ' ')}`);
            fetchData();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const exportCSV = () => {
        const rows = [
            ['Confirmation Code', 'Guest Name', 'Email', 'Phone', 'Hotel', 'Room', 'Check In', 'Check Out', 'Nights', 'Amount', 'Status', 'Booked At'],
            ...bookings.map(b => [
                b.confirmationCode,
                b.guestName,
                b.guestEmail,
                b.guestPhone || '',
                b.hotel?.name || '',
                b.roomType?.name || '',
                b.checkIn,
                b.checkOut,
                b.nights,
                b.totalAmount,
                b.status,
                new Date(b.createdAt).toLocaleString()
            ])
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reservations_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    if (loading && activeTab === 'dashboard' && !stats.total) return <div className="p-8 text-center text-slate-500">Loading Hotels Engine...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Hotel className="w-8 h-8 text-amber-500" />
                        Hotel Property Management
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage hotels, room types, and guest reservations.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-800 w-full overflow-x-auto">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'reservations', label: 'Reservations', icon: CalendarDays },
                    { id: 'hotels', label: 'Hotels & Rooms', icon: Building2 },
                    { id: 'settings', label: 'Settings', icon: Settings }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                    <CalendarDays className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Bookings</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Confirmed</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.confirmed}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                    <User className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Checked In</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.checkedIn}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                    <IndianRupee className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Revenue (Month)</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{stats.revenueThisMonth.toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Reservations</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Guest</th>
                                        <th className="px-6 py-4 font-medium">Hotel & Room</th>
                                        <th className="px-6 py-4 font-medium">Dates</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-800/50">
                                    {bookings.slice(0, 5).map(b => (
                                        <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{b.guestName}</div>
                                                <div className="text-xs text-gray-500">{b.confirmationCode}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{b.hotel?.name}</div>
                                                <div className="text-xs text-gray-500">{b.roomType?.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white">{new Date(b.checkIn).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500">to {new Date(b.checkOut).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    b.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                                                    b.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                                    b.status === 'checked_in' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                                                    b.status === 'checked_out' ? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400' :
                                                    'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                                }`}>
                                                    {b.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                ₹{Number(b.totalAmount).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                                                No reservations yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Reservations Tab */}
            {activeTab === 'reservations' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex gap-4">
                            <select
                                value={bookingFilter.hotelId}
                                onChange={e => setBookingFilter(prev => ({ ...prev, hotelId: e.target.value }))}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                            >
                                <option value="">All Hotels</option>
                                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                            <select
                                value={bookingFilter.status}
                                onChange={e => setBookingFilter(prev => ({ ...prev, status: e.target.value }))}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="checked_in">Checked In</option>
                                <option value="checked_out">Checked Out</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl transition-colors font-medium text-sm">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Guest</th>
                                        <th className="px-6 py-4 font-medium">Contact</th>
                                        <th className="px-6 py-4 font-medium">Hotel & Room</th>
                                        <th className="px-6 py-4 font-medium">Stay</th>
                                        <th className="px-6 py-4 font-medium">Status & Amount</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-800/50">
                                    {bookings.map(b => (
                                        <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{b.guestName}</div>
                                                <div className="text-xs text-gray-500">{b.confirmationCode}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white">{b.guestEmail}</div>
                                                <div className="text-xs text-gray-500">{b.guestPhone || 'No phone'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{b.hotel?.name}</div>
                                                <div className="text-xs text-gray-500">{b.roomType?.name} ({b.guests} guests)</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white">{new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-500">{b.nights} nights</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                        b.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                                                        b.status === 'checked_out' ? 'bg-gray-100 text-gray-700' :
                                                        b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {b.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="font-medium text-gray-900 dark:text-white">₹{Number(b.totalAmount).toLocaleString('en-IN')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <select
                                                    value={b.status}
                                                    onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                                                    className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="checked_in">Check In</option>
                                                    <option value="checked_out">Check Out</option>
                                                    <option value="cancelled">Cancel</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                                No reservations found matching the filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Hotels & Rooms Tab */}
            {activeTab === 'hotels' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={() => { setSelectedHotel(null); setHotelForm({ name: '', description: '', address: '', city: '', phone: '', email: '', checkInTime: '14:00', checkOutTime: '11:00', isActive: true }); setIsHotelModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" /> Add Hotel Property
                        </button>
                    </div>

                    <div className="grid gap-6">
                        {hotels.map(hotel => (
                            <div key={hotel.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                            {hotel.logoUrl ? <img src={hotel.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : <Building2 className="w-8 h-8 text-gray-400" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                {hotel.name}
                                                {!hotel.isActive && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">Inactive</span>}
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {hotel.city || 'No city'}</span>
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {hotel.phone || 'No phone'}</span>
                                            </p>
                                            <div className="mt-3 flex gap-2">
                                                <button onClick={() => window.open(`/hotel/${hotel.slug}`, '_blank')} className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded">
                                                    Public Link <ArrowRight className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => copyToClipboard(`<script src="https://api.magnetcrm.com/widget/hotel-booking.js" data-slug="${hotel.slug}"></script>`)} className="text-xs flex items-center gap-1 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
                                                    <Copy className="w-3 h-3" /> Embed Widget
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setSelectedHotel(hotel); setHotelForm(hotel); setIsHotelModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteHotel(hotel.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 bg-gray-50/50 dark:bg-slate-900/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Room Types</h3>
                                        <button onClick={() => { setSelectedHotel(hotel); setSelectedRoom(null); setRoomForm({ name: '', description: '', pricePerNight: 0, capacity: 2, totalRooms: 1, amenities: '', isActive: true }); setIsRoomModalOpen(true); }} className="text-sm text-amber-600 font-medium flex items-center gap-1 hover:text-amber-700">
                                            <Plus className="w-4 h-4" /> Add Room
                                        </button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {hotel.roomTypes?.map(rt => (
                                            <div key={rt.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        <BedDouble className="w-4 h-4 text-gray-400" />
                                                        {rt.name}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 mt-1">₹{Number(rt.pricePerNight).toLocaleString('en-IN')}/night • Up to {rt.capacity} guests</p>
                                                    <p className="text-xs text-gray-400 mt-2">Total Inventory: {rt.totalRooms} rooms</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setSelectedHotel(hotel); setSelectedRoom(rt); setRoomForm({ ...rt, amenities: rt.amenities ? JSON.parse(rt.amenities).join(', ') : '' }); setIsRoomModalOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-500 rounded">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteRoom(rt.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!hotel.roomTypes || hotel.roomTypes.length === 0) && (
                                            <div className="col-span-2 text-center py-4 text-sm text-gray-500">No room types added yet.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {hotels.length === 0 && (
                            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Hotels Found</h3>
                                <p className="text-gray-500 mt-1 mb-4">Get started by creating your first hotel property.</p>
                                <button onClick={() => { setSelectedHotel(null); setIsHotelModalOpen(true); }} className="px-4 py-2 bg-amber-500 text-white rounded-xl">Add Hotel</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {hotels.map(hotel => (
                        <div key={hotel.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{hotel.name} Settings</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Check-in Time</label>
                                    <input type="time" value={hotel.checkInTime} onChange={e => {
                                        const h = { ...hotel, checkInTime: e.target.value };
                                        setHotels(hotels.map(x => x.id === hotel.id ? h : x));
                                    }} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Check-out Time</label>
                                    <input type="time" value={hotel.checkOutTime} onChange={e => {
                                        const h = { ...hotel, checkOutTime: e.target.value };
                                        setHotels(hotels.map(x => x.id === hotel.id ? h : x));
                                    }} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Brand Color</label>
                                    <div className="flex gap-3">
                                        <input type="color" value={hotel.brandColor || '#4f46e5'} onChange={e => {
                                            const h = { ...hotel, brandColor: e.target.value };
                                            setHotels(hotels.map(x => x.id === hotel.id ? h : x));
                                        }} className="h-10 w-10 rounded cursor-pointer border-0 p-0" />
                                        <input type="text" value={hotel.brandColor || '#4f46e5'} readOnly className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-500" />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Confirmation Message</label>
                                    <textarea value={hotel.confirmationMessage || ''} onChange={e => {
                                        const h = { ...hotel, confirmationMessage: e.target.value };
                                        setHotels(hotels.map(x => x.id === hotel.id ? h : x));
                                    }} rows="2" placeholder="Thank you for booking! We look forward to your stay." className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"></textarea>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={() => api.patch(`/hotels/${hotel.id}`, hotel).then(() => toast.success('Settings saved')).catch(() => toast.error('Failed to save'))} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium">Save Settings</button>
                            </div>
                        </div>
                    ))}
                    {hotels.length === 0 && <div className="text-gray-500">No hotels added yet.</div>}
                </div>
            )}

            {/* Hotel Modal */}
            {isHotelModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedHotel ? 'Edit Hotel' : 'New Hotel'}</h2>
                            <button onClick={() => setIsHotelModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleHotelSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hotel Name *</label>
                                    <input required type="text" value={hotelForm.name} onChange={e => setHotelForm({ ...hotelForm, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Address</label>
                                    <input type="text" value={hotelForm.address} onChange={e => setHotelForm({ ...hotelForm, address: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">City</label>
                                    <input type="text" value={hotelForm.city} onChange={e => setHotelForm({ ...hotelForm, city: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Phone</label>
                                    <input type="text" value={hotelForm.phone} onChange={e => setHotelForm({ ...hotelForm, phone: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                                    <input type="email" value={hotelForm.email} onChange={e => setHotelForm({ ...hotelForm, email: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Logo URL</label>
                                    <input type="text" value={hotelForm.logoUrl || ''} onChange={e => setHotelForm({ ...hotelForm, logoUrl: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                                    <textarea rows="3" value={hotelForm.description} onChange={e => setHotelForm({ ...hotelForm, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 resize-none"></textarea>
                                </div>
                                <div className="col-span-2 flex items-center gap-2 mt-2">
                                    <input type="checkbox" id="isActive" checked={hotelForm.isActive} onChange={e => setHotelForm({ ...hotelForm, isActive: e.target.checked })} className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-gray-300" />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-slate-300">Accept Bookings (Active)</label>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsHotelModalOpen(false)} className="px-6 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-medium">Save Hotel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Room Modal */}
            {isRoomModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedRoom ? 'Edit Room Type' : 'Add Room Type'}</h2>
                            <button onClick={() => setIsRoomModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleRoomSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Room Name *</label>
                                <input required type="text" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Deluxe Sea View" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Price / Night (₹) *</label>
                                    <input required type="number" min="0" value={roomForm.pricePerNight} onChange={e => setRoomForm({ ...roomForm, pricePerNight: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Capacity (Guests)</label>
                                    <input required type="number" min="1" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Total Rooms</label>
                                    <input required type="number" min="1" value={roomForm.totalRooms} onChange={e => setRoomForm({ ...roomForm, totalRooms: e.target.value })} title="Total physical inventory for this room type" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Amenities</label>
                                <input type="text" value={roomForm.amenities} onChange={e => setRoomForm({ ...roomForm, amenities: e.target.value })} placeholder="WiFi, AC, TV, Mini Bar (comma separated)" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea rows="2" value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 resize-none"></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsRoomModalOpen(false)} className="px-6 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors font-medium">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-medium">Save Room Type</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
