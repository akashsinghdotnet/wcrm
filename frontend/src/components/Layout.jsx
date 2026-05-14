import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useModules } from '../context/ModuleContext';

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
    Magnet,
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
    Ticket,
    Megaphone,
    Bell,
    Sun,
    Moon,
    Blocks,
    Calendar,
    CalendarDays,
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: FileText, roles: ['admin', 'staff'], module: 'SALES' },
    { to: '/pipeline', label: 'Pipeline', icon: Kanban, roles: ['admin', 'staff'], module: 'SALES' },
    { to: '/appointments', label: 'Appointments', icon: Calendar, roles: ['admin', 'staff'], module: 'APPOINTMENTS' },
    { to: '/events', label: 'Events', icon: CalendarDays, roles: ['admin', 'staff', 'manager'], module: 'EVENTS' },
    { to: '/event-bookings', label: 'Bookings', icon: Ticket, roles: ['admin', 'staff', 'manager'], module: 'EVENTS' },
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
    { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin'], module: 'REPORTS' },
    { to: '/tickets', label: 'Support', icon: Ticket, roles: ['super_admin', 'superadmin_admin', 'admin', 'manager'], module: 'SUPPORT' },
    { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['super_admin', 'superadmin_admin', 'superadmin_staff'] },
    { to: '/settings', label: 'Settings', icon: Settings },
    // Notifications removed as per user request
    // { to: '/notifications', label: 'Notifications', icon: Mail, roles: ['admin'] },
    { to: '/marketing', label: 'Marketing', icon: Mail, roles: ['super_admin', 'superadmin_admin', 'admin'], module: 'MARKETING' },
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
    const { hasModule } = useModules();
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

    const filteredNav = navItems.filter((item) => {
        if (item.show) return item.show(user) && (!item.module || hasModule(item.module));
        const roleOk = !item.roles || item.roles.includes(user?.role);
        const moduleOk = !item.module || hasModule(item.module);
        return roleOk && moduleOk;
    });

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
                {/* Logo */}
                <div
                    className={`px-6 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}
                    style={{
                        paddingTop: config?.sidebar_padding_vertical ? `${config.sidebar_padding_vertical}px` : '1.5rem',
                        paddingBottom: config?.sidebar_padding_vertical ? `${config.sidebar_padding_vertical}px` : '1.5rem'
                    }}
                >
                    <div className="flex items-center gap-3">
                        {config?.sidebar_logo_link ? (
                            <a href={config.sidebar_logo_link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                {((isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo) ? (
                                    <img
                                        src={(isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo}
                                        alt="Logo"
                                        className="object-contain rounded-xl hover:opacity-80 transition-opacity"
                                        style={{ width: config.sidebar_logo_width ? `${config.sidebar_logo_width}px` : '40px', height: 'auto', maxHeight: '80px' }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-500 transition-colors">
                                        <Magnet className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </a>
                        ) : (
                            <>
                                {((isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo) ? (
                                    <img
                                        src={(isDark ? (config?.sidebar_logo_url || config?.login_logo_url) : (config?.sidebar_logo_light_url || config?.login_logo_light_url || config?.sidebar_logo_url || config?.login_logo_url)) || config?.app_logo}
                                        alt="Logo"
                                        className="object-contain rounded-xl"
                                        style={{ width: config.sidebar_logo_width ? `${config.sidebar_logo_width}px` : '40px', height: 'auto', maxHeight: '80px' }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                                        <Magnet className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </>
                        )}
                        {(config?.sidebar_show_text === undefined || config?.sidebar_show_text === 'true') && (
                            <div>
                                <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{config?.sidebar_text_content || 'MagnetCRM'}</h1>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Marketing Agency CRM</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {filteredNav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="flex-1">{item.label}</span>
                            {item.to === '/whatsapp-chats' && unreadWhatsApp > 0 && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full">
                                    {unreadWhatsApp > 99 ? '99+' : unreadWhatsApp}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User info + logout */}
                <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center">
                            <span className="text-sm font-semibold text-indigo-400">
                                {displayName?.[0]?.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{displayName}</p>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{getRoleLabel(user?.role)}</p>
                        </div>
                    </div>
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
