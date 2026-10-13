import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useModules } from '../context/ModuleContext';
import { WcrmIcon } from './WcrmLogo';
import { fetchCommunityFeed, dismissAnnouncement, getDismissedAnnouncements } from '../services/communityFeed';

import {
    LayoutDashboard,
    Building2,
    Users,
    UserCircle,
    FileText,
    IndianRupee,
    LogOut,
    Menu,
    X,
    Settings,
    Kanban,
    BarChart3,
    Sparkles,
    Plug,
    CreditCard,
    Gift,
    Mail,
    Receipt,
    MessageCircle,
    MessageSquare,
    Ticket,
    Megaphone,
    Bell,
    Sun,
    Moon,
    Blocks,
    Radio,
    Zap,
    GitFork,
    Bot
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: FileText, roles: ['admin', 'manager', 'staff'], module: 'SALES' },
    { to: '/pipeline', label: 'Pipeline', icon: Kanban, roles: ['admin', 'manager', 'staff'], module: 'SALES' },
    { to: '/whatsapp-chats', label: 'WhatsApp', icon: MessageCircle, roles: ['admin', 'manager', 'staff'], module: 'WHATSAPP' },
    {
        to: '/invoices',
        label: 'Invoices',
        icon: Receipt,
        module: 'FINANCE',
        show: (user) => ['admin', 'manager'].includes(user?.role) || (user?.role === 'staff' && user?.canCreateInvoices)
    },
    // Integrations moved under Settings tab for company admin
    { to: '/companies', label: 'Companies', icon: Building2, roles: ['super_admin', 'superadmin_admin', 'superadmin_staff'] },
    { to: '/plans', label: 'Plans', icon: Sparkles, roles: ['super_admin', 'superadmin_admin'] },
    { to: '/billing', label: 'Billing', icon: IndianRupee, roles: ['super_admin', 'superadmin_admin'] },
    { to: '/payment-settings', label: 'Payment Settings', icon: CreditCard, roles: ['super_admin'] },
    { to: '/coupons', label: 'Coupons', icon: Gift, roles: ['super_admin', 'superadmin_admin'] },
    { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'], module: 'REPORTS' },
    { to: '/tickets', label: 'Support', icon: Ticket, roles: ['super_admin', 'superadmin_admin', 'admin', 'manager'] },
    { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['super_admin', 'superadmin_admin', 'superadmin_staff'] },
    { to: '/settings', label: 'Settings', icon: Settings },
    // Notifications removed as per user request
    // { to: '/notifications', label: 'Notifications', icon: Mail, roles: ['admin'] },
    { to: '/marketing', label: 'Marketing', icon: Mail, roles: ['super_admin', 'superadmin_admin', 'admin', 'manager'], module: 'MARKETING' },
    { to: '/users', label: 'Users', icon: Users, roles: ['super_admin', 'superadmin_admin'] },
];

const roleLabels = {
    super_admin: 'Super Admin',
    superadmin_admin: 'Admin',
    superadmin_staff: 'Staff',
    admin: 'Company Admin',
    manager: 'Manager',
    staff: 'Employee',
};

const getRoleLabel = (role) => roleLabels[role] || role?.replace('_', ' ');

