import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CalendarDays, MapPin, Clock, Users, IndianRupee, Globe, Building2, Ticket, CheckCircle2, ShieldCheck, Mail, User, Phone, ArrowRight, Loader2, PartyPopper, Check, Sparkles } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

export default function PublicEventBookingPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { config } = useConfig();
    
    const [event, setEvent] = useState(null);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    const [selectedTicketId, setSelectedTicketId] = useState('');
    const [quantity, setQuantity] = useState(1);
    
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        guestEmail: '',
        guestPhone: '',
        notes: '',
        paymentMethod: ''
    });

    const searchParams = new URLSearchParams(window.location.search);
    const isEmbed = searchParams.get('embed') === 'true';
    const themeColor = searchParams.get('themeColor');
    const bgColor = searchParams.get('bgColor');
    const customFont = searchParams.get('font');

    useEffect(() => {
        if (!themeColor && !bgColor && !customFont) return;
        
        let css = '';
        if (themeColor) {
            css += `
                .bg-violet-600, .bg-violet-500 { background-color: ${themeColor} !important; }
                .text-violet-400, .text-violet-500, .text-violet-300 { color: ${themeColor} !important; }
                .border-violet-500, .border-violet-400 { border-color: ${themeColor} !important; }
                .from-violet-600 { --tw-gradient-from: ${themeColor} var(--tw-gradient-from-position) !important; }
                .to-indigo-600 { --tw-gradient-to: ${themeColor} var(--tw-gradient-to-position) !important; }
                .shadow-violet-600\\/30 { --tw-shadow-color: ${themeColor}4d !important; --tw-shadow: var(--tw-shadow-colored) !important; }
            `;
        }
        if (bgColor) {
            css += `
                .bg-black, .bg-slate-950 { background-color: ${bgColor} !important; }
                .bg-slate-900\\/40 { background-color: ${bgColor}66 !important; }
            `;
        }
        if (customFont) {
            css += `body, input, button, select, textarea { font-family: "${customFont}", system-ui, sans-serif !important; }`;
            // Try to load from Google Fonts just in case
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${customFont.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
        
        return () => {
            if (document.head.contains(style)) document.head.removeChild(style);
        };
    }, [themeColor, bgColor, customFont]);

    useEffect(() => {
        if (isEmbed) {
            const reportHeight = () => {
                const height = document.body.scrollHeight;
                window.parent.postMessage({ type: 'MCRM_RESIZE', slug, height }, '*');
            };
            reportHeight();
            window.addEventListener('resize', reportHeight);
            
            // Re-report on DOM mutations
            const observer = new MutationObserver(reportHeight);
            observer.observe(document.body, { childList: true, subtree: true });

            return () => {
                window.removeEventListener('resize', reportHeight);
                observer.disconnect();
            };
        }
    }, [isEmbed, slug]);

    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [paypalModalData, setPaypalModalData] = useState(null);

    useEffect(() => {
        // Handle Razorpay Payment Link Return
        const paymentId = searchParams.get('razorpay_payment_id');
        const paymentLinkId = searchParams.get('razorpay_payment_link_id');
        const paymentLinkRefId = searchParams.get('razorpay_payment_link_reference_id');
        const paymentLinkStatus = searchParams.get('razorpay_payment_link_status');
        const signature = searchParams.get('razorpay_signature');

        if (paymentId && paymentLinkId && signature) {
            verifyRazorpayReturn(paymentId, paymentLinkId, paymentLinkRefId, paymentLinkStatus, signature);
        } else {
            fetchEventDetails();
        }
    }, [slug]);

    const verifyRazorpayReturn = async (paymentId, linkId, refId, status, signature) => {
        setProcessing(true);
        try {
            toast.loading('Verifying your payment...', { id: 'verify-rzp' });
            const verifyRes = await api.post(`/public/events/${slug}/verify-razorpay`, {
                razorpay_payment_id: paymentId,
                razorpay_payment_link_id: linkId,
                razorpay_payment_link_reference_id: refId,
                razorpay_payment_link_status: status,
                razorpay_signature: signature,
            });
            toast.dismiss('verify-rzp');
            
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            setConfirmedBooking({ ref: verifyRes.data.bookingRef, free: false });
            toast.success('Payment successful!');
        } catch (err) {
            toast.dismiss('verify-rzp');
            toast.error('Payment verification failed. Please contact support.');
        } finally {
            setProcessing(false);
        }
    };

    const fetchEventDetails = async () => {
        try {
            const res = await api.get(`/public/events/${slug}`);
            setEvent({
                id: res.data.id,
                title: res.data.title,
                description: res.data.description,
                startDate: res.data.startDate,
                endDate: res.data.endDate,
                startTime: res.data.startTime,
                endTime: res.data.endTime,
                location: res.data.location,
                address: res.data.address,
                bannerImage: res.data.bannerImage,
                currency: res.data.currency,
            });
            setTicketTypes(res.data.ticketTypes);
            setPaymentMethods(res.data.paymentMethods);
            
            if (res.data.ticketTypes.length > 0) {
                setSelectedTicketId(res.data.ticketTypes[0].id);
            }
        } catch (err) {
            toast.error('Event not found or unavailable');
        } finally {
            setLoading(false);
        }
    };

    const selectedTicket = ticketTypes.find(t => t.id === selectedTicketId);
    const totalAmount = selectedTicket ? Number(selectedTicket.price) * quantity : 0;
    const isFree = totalAmount === 0;

    const availableMethods = [];
    if (paymentMethods?.razorpay?.enabled) {
        availableMethods.push({ id: 'razorpay', name: 'Razorpay', description: 'UPI, Cards, Netbanking', icon: IndianRupee });
    }
    if (paymentMethods?.paypal?.enabled) {
        availableMethods.push({ id: 'paypal', name: 'PayPal', description: 'International cards & PayPal', icon: Globe });
    }
    if (paymentMethods?.bankTransfer?.enabled) {
        availableMethods.push({ id: 'bank_transfer', name: 'Bank Transfer', description: 'NEFT / IMPS / RTGS', icon: Building2 });
    }

    // Auto-select payment method if only one available
    useEffect(() => {
        if (!isFree && availableMethods.length > 0 && !form.paymentMethod) {
            setForm(prev => ({ ...prev, paymentMethod: availableMethods[0].id }));
        }
    }, [availableMethods, isFree]);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (document.getElementById('razorpay-script')) { resolve(true); return; }
            const script = document.createElement('script');
            script.id = 'razorpay-script';
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const loadPayPalScript = (clientId, currency) => {
        return new Promise((resolve) => {
            if (document.getElementById('paypal-script')) { resolve(true); return; }
            const script = document.createElement('script');
            script.id = 'paypal-script';
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleBooking = async (e) => {
        e.preventDefault();
        
        if (!selectedTicket) {
            toast.error('Please select a ticket type');
            return;
        }
        if (!isFree && !form.paymentMethod) {
            toast.error('Please select a payment method');
            return;
        }

        setProcessing(true);
        try {
            const res = await api.post(`/public/events/${slug}/book`, {
                ticketTypeId: selectedTicketId,
                quantity: Number(quantity),
                firstName: form.firstName,
                lastName: form.lastName,
                guestEmail: form.guestEmail,
                guestPhone: form.guestPhone,
                notes: form.notes,
                paymentMethod: isFree ? 'free' : form.paymentMethod,
                callbackUrl: window.location.href.split('?')[0] // remove existing query params
            });

            const data = res.data;

            if (data.status === 'confirmed') {
                setConfirmedBooking({ ref: data.bookingRef, free: true });
                toast.success('Booking confirmed successfully!');
                setProcessing(false);
            } 
            else if (data.status === 'razorpay_link_created') {
                // Redirect user to Razorpay hosted checkout
                window.location.href = data.short_url;
            } 
            else if (data.status === 'paypal_order_created') {
                await openPayPalCheckout(data);
            } 
            else if (data.status === 'bank_transfer_pending') {
                setConfirmedBooking({
                    ref: data.bookingRef,
                    status: 'pending',
                    method: 'bank_transfer',
                    bankDetails: data.bankDetails,
                    amount: data.totalAmount,
                    currency: data.currency
                });
                toast.success('Booking initiated. Awaiting payment.');
                setProcessing(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to initiate booking');
            setProcessing(false);
        }
    };

    const openRazorpayCheckout = async (orderData) => {
        const loaded = await loadRazorpayScript();
        if (!loaded) { toast.error('Failed to load Razorpay'); setProcessing(false); return; }

        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: event.title,
            description: `${quantity}x ${selectedTicket.name}`,
            order_id: orderData.orderId,
            prefill: orderData.prefill,
            theme: { color: '#8b5cf6' }, // violet-500
            handler: async (response) => {
                try {
                    toast.loading('Verifying payment...', { id: 'verify' });
                    const verifyRes = await api.post(`/public/events/${slug}/verify-razorpay`, {
                        bookingId: orderData.bookingId,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    });
                    toast.dismiss('verify');
                    setConfirmedBooking({ ref: verifyRes.data.bookingRef, free: false });
                    toast.success('Payment successful!');
                } catch (err) {
                    toast.dismiss('verify');
                    toast.error('Payment verification failed');
                } finally {
                    setProcessing(false);
                }
            },
            modal: {
                ondismiss: () => {
                    toast.error('Payment cancelled');
                    setProcessing(false);
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    const openPayPalCheckout = async (orderData) => {
        const loaded = await loadPayPalScript(orderData.clientId, orderData.currency);
        if (!loaded) { toast.error('Failed to load PayPal'); setProcessing(false); return; }
        setPaypalModalData(orderData);
    };

    useEffect(() => {
        if (paypalModalData && window.paypal) {
            document.getElementById('paypal-button-container').innerHTML = '';
            window.paypal.Buttons({
                createOrder: () => paypalModalData.orderId,
                onApprove: async (data) => {
                    try {
                        toast.loading('Verifying payment...', { id: 'verify-paypal' });
                        const verifyRes = await api.post(`/public/events/${slug}/verify-paypal`, {
                            bookingId: paypalModalData.bookingId,
                            paypal_order_id: data.orderID,
                        });
                        toast.dismiss('verify-paypal');
                        setPaypalModalData(null);
                        setConfirmedBooking({ ref: verifyRes.data.bookingRef, free: false });
                        toast.success('Payment successful!');
                    } catch (err) {
                        toast.dismiss('verify-paypal');
                        toast.error('Payment verification failed');
                    } finally {
                        setProcessing(false);
                    }
                },
                onCancel: () => {
                    toast.error('Payment cancelled');
                    setPaypalModalData(null);
                    setProcessing(false);
                }
            }).render('#paypal-button-container');
        }
    }, [paypalModalData, slug]);

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (!event) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <CalendarDays className="w-16 h-16 text-slate-800 mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Event Unavailable</h1>
            <p className="text-slate-500">This event may have been cancelled or does not exist.</p>
        </div>
    );

    if (confirmedBooking) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />
                
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 lg:p-12 max-w-lg w-full shadow-[0_0_80px_rgba(16,185,129,0.1)] relative z-10 text-center transform transition-all hover:scale-[1.01]">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30">
                        {confirmedBooking.status === 'pending' ? <Clock className="w-12 h-12 text-white" /> : <PartyPopper className="w-12 h-12 text-white" />}
                    </div>
                    
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                        {confirmedBooking.status === 'pending' ? 'Booking Initiated!' : "You're all set!"}
                    </h2>
                    
                    <p className="text-slate-400 mb-8 text-lg">
                        {confirmedBooking.status === 'pending' 
                            ? 'Please complete your bank transfer using the details below to confirm your tickets.'
                            : 'Your tickets have been secured. We sent a confirmation email to your inbox.'}
                    </p>

                    <div className="bg-black/50 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/5">
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mb-2">Booking Reference</p>
                        <p className="text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400 tracking-wider">
                            {confirmedBooking.ref}
                        </p>
                    </div>

                    {confirmedBooking.status === 'pending' && confirmedBooking.bankDetails && (
                        <div className="text-left bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8">
                            <h3 className="font-semibold text-amber-400 mb-4 flex items-center gap-2"><Building2 className="w-5 h-5" /> Bank Transfer Details</h3>
                            <div className="space-y-3 text-sm text-amber-100/70">
                                <div className="flex justify-between items-center"><span className="text-amber-500/60">Amount to Pay</span> <span className="font-bold text-amber-300 text-lg">₹{confirmedBooking.amount}</span></div>
                                <div className="flex justify-between items-center"><span className="text-amber-500/60">Bank Name</span> <span className="font-medium text-amber-200">{confirmedBooking.bankDetails.bankName}</span></div>
                                <div className="flex justify-between items-center"><span className="text-amber-500/60">Account Name</span> <span className="font-medium text-amber-200">{confirmedBooking.bankDetails.accountHolder}</span></div>
                                <div className="flex justify-between items-center"><span className="text-amber-500/60">Account Number</span> <span className="font-mono text-amber-200 bg-amber-500/20 px-2 py-1 rounded">{confirmedBooking.bankDetails.accountNumber}</span></div>
                                <div className="flex justify-between items-center"><span className="text-amber-500/60">IFSC Code</span> <span className="font-mono text-amber-200">{confirmedBooking.bankDetails.ifscCode}</span></div>
                            </div>
                        </div>
                    )}

                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white hover:bg-slate-100 text-black font-bold rounded-2xl transition-all w-full text-lg shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]">
                        Book Another Ticket
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black font-sans selection:bg-violet-500/30 selection:text-violet-200 text-slate-300">
            {/* Payment Modals */}
            {paypalModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setPaypalModalData(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>
                        <h3 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
                            <Globe className="w-6 h-6 text-sky-400" /> Pay with PayPal
                        </h3>
                        <div id="paypal-button-container" className="min-h-[150px]"></div>
                    </div>
                </div>
            )}

            <div className={`max-w-[1600px] mx-auto grid grid-cols-1 ${isEmbed ? '' : 'lg:grid-cols-12'} min-h-screen`}>
                
                {/* Left Side: Event Details */}
                {!isEmbed && (
                <div className="lg:col-span-5 xl:col-span-5 p-6 lg:p-12 xl:p-16 flex flex-col relative border-b lg:border-b-0 lg:border-r border-white/5 bg-slate-950/50 overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-black/80 blur-[120px] pointer-events-none" />
                    
                    <div className="relative z-10 flex-1 flex flex-col justify-center">
                        {config?.app_logo && (
                            <img src={config.app_logo} alt="Logo" className="h-8 mb-12 object-contain" />
                        )}
                        
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-300 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-violet-500/20 backdrop-blur-sm w-fit">
                            <Sparkles className="w-3.5 h-3.5" /> Premium Event Checkout
                        </div>
                        
                        <h1 className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-slate-500 mb-8 leading-[1.1] tracking-tighter">
                            {event.title}
                        </h1>
                        
                        <div className="space-y-6 mb-10">
                            {event.startDate && (
                                <div className="flex gap-5 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-300">
                                        <CalendarDays className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Date & Time</p>
                                        <p className="text-white text-lg font-medium">{new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        {(event.startTime || event.endTime) && (
                                            <p className="text-violet-300 text-sm mt-1">{event.startTime} {event.endTime ? `to ${event.endTime}` : ''}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {event.location && (
                                <div className="flex gap-5 items-start group">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-300">
                                        <MapPin className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Location</p>
                                        <p className="text-white text-lg font-medium">{event.location}</p>
                                        {event.address && <p className="text-violet-300 text-sm mt-1">{event.address}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {event.description && (
                            <div className="pt-8 border-t border-white/10 relative">
                                <div className="absolute top-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-violet-500/50 to-transparent"></div>
                                <p className="text-slate-400 text-base leading-relaxed line-clamp-4">
                                    {event.description}
                                </p>
                            </div>
                        )}
                    </div>
                        
                    <div className="mt-12 flex items-center gap-3 text-sm text-slate-500 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="font-medium">100% Secured & Encrypted Checkout</span>
                    </div>
                </div>
                )}

                {/* Right Side: Booking Form */}
                <div className={`${isEmbed ? 'col-span-1 p-4' : 'lg:col-span-7 xl:col-span-7 p-6 lg:p-12 xl:p-20'} relative z-20`}>
                    <div className="max-w-2xl mx-auto">
                        
                        {ticketTypes.length === 0 ? (
                            <div className="text-center py-24 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem]">
                                <Ticket className="w-16 h-16 text-slate-600 mx-auto mb-6" />
                                <h3 className="text-3xl font-black text-white mb-3 tracking-tight">Sold Out</h3>
                                <p className="text-slate-400 text-lg">Tickets for this event are currently unavailable.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleBooking} className="space-y-12 pb-32 lg:pb-0">
                                
                                {/* Section 1: Select Ticket */}
                                <div className="space-y-6">
                                    <div className="flex items-end justify-between mb-8">
                                        <div>
                                            <p className="text-violet-400 font-bold tracking-widest text-xs uppercase mb-2">Step 1 of 3</p>
                                            <h2 className="text-3xl font-black text-white tracking-tight">Choose Tickets</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {ticketTypes.map(ticket => {
                                            const isSelected = selectedTicketId === ticket.id;
                                            const tQty = Number(ticket.quantity);
                                            const tSold = Number(ticket.quantitySold);
                                            const isSoldOut = tQty > 0 && tSold >= tQty;
                                            const availableQty = tQty > 0 ? tQty - tSold : Infinity;
                                            
                                            return (
                                                <div 
                                                    key={ticket.id}
                                                    onClick={() => !isSoldOut && setSelectedTicketId(ticket.id)}
                                                    className={`relative p-6 rounded-[2rem] border transition-all duration-300 cursor-pointer overflow-hidden group ${
                                                        isSoldOut 
                                                            ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                                                            : isSelected 
                                                                ? 'bg-violet-600/10 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-[1.02]' 
                                                                : 'bg-slate-900/40 border-white/10 hover:border-white/20 hover:bg-slate-800/60 hover:scale-[1.01]'
                                                    }`}
                                                >
                                                    {/* Background Glow for Selected */}
                                                    {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-transparent pointer-events-none" />}

                                                    <div className="relative z-10 flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-violet-400 bg-violet-500' : 'border-slate-600 bg-transparent'}`}>
                                                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <h3 className={`font-black text-xl tracking-tight transition-colors ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                                                {ticket.name}
                                                            </h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`font-black text-2xl tracking-tight transition-colors ${isSelected ? 'text-violet-300' : 'text-white'}`}>
                                                                {Number(ticket.price) === 0 ? 'Free' : `₹${Number(ticket.price).toLocaleString('en-IN')}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="relative z-10 ml-10 flex items-center justify-between">
                                                        <p className="text-sm text-slate-400 leading-relaxed max-w-[70%]">{ticket.description || 'General Admission Entry'}</p>
                                                        {isSoldOut ? (
                                                            <span className="text-xs font-bold text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full uppercase tracking-wider">Sold Out</span>
                                                        ) : (
                                                            tQty > 0 && availableQty <= 10 && (
                                                                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full uppercase tracking-wider">Only {availableQty} left</span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedTicket && (
                                        <div className="flex items-center justify-between p-6 bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-[2rem] mt-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div>
                                                <p className="font-bold text-white text-lg">Select Quantity</p>
                                                <p className="text-sm text-slate-400">Max {selectedTicket.maxPerBooking} per order</p>
                                            </div>
                                            <div className="flex items-center gap-6 bg-black/50 p-2 rounded-2xl border border-white/5">
                                                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-xl font-light">−</button>
                                                <span className="font-black text-white text-xl w-6 text-center tracking-tight">{quantity}</span>
                                                <button type="button" onClick={() => setQuantity(Math.min(selectedTicket.maxPerBooking, quantity + 1))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all text-xl font-light">+</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Section 2: Guest Details */}
                                <div>
                                    <div className="mb-8">
                                        <p className="text-violet-400 font-bold tracking-widest text-xs uppercase mb-2">Step 2 of 3</p>
                                        <h2 className="text-3xl font-black text-white tracking-tight">Attendee Details</h2>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="col-span-2 md:col-span-1 group">
                                            <div className="relative">
                                                <input required type="text" id="firstName" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="peer w-full px-5 pt-7 pb-3 bg-slate-900/60 backdrop-blur-md border border-white/10 focus:border-violet-500 rounded-[1.5rem] text-white outline-none transition-all placeholder-transparent" placeholder="First Name" />
                                                <label htmlFor="firstName" className="absolute left-5 top-2 text-xs font-bold uppercase tracking-wider text-slate-500 peer-focus:text-violet-400 transition-colors pointer-events-none">First Name</label>
                                            </div>
                                        </div>
                                        <div className="col-span-2 md:col-span-1 group">
                                            <div className="relative">
                                                <input required type="text" id="lastName" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="peer w-full px-5 pt-7 pb-3 bg-slate-900/60 backdrop-blur-md border border-white/10 focus:border-violet-500 rounded-[1.5rem] text-white outline-none transition-all placeholder-transparent" placeholder="Last Name" />
                                                <label htmlFor="lastName" className="absolute left-5 top-2 text-xs font-bold uppercase tracking-wider text-slate-500 peer-focus:text-violet-400 transition-colors pointer-events-none">Last Name</label>
                                            </div>
                                        </div>
                                        <div className="col-span-2 group">
                                            <div className="relative">
                                                <input required type="email" id="email" value={form.guestEmail} onChange={e => setForm({...form, guestEmail: e.target.value})} className="peer w-full px-5 pt-7 pb-3 bg-slate-900/60 backdrop-blur-md border border-white/10 focus:border-violet-500 rounded-[1.5rem] text-white outline-none transition-all placeholder-transparent" placeholder="Email Address" />
                                                <label htmlFor="email" className="absolute left-5 top-2 text-xs font-bold uppercase tracking-wider text-slate-500 peer-focus:text-violet-400 transition-colors pointer-events-none">Email Address (for tickets)</label>
                                            </div>
                                        </div>
                                        <div className="col-span-2 group">
                                            <div className="relative">
                                                <input required type="tel" id="phone" value={form.guestPhone} onChange={e => setForm({...form, guestPhone: e.target.value})} className="peer w-full px-5 pt-7 pb-3 bg-slate-900/60 backdrop-blur-md border border-white/10 focus:border-violet-500 rounded-[1.5rem] text-white outline-none transition-all placeholder-transparent" placeholder="Phone Number" />
                                                <label htmlFor="phone" className="absolute left-5 top-2 text-xs font-bold uppercase tracking-wider text-slate-500 peer-focus:text-violet-400 transition-colors pointer-events-none">Phone Number</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Payment */}
                                {!isFree && availableMethods.length > 0 && (
                                    <div>
                                        <div className="mb-8">
                                            <p className="text-violet-400 font-bold tracking-widest text-xs uppercase mb-2">Step 3 of 3</p>
                                            <h2 className="text-3xl font-black text-white tracking-tight">Payment Method</h2>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableMethods.map((method) => {
                                                const Icon = method.icon;
                                                const isSelected = form.paymentMethod === method.id;
                                                return (
                                                    <div 
                                                        key={method.id}
                                                        onClick={() => setForm({...form, paymentMethod: method.id})}
                                                        className={`relative p-5 rounded-[1.5rem] border-2 transition-all cursor-pointer flex items-center gap-4 ${
                                                            isSelected ? 'bg-violet-600/10 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.1)]' : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' : 'bg-black/50 text-slate-400'}`}>
                                                            <Icon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-base tracking-tight mb-0.5">{method.name}</h4>
                                                            <p className="text-xs text-slate-400">{method.description}</p>
                                                        </div>
                                                        {isSelected && <div className="absolute top-4 right-4 text-violet-400"><CheckCircle2 className="w-5 h-5" /></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Bottom Fixed Bar on Mobile, Normal on Desktop */}
                                <div className="fixed bottom-0 left-0 w-full lg:relative lg:w-auto p-4 lg:p-0 bg-slate-950/80 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-t border-white/10 lg:border-none z-40">
                                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2rem] p-1 relative shadow-[0_20px_60px_rgba(139,92,246,0.3)]">
                                        <div className="bg-slate-950/90 backdrop-blur-3xl rounded-[1.8rem] p-6 flex items-center justify-between gap-6">
                                            <div>
                                                <p className="text-slate-400 font-bold tracking-widest text-xs uppercase mb-1">Total</p>
                                                <div className="flex items-end gap-2">
                                                    <span className="text-4xl font-black text-white tracking-tighter">
                                                        {isFree ? 'Free' : `₹${totalAmount.toLocaleString('en-IN')}`}
                                                    </span>
                                                    {!isFree && <span className="text-violet-400 font-bold mb-1">{event.currency || 'INR'}</span>}
                                                </div>
                                            </div>
                                            
                                            <button 
                                                type="submit" 
                                                disabled={processing}
                                                className="px-8 py-5 bg-white hover:bg-slate-100 text-black font-black tracking-tight rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg group hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] min-w-[200px]"
                                            >
                                                {processing ? (
                                                    <><Loader2 className="w-6 h-6 animate-spin" /> Processing</>
                                                ) : (
                                                    <>Complete Order <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        )}
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
