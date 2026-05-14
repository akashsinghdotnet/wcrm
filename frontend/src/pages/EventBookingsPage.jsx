import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Ticket, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EventBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await api.get('/events/bookings/all');
            setBookings(res.data);
        } catch (err) {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (bookingId, newStatus) => {
        try {
            await api.patch(`/events/bookings/${bookingId}/status`, { status: newStatus });
            setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
            toast.success('Status updated');
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const filteredBookings = bookings.filter(b => 
        b.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.guestPhone && b.guestPhone.includes(searchTerm)) ||
        (b.eventTitle && b.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                        <Ticket className="w-6 h-6 text-violet-500" /> Event Bookings
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 text-sm">View all ticket sales and attendees across all your events.</p>
                </div>
                
                <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Search guest or event..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full sm:w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="text-center p-16">
                        <Ticket className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No bookings found</h3>
                        <p className="text-gray-500 dark:text-slate-400">When attendees buy tickets, they will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-slate-400 font-medium border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Reference</th>
                                    <th className="px-6 py-4">Guest Name</th>
                                    <th className="px-6 py-4">Phone Number</th>
                                    <th className="px-6 py-4">Event</th>
                                    <th className="px-6 py-4">Ticket details</th>
                                    <th className="px-6 py-4">Total Paid</th>
                                    <th className="px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                                {filteredBookings.map(bk => (
                                    <tr key={bk.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">{bk.bookingRef}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{bk.firstName} {bk.lastName}</div>
                                            <div className="text-xs text-gray-500">{bk.guestEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{bk.guestPhone || <span className="text-gray-400 font-normal">N/A</span>}</td>
                                        <td className="px-6 py-4 font-medium text-violet-600 dark:text-violet-400">{bk.eventTitle || 'Unknown Event'}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{bk.quantity}x {bk.ticketTypeName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium mb-1">
                                                {bk.totalAmount > 0 ? `₹${bk.totalAmount}` : 'Free'}
                                            </div>
                                            <select 
                                                value={bk.status}
                                                onChange={(e) => handleStatusChange(bk.id, e.target.value)}
                                                className={`text-xs px-2 py-1 rounded-md border-0 outline-none cursor-pointer font-bold uppercase tracking-wider ${bk.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : bk.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}
                                            >
                                                <option value="pending" className="text-gray-900 bg-white">Pending</option>
                                                <option value="confirmed" className="text-gray-900 bg-white">Confirmed</option>
                                                <option value="cancelled" className="text-gray-900 bg-white">Cancelled</option>
                                                <option value="refunded" className="text-gray-900 bg-white">Refunded</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(bk.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