export default function Layout() {
    const { user, logout } = useAuth();
    const { config } = useConfig();
    const { hasModule, loading: modulesLoading } = useModules();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadWhatsApp, setUnreadWhatsApp] = useState(0);
    const prevUnreadRef = useRef(0);
    const audioRef = useRef(null);
    const notifPermissionRef = useRef(false);

    // Dark / Light mode
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true; // default dark
    });
    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.remove('light');
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
            root.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);
    const toggleTheme = () => setIsDark(prev => !prev);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then((perm) => {
                notifPermissionRef.current = perm === 'granted';
            });
        } else if ('Notification' in window) {
            notifPermissionRef.current = Notification.permission === 'granted';
        }
    }, []);

    const playNotificationSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                // Create a short notification beep using AudioContext
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            }
        } catch (e) { /* ignore audio errors */ }
    }, []);

    useEffect(() => {
        // Only run for company roles
        if (!user || ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user.role)) return;

        const fetchUnread = async () => {
            try {
                const res = await api.get('/whatsapp/unread-count');
                const newCount = res.data.count || 0;

                // If unread count increased, play sound + show notification
                if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
                    playNotificationSound();

                    if ('Notification' in window && Notification.permission === 'granted') {
                        const diff = newCount - prevUnreadRef.current;
                        new Notification('New WhatsApp Message', {
                            body: `You have ${diff} new unread message${diff > 1 ? 's' : ''}`,
                            icon: '/vite.svg',
                            tag: 'whatsapp-notification',
                        });
                    }
                }

                prevUnreadRef.current = newCount;
                setUnreadWhatsApp(newCount);
            } catch (err) { }
        };

        // Set initial ref to -1 so first fetch doesn't trigger notification
        prevUnreadRef.current = -1;
        fetchUnread();
        const interval = setInterval(fetchUnread, 10000); // 10s
        return () => clearInterval(interval);
    }, [user, playNotificationSound]);

    // Announcement notifications
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const notifDropdownRef = useRef(null);

    useEffect(() => {
        if (!user || ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user.role)) return;

        const fetchAnnouncementCount = async () => {
            try {
                const res = await api.get('/announcements/unread-count');
                setUnreadAnnouncements(res.data.count || 0);
            } catch { }
        };

        fetchAnnouncementCount();
        const interval = setInterval(fetchAnnouncementCount, 30000); // 30s
        return () => clearInterval(interval);
    }, [user]);

    const openNotifDropdown = async () => {
        setShowNotifDropdown(prev => !prev);
        if (!showNotifDropdown) {
            try {
                const res = await api.get('/announcements/for-me');
                setAnnouncements(res.data);
            } catch { }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/announcements/mark-all-read');
            setUnreadAnnouncements(0);
            setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
        } catch { }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        const isSuperadminTeam = user?.role === 'super_admin' ||
            user?.role === 'superadmin_admin' ||
            user?.role === 'superadmin_staff';
        const redirectTo = isSuperadminTeam ? '/army' : '/login';
        logout();
        navigate(redirectTo);
    };

    const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;

    const isSelfHosted = config?.deployment_mode === 'self_hosted';
    const isSuperAdmin = !isSelfHosted && ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user?.role);
    const [activePromo, setActivePromo] = useState(null);

    useEffect(() => {
        if (isSelfHosted) {
            fetchCommunityFeed(config).then(feed => {
                const dismissed = getDismissedAnnouncements();
                const unDismissed = feed?.announcements?.find(a => !dismissed.includes(a.id));
                if (unDismissed) setActivePromo(unDismissed);
            }).catch(() => {});
        }
    }, [isSelfHosted, config]);

    const handleDismissPromo = () => {
        if (activePromo?.id) {
            dismissAnnouncement(activePromo.id);
            setActivePromo(null);
        }
    };

    const filteredNav = isSuperAdmin ? [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/companies', label: 'Companies', icon: Building2 },
        { to: '/plans', label: 'Plans', icon: Sparkles },
        { to: '/billing', label: 'Billing', icon: IndianRupee },
        { to: '/payment-settings', label: 'Payment Settings', icon: CreditCard },
        { to: '/coupons', label: 'Coupons', icon: Gift },
        { to: '/tickets', label: 'Support', icon: Ticket },
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/users', label: 'Users', icon: Users },
        { to: '/settings', label: 'Settings', icon: Settings },
    ] : [
        // User panel: EXACT 10 WhatsApp CRM items requested by user
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/inbox', label: 'Inbox', icon: MessageSquare, badge: unreadWhatsApp, match: ['/inbox', '/whatsapp-chats', '/whatsapp-direct'] },
        { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadAnnouncements, match: ['/notifications'] },
        { to: '/contacts', label: 'Contacts', icon: Users, match: ['/contacts', '/whatsapp-contacts'] },
        { to: '/pipeline', label: 'Pipeline', icon: Kanban, match: ['/pipeline'] },
        { to: '/broadcasts', label: 'Broadcasts', icon: Radio, match: ['/broadcasts', '/whatsapp-broadcast'] },
        { to: '/automations', label: 'Automations', icon: Zap, match: ['/automations'] },
        { to: '/flows', label: 'Flows', icon: GitFork, match: ['/flows'] },
        { to: '/ai-agents', label: 'AI Agents', icon: Bot, match: ['/ai-agents'] },
        { to: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
    ];

    // Block entire Layout until modules are resolved — prevents sidebar flash
    if (modulesLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 h-screen inset-y-0 left-0 z-50 w-64 border-r flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}
            >
                {/* Logo - Locked to h-16 matching top header height so it never exceeds or goes below header line */}
                <div
                    className={`h-16 flex items-center px-5 border-b overflow-hidden ${isDark ? 'border-slate-800' : 'border-gray-200'}`}
                >
                    <div className="flex items-center gap-3 min-w-0 max-h-12 overflow-hidden">
                        {config?.sidebar_logo_link ? (
                            <a href={config.sidebar_logo_link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 flex items-center">
                                {((isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo) ? (
                                    <img
                                        src={(isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo}
                                        alt="Logo"
                                        className="object-contain rounded-lg hover:opacity-80 transition-opacity max-h-10 w-auto"
                                        style={{ maxWidth: config.sidebar_logo_width ? `${Math.min(config.sidebar_logo_width, 140)}px` : '120px', maxHeight: '40px' }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-tr from-[#075E54] to-[#25D366] rounded-xl flex items-center justify-center hover:opacity-90 transition-all shadow-md shadow-[#25D366]/20 shrink-0">
                                        <WcrmIcon className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </a>
                        ) : (
                            <div className="flex-shrink-0 flex items-center">
                                {((isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo) ? (
                                    <img
                                        src={(isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo}
                                        alt="Logo"
                                        className="object-contain rounded-lg max-h-10 w-auto"
                                        style={{ maxWidth: config.sidebar_logo_width ? `${Math.min(config.sidebar_logo_width, 140)}px` : '120px', maxHeight: '40px' }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-tr from-[#075E54] to-[#25D366] rounded-xl flex items-center justify-center shadow-md shadow-[#25D366]/20 shrink-0">
                                        <WcrmIcon className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>
                        )}
                        {(config?.sidebar_show_text === undefined || config?.sidebar_show_text === 'true') && (
                            <div className="min-w-0 truncate">
                                <h1 className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{config?.sidebar_text_content || 'Wcrm'}</h1>
                                <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>WhatsApp CRM</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {modulesLoading ? (
                        /* Skeleton placeholders while modules load */
                        Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl animate-pulse`}>
                                <div className={`w-5 h-5 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                                <div className={`h-3.5 rounded-md ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} style={{ width: `${60 + Math.random() * 60}px` }} />
                            </div>
                        ))
                    ) : (
                        filteredNav.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/'}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) => {
                                    const matchesSub = item.match && item.match.some(m => location.pathname.startsWith(m));
                                    const active = isActive || matchesSub;
                                    return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active
                                        ? 'bg-emerald-600/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                                        : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`;
                                }}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </NavLink>
                        ))
                    )}
                </nav>

                {/* User info + logout */}
                <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <button 
                        onClick={() => {
                            navigate('/settings');
                            setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-gray-100'}`}
                    >
                        <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-indigo-400">
                                {displayName?.[0]?.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayName}</p>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{getRoleLabel(user?.role)}</p>
                        </div>
                    </button>
                    {isSelfHosted && (
                        <div className={`mt-3 p-3 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Community</span>
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">v{config?.app_version || '1.0.0'}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2 leading-tight">Self-hosted WhatsApp CRM.</p>
                            <a
                                href={config?.cloud_url || 'https://wcrm.si'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                            >
                                <span>☁️ Managed Cloud</span>
                            </a>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="mt-2 w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 ${isDark ? '' : 'bg-gray-50'}`}>
                {/* Community Promotional / Update Announcement Banner */}
                {isSelfHosted && activePromo && (
                    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm z-40">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] shrink-0">
                                {activePromo.badge || 'Wcrm Cloud'}
                            </span>
                            <span className="font-bold truncate">{activePromo.title}</span>
                            <span className="hidden md:inline text-white/90 truncate">— {activePromo.message}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                            {activePromo.ctaUrl && (
                                <a
                                    href={activePromo.ctaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-2.5 py-1 rounded-md text-[11px] shadow-sm transition-all"
                                >
                                    {activePromo.ctaText || 'Learn More'} &rarr;
                                </a>
                            )}
                            <button
                                onClick={handleDismissPromo}
                                className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                                title="Dismiss announcement"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}
                {/* Top bar */}
                <header className={`h-16 border-b backdrop-blur-sm flex items-center px-4 lg:px-6 sticky top-0 z-30 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-gray-200 bg-white/90'}`}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden mr-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-3">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        {/* Notification bell - only for company users */}
                        {!['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user?.role) && (
                            <div className="relative" ref={notifDropdownRef}>
                                <button
                                    onClick={openNotifDropdown}
                                    className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadAnnouncements > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                            {unreadAnnouncements > 99 ? '99+' : unreadAnnouncements}
                                        </span>
                                    )}
                                </button>

                                {showNotifDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-white">Notifications</h4>
                                            {unreadAnnouncements > 0 && (
                                                <button
                                                    onClick={handleMarkAllRead}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {announcements.length === 0 ? (
                                                <div className="p-6 text-center text-slate-500 text-sm">No announcements yet</div>
                                            ) : (
                                                announcements.slice(0, 10).map((a) => (
                                                    <button
                                                        key={a.id}
                                                        onClick={() => {
                                                            setShowNotifDropdown(false);
                                                            navigate('/company-announcements');
                                                        }}
                                                        className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 ${!a.isRead ? 'bg-indigo-500/5' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {!a.isRead && (
                                                                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                                            )}
                                                            <div className={`flex-1 min-w-0 ${a.isRead ? 'ml-5' : ''}`}>
                                                                <p className={`text-sm truncate ${a.isRead ? 'text-slate-400' : 'text-white font-medium'}`}>
                                                                    {a.title}
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                        {announcements.length > 0 && (
                                            <div className="p-3 border-t border-slate-800">
                                                <button
                                                    onClick={() => { setShowNotifDropdown(false); navigate('/company-announcements'); }}
                                                    className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-1 transition-colors"
                                                >
                                                    View all announcements
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <span className={`text-sm hidden sm:block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{displayName}</span>
                        <span className="px-2.5 py-1 text-xs font-medium bg-indigo-600/20 text-indigo-400 rounded-full">
                            {getRoleLabel(user?.role)}
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className={`flex-1 overflow-auto p-4 lg:p-6 ${isDark ? '' : 'bg-gray-50'}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
