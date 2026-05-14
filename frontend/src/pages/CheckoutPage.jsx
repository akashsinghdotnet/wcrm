import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    IndianRupee, Globe, Building2, Check, Magnet,
    Shield, Sparkles, Users, CreditCard, Clock, Loader2,
    User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Tag, X
} from 'lucide-react';

const INDIAN_STATES = [
    '—', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
];

export default function CheckoutPage() {
    const { planSlug } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [billingPeriod, setBillingPeriod] = useState(searchParams.get('billing') === 'yearly' ? 'yearly' : 'monthly');
    const [paymentSettings, setPaymentSettings] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const { login } = useAuth();
    const { config } = useConfig();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);

    // Expanded form
    const [form, setForm] = useState({
        firstName: '', lastName: '',
        email: '', phone: '',
        companyName: '',
        streetAddress: '', streetAddress2: '',
        city: '', state: '—', postcode: '', country: 'India',
        taxId: '',
        password: '', confirmPassword: '',
    });

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    useEffect(() => {
        loadPlan();
        loadPaymentSettings();
    }, [planSlug]);

    const loadPlan = async () => {
        try {
            // Try dedicated slug endpoint first
            const res = await api.get(`/plans/slug/${planSlug}`);
            setPlan(res.data);
        } catch {
            // Fallback: fetch all plans and match by slug or name
            try {
                const res = await api.get('/plans');
                const toSlug = (name) => name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
                const found = res.data.find(p => p.slug === planSlug || toSlug(p.name) === planSlug);
                if (found) setPlan(found);
                else toast.error('Plan not found');
            } catch {
                toast.error('Failed to load plan');
            }
        } finally {
            setLoading(false);
        }
    };

    const loadPaymentSettings = async () => {
        try {
            const res = await api.get('/settings/public');
            if (res.data?.payment_settings) {
                try { setPaymentSettings(JSON.parse(res.data.payment_settings)); } catch { }
            }
        } catch { }
    };

    const applyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        try {
            const res = await api.post('/coupons/validate', {
                code: couponCode.trim(),
                billingCycle: billingPeriod,
            });
            const found = res.data;
            setAppliedCoupon(found);
            toast.success(`Coupon applied! ${found.type === 'percentage' ? `${found.value}% off` : `₹${found.value} off`}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid or expired coupon code');
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        toast.success('Coupon removed');
    };

    // ₹ formatter with paisa (2 decimal places)
    const fmt = (amount) => {
        const num = Number(amount);
        const parts = num.toFixed(2).split('.');
        // Indian grouping: last 3 digits, then pairs of 2
        let intPart = parts[0];
        const isNeg = intPart.startsWith('-');
        if (isNeg) intPart = intPart.slice(1);
        let formatted;
        if (intPart.length > 3) {
            const last3 = intPart.slice(-3);
            const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
            formatted = rest + ',' + last3;
        } else {
            formatted = intPart;
        }
        return `₹${isNeg ? '-' : ''}${formatted}.${parts[1]}`;
    };

    const GST_RATE = 18;
    // For yearly: originalPrice = monthly × 12 (full rate), basePrice = yearly (discounted)
    const originalPrice = plan ? (billingPeriod === 'yearly' ? Number(plan.priceMonthly) * 12 : Number(plan.priceMonthly)) : 0;
    const basePrice = plan ? Number(billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceYearly) : 0;
    const annualSavings = billingPeriod === 'yearly' && plan ? originalPrice - basePrice : 0;
    const discount = appliedCoupon
        ? appliedCoupon.type === 'percentage'
            ? parseFloat((basePrice * appliedCoupon.value / 100).toFixed(2))
            : Math.min(appliedCoupon.value, basePrice)
        : 0;
    const subtotal = Math.max(0, parseFloat((basePrice - discount).toFixed(2)));
    const gstAmount = parseFloat((subtotal * GST_RATE / 100).toFixed(2));
    const finalPrice = parseFloat((subtotal + gstAmount).toFixed(2));

    const availableMethods = [];
    if (paymentSettings?.razorpay?.enabled) {
        availableMethods.push({
            id: 'razorpay', name: 'Razorpay', description: 'UPI, Cards, Netbanking, Wallets',
            icon: IndianRupee, iconBg: 'bg-blue-500/10 border-blue-500/20', iconColor: 'text-blue-400',
            selectedBorder: 'border-blue-500 ring-blue-500/30',
        });
    }
    if (paymentSettings?.paypal?.enabled) {
        availableMethods.push({
            id: 'paypal', name: 'PayPal', description: 'International cards & PayPal balance',
            icon: Globe, iconBg: 'bg-sky-500/10 border-sky-500/20', iconColor: 'text-sky-400',
            selectedBorder: 'border-sky-500 ring-sky-500/30',
        });
    }
    if (paymentSettings?.bankTransfer?.enabled) {
        availableMethods.push({
            id: 'bank_transfer', name: 'Bank Transfer', description: 'NEFT / IMPS / RTGS',
            icon: Building2, iconBg: 'bg-emerald-500/10 border-emerald-500/20', iconColor: 'text-emerald-400',
            selectedBorder: 'border-emerald-500 ring-emerald-500/30',
        });
    }

    const getPasswordStrength = (pwd) => {
        if (!pwd) return { label: 'Enter a Password', color: 'bg-slate-700', width: '0%' };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
        if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
        if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
        if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' };
        return { label: 'Very Strong', color: 'bg-emerald-400', width: '100%' };
    };

    const strength = getPasswordStrength(form.password);

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

    const openRazorpayCheckout = async (orderData) => {
        const loaded = await loadRazorpayScript();
        if (!loaded) { toast.error('Failed to load Razorpay. Please try again.'); return; }

        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: config?.login_text_content || 'Magnet CRM',
            description: `${plan.name} Plan - ${billingPeriod}`,
            order_id: orderData.orderId,
            prefill: orderData.prefill,
            theme: { color: '#4F46E5' },
            handler: async (response) => {
                // Payment successful — verify on backend
                try {
                    toast.loading('Verifying payment...', { id: 'verify' });
                    const verifyRes = await api.post('/auth/verify-payment', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        companyId: orderData.companyId,
                        userId: orderData.userId,
                        couponCode: orderData.couponCode || undefined,
                    });
                    toast.dismiss('verify');

                    if (verifyRes.data.access_token) {
                        login(verifyRes.data.user, verifyRes.data.access_token);
                        toast.success('Payment successful! Welcome to Magnet CRM.');
                        setTimeout(() => navigate('/'), 1000);
                    }
                } catch (err) {
                    toast.dismiss('verify');
                    toast.error(err.response?.data?.message || 'Payment verification failed. Contact support.');
                }
            },
            modal: {
                ondismiss: () => {
                    toast.error('Payment was cancelled. Your account is pending — please complete payment to activate.');
                    setProcessing(false);
                },
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
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

    const [paypalModalData, setPaypalModalData] = useState(null);

    const openPayPalCheckout = async (orderData) => {
        const loaded = await loadPayPalScript(orderData.clientId, orderData.currency);
        if (!loaded) { toast.error('Failed to load PayPal. Please try again.'); return; }
        setPaypalModalData(orderData);
    };

    useEffect(() => {
        if (paypalModalData && window.paypal) {
            document.getElementById('paypal-button-container').innerHTML = '';
            window.paypal.Buttons({
                createOrder: () => {
                    return paypalModalData.orderId;
                },
                onApprove: async (data, actions) => {
                    try {
                        toast.loading('Verifying payment...', { id: 'verify-paypal' });
                        const verifyRes = await api.post('/auth/verify-paypal-payment', {
                            paypal_order_id: data.orderID,
                            companyId: paypalModalData.companyId,
                            userId: paypalModalData.userId,
                            couponCode: paypalModalData.couponCode,
                        });
                        toast.dismiss('verify-paypal');
                        
                        setPaypalModalData(null);
                        
                        if (verifyRes.data.access_token) {
                            login(verifyRes.data.user, verifyRes.data.access_token);
                            toast.success('Payment successful! Welcome to Magnet CRM.');
                            setTimeout(() => navigate('/'), 1000);
                        }
                    } catch (err) {
                        toast.dismiss('verify-paypal');
                        toast.error(err.response?.data?.message || 'Payment verification failed.');
                    }
                },
                onCancel: () => {
                    toast.error('Payment was cancelled.');
                    setPaypalModalData(null);
                    setProcessing(false);
                },
                onError: (err) => {
                    toast.error('PayPal encountered an error. Please try again.');
                    console.error(err);
                    setPaypalModalData(null);
                    setProcessing(false);
                }
            }).render('#paypal-button-container');
        }
    }, [paypalModalData, login, navigate]);

    const handlePay = async () => {
        if (!form.firstName || !form.email) { toast.error('Please fill in all required fields'); return; }
        if (!form.password || form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
        if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
        if (!selectedMethod) { toast.error('Please select a payment method'); return; }

        setProcessing(true);
        try {
            const payloadCompanyName = form.companyName?.trim() || `${form.firstName}'s Company`;
            const res = await api.post('/auth/register-subscription', {
                email: form.email,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
                companyName: payloadCompanyName,
                phone: form.phone || undefined,
                streetAddress: form.streetAddress || undefined,
                city: form.city || undefined,
                state: form.state && form.state !== '—' ? form.state : undefined,
                postcode: form.postcode || undefined,
                country: form.country || undefined,
                taxId: form.taxId || undefined,
                planId: plan.id,
                billingPeriod,
                paymentMethod: selectedMethod,
                couponCode: appliedCoupon?.code || undefined,
            });

            if (res.data.status === 'pending_payment') {
                // Bank transfer - show success screen (no auto-login)
                setOrderSuccess(true);
                toast.success('Order placed! Check your email for bank details.');
            } else if (res.data.status === 'razorpay_order_created') {
                // Open Razorpay checkout modal
                await openRazorpayCheckout(res.data);
            } else if (res.data.status === 'paypal_order_created') {
                // Open PayPal checkout modal
                await openPayPalCheckout(res.data);
            } else if (res.data.status === 'active') {
                setOrderSuccess(true);
                toast.success('Account created and activated successfully!');
            } else if (res.data.access_token) {
                // Direct login (fallback)
                login(res.data.user, res.data.access_token);
                toast.success('Account created successfully!');
                setTimeout(() => navigate('/'), 1500);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Order Placed Successfully!</h2>
                    
                    {plan?.priceMonthly == 0 ? (
                        <>
                            <p className="text-slate-400 mb-6">
                                Your free plan has been activated successfully! Your login credentials have been sent to <span className="text-white font-medium">{form.email}</span>.
                            </p>
                            <button onClick={() => navigate('/login')} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all w-full">
                                Go to Login
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-slate-400 mb-6">
                                We've sent the bank transfer details to <span className="text-white font-medium">{form.email}</span>.
                                Please complete the payment and your CRM account will be activated once the payment is verified.
                            </p>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 text-left">
                                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-3">What happens next?</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">1</div>
                                        <p className="text-sm text-slate-300">Transfer the amount to the bank account mentioned in the email</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">2</div>
                                        <p className="text-sm text-slate-300">Our team will verify your payment</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">3</div>
                                        <p className="text-sm text-slate-300">Your CRM account will be activated and you'll receive a confirmation email</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => navigate('/')} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all">
                                Go to Homepage
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Plan Not Found</h2>
                    <p className="text-slate-400 mb-6">This plan does not exist or has been removed.</p>
                    <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium">Go Home</button>
                </div>
            </div>
        );
    }

    const inputClass = "w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm";

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Top bar */}
            <div className="bg-slate-900 border-b border-slate-800">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {(config?.login_logo_url || config?.app_logo) ? (
                            <img
                                src={config.login_logo_url || config.app_logo}
                                alt="Logo"
                                className="object-contain"
                                style={{ height: '36px', width: 'auto' }}
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <Magnet className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-white font-semibold text-sm">{config?.login_text_content || 'MagnetCRM'}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <Shield className="w-3.5 h-3.5" /> Secured Checkout
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-10">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Complete Your Purchase</h1>
                    <p className="text-slate-400 mt-1">Subscribe to the <span className="text-white font-medium">{plan.name}</span> plan</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left – Form (3 cols) */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* ─── Personal Information ─── */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                                <User className="w-4 h-4" /> Personal Information
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">First Name *</label>
                                        <input required value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} className={inputClass} placeholder="First Name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Name</label>
                                        <input value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} className={inputClass} placeholder="Last Name" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address *</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input type="email" required value={form.email} onChange={e => updateForm('email', e.target.value)} className={`${inputClass} pl-10`} placeholder="you@company.com" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🇮🇳 +91</span>
                                            <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} className={`${inputClass} pl-[4.5rem]`} placeholder="9876543210" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── Billing Address ─── */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Billing Address
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name (Optional)</label>
                                    <input value={form.companyName} onChange={e => updateForm('companyName', e.target.value)} className={inputClass} placeholder="Company Name" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Street Address</label>
                                    <input value={form.streetAddress} onChange={e => updateForm('streetAddress', e.target.value)} className={inputClass} placeholder="Street Address" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Street Address 2</label>
                                    <input value={form.streetAddress2} onChange={e => updateForm('streetAddress2', e.target.value)} className={inputClass} placeholder="Apartment, suite, etc. (optional)" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                                        <input value={form.city} onChange={e => updateForm('city', e.target.value)} className={inputClass} placeholder="City" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">State</label>
                                        <select value={form.state} onChange={e => updateForm('state', e.target.value)} className={inputClass}>
                                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Postcode</label>
                                        <input value={form.postcode} onChange={e => updateForm('postcode', e.target.value)} className={inputClass} placeholder="110001" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Country</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🌍</span>
                                        <input value={form.country} onChange={e => updateForm('country', e.target.value)} className={`${inputClass} pl-9`} placeholder="India" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Tax ID / GST (Optional)</label>
                                    <input value={form.taxId} onChange={e => updateForm('taxId', e.target.value)} className={inputClass} placeholder="22AAAAA0000A1Z5" />
                                </div>
                            </div>
                        </div>

                        {/* ─── Account Security ─── */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                                <Lock className="w-4 h-4" /> Account Security
                            </h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Password *</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={form.password}
                                                onChange={e => updateForm('password', e.target.value)}
                                                className={`${inputClass} pr-10`}
                                                placeholder="Password"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password *</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                value={form.confirmPassword}
                                                onChange={e => updateForm('confirmPassword', e.target.value)}
                                                className={`${inputClass} pr-10`}
                                                placeholder="Confirm Password"
                                            />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Password Strength */}
                                <div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">Password Strength: <span className="text-slate-400">{strength.label}</span></p>
                                </div>
                            </div>
                        </div>

                        {/* ─── Payment Method ─── */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-base font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                                <CreditCard className="w-4 h-4" /> Payment Method
                            </h3>

                            {availableMethods.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
                                    <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 text-sm">No payment methods available yet.</p>
                                    <p className="text-slate-500 text-xs mt-1">Contact the admin to configure payment gateways.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {availableMethods.map((method) => {
                                        const Icon = method.icon;
                                        const isSelected = selectedMethod === method.id;
                                        return (
                                            <button key={method.id} onClick={() => setSelectedMethod(method.id)}
                                                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${isSelected ? `${method.selectedBorder} ring-1 bg-slate-800/70` : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'}`}>
                                                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${method.iconBg}`}>
                                                    <Icon className={`w-5 h-5 ${method.iconColor}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-white text-sm">{method.name}</p>
                                                    <p className="text-xs text-slate-400">{method.description}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Bank Transfer Details */}
                            {selectedMethod === 'bank_transfer' && paymentSettings?.bankTransfer && (
                                <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Bank Account Details</p>
                                    <div className="space-y-2 text-sm">
                                        {paymentSettings.bankTransfer.bankName && <div className="flex justify-between"><span className="text-slate-400">Bank</span><span className="text-white font-medium">{paymentSettings.bankTransfer.bankName}</span></div>}
                                        {paymentSettings.bankTransfer.accountHolder && <div className="flex justify-between"><span className="text-slate-400">Account Holder</span><span className="text-white font-medium">{paymentSettings.bankTransfer.accountHolder}</span></div>}
                                        {paymentSettings.bankTransfer.accountNumber && <div className="flex justify-between"><span className="text-slate-400">Account No.</span><span className="text-white font-mono font-medium">{paymentSettings.bankTransfer.accountNumber}</span></div>}
                                        {paymentSettings.bankTransfer.ifscCode && <div className="flex justify-between"><span className="text-slate-400">IFSC</span><span className="text-white font-mono font-medium">{paymentSettings.bankTransfer.ifscCode}</span></div>}
                                        {paymentSettings.bankTransfer.branch && <div className="flex justify-between"><span className="text-slate-400">Branch</span><span className="text-white font-medium">{paymentSettings.bankTransfer.branch}</span></div>}
                                    </div>
                                    <p className="text-xs text-emerald-400/70 mt-3">Transfer the exact amount and share the receipt for verification.</p>
                                </div>
                            )}
                        </div>

                        {/* Pay Button */}
                        <button onClick={handlePay} disabled={!selectedMethod || processing || availableMethods.length === 0}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed text-base">
                            {processing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                            ) : selectedMethod === 'bank_transfer' ? (
                                <><Check className="w-5 h-5" /> Confirm Order — {fmt(finalPrice)} <span className="text-xs opacity-70">(incl. GST)</span></>
                            ) : (
                                <><CreditCard className="w-5 h-5" /> Pay {fmt(finalPrice)} <span className="text-xs opacity-70">(incl. GST)</span></>
                            )}
                        </button>
                    </div>

                    {/* Right – Order Summary (2 cols) */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-6">
                            <h3 className="text-base font-semibold text-white mb-5">Order Summary</h3>

                            {/* Plan Card */}
                            <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-4 mb-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{plan.name}</p>
                                        <p className="text-xs text-slate-400">{plan.adminLimit} admin · {plan.employeeLimit} employees</p>
                                    </div>
                                </div>
                                {plan.features?.length > 0 && (
                                    <div className="space-y-1.5 mt-3 pt-3 border-t border-indigo-500/15">
                                        {plan.features.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                                                <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" /> {f}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>


                            {/* Coupon Code */}
                            <div className="mb-5">
                                <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wide">Coupon Code</p>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm font-mono font-semibold text-emerald-300">{appliedCoupon.code}</span>
                                            <span className="text-xs text-emerald-400/70">
                                                ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% off` : `₹${appliedCoupon.value} off`})
                                            </span>
                                        </div>
                                        <button onClick={removeCoupon} className="text-slate-400 hover:text-red-400 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                                            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono uppercase"
                                            placeholder="ENTER CODE"
                                        />
                                        <button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Price Breakdown */}
                            <div className="space-y-3 mb-5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">{plan.name} ({billingPeriod === 'yearly' ? 'yearly' : 'monthly'})</span>
                                    <span className="text-white">{fmt(billingPeriod === 'yearly' ? originalPrice : basePrice)}</span>
                                </div>
                                {billingPeriod === 'yearly' && annualSavings > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-400">Annual savings</span>
                                        <span className="text-emerald-400">-{fmt(annualSavings)}</span>
                                    </div>
                                )}
                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-400">Coupon ({appliedCoupon.code})</span>
                                        <span className="text-emerald-400">-{fmt(discount)}</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-800" />
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="text-white">{fmt(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">GST (18%)</span>
                                    <span className="text-white">{fmt(gstAmount)}</span>
                                </div>
                                <div className="h-px bg-slate-800" />
                                <div className="flex justify-between">
                                    <span className="text-white font-semibold">Total</span>
                                    <span className="text-xl font-bold text-white">{fmt(finalPrice)}</span>
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Billed {billingPeriod === 'monthly' ? 'every month' : 'annually'}. Price inclusive of 18% GST.
                                </p>
                            </div>

                            {/* Trust Badges */}
                            <div className="pt-4 border-t border-slate-800 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Shield className="w-3.5 h-3.5 text-emerald-500" /> 256-bit SSL encrypted
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Cancel anytime, no lock-in
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PayPal Modal */}
            {paypalModalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                        <button 
                            onClick={() => {
                                setPaypalModalData(null);
                                setProcessing(false);
                                toast.error('Payment was cancelled.');
                            }} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Globe className="w-6 h-6 text-sky-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Complete Payment</h3>
                            <p className="text-sm text-gray-500 mt-1">Pay Securely via PayPal</p>
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                <span className="text-sm text-slate-500">Amount:</span>
                                <span className="text-lg font-bold text-slate-900">${paypalModalData.amount} USD</span>
                            </div>
                        </div>
                        <div id="paypal-button-container" className="min-h-[150px]"></div>
                    </div>
                </div>
            )}
        </div>
    );
}
