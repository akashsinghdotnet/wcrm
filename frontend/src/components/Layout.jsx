import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useModules } from '../context/ModuleContext';
import { fetchCommunityFeed, dismissAnnouncement, getDismissedAnnouncements } from '../services/communityFeed';

import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    X,
    Settings,
    Kanban,
    MessageSquare,
    Bell,
    Sun,
    Moon,
    Radio,
    Zap,
    GitFork,
    Bot
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inbox', label: 'Inbox', icon: MessageSquare, match: ['/inbox', '/whatsapp-chats', '/whatsapp-direct'] },
    { to: '/notifications', label: 'Notifications', icon: Bell, match: ['/notifications'] },
    { to: '/contacts', label: 'Contacts', icon: Users, match: ['/contacts', '/whatsapp-contacts'] },
    { to: '/pipeline', label: 'Pipeline', icon: Kanban, match: ['/pipeline'] },
    { to: '/broadcasts', label: 'Broadcasts', icon: Radio, match: ['/broadcasts', '/whatsapp-broadcast'] },
    { to: '/automations', label: 'Automations', icon: Zap, match: ['/automations'] },
    { to: '/flows', label: 'Flows', icon: GitFork, match: ['/flows'] },
    { to: '/ai-agents', label: 'AI Agents', icon: Bot, match: ['/ai-agents'] },
    { to: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
    { to: '/users', label: 'Users', icon: Users, match: ['/users'], roles: ['admin'] },
];

const roleLabels = {
    admin: 'Admin',
    manager: 'Manager',
    staff: 'Employee',
};

const getRoleLabel = (role) => roleLabels[role] || role?.replace('_', ' ');

export default function Layout() {
    const { user, logout } = useAuth();
    const { config } = useConfig();
    const { loading: modulesLoading } = useModules();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadWhatsApp, setUnreadWhatsApp] = useState(0);
    const prevUnreadRef = useRef(0);
    const audioRef = useRef(null);

    // Dark / Light mode
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true;
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

    // Notification audio
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.volume = 0.5;
    }, []);

    // Polling unread whatsapp count
    const pollUnread = useCallback(async () => {
        try {
            const res = await api.get('/whatsapp/unread-count');
            const count = res.data?.count || 0;
            if (count > prevUnreadRef.current && prevUnreadRef.current !== 0) {
                audioRef.current?.play().catch(() => { });
            }
            prevUnreadRef.current = count;
            setUnreadWhatsApp(count);
        } catch { }
    }, []);

    useEffect(() => {
        pollUnread();
        const interval = setInterval(pollUnread, 15000);
        return () => clearInterval(interval);
    }, [pollUnread]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;

    const [activePromo, setActivePromo] = useState(null);

    useEffect(() => {
        fetchCommunityFeed(config).then(feed => {
            const dismissed = getDismissedAnnouncements();
            const unDismissed = feed?.announcements?.find(a => !dismissed.includes(a.id));
            if (unDismissed) setActivePromo(unDismissed);
        }).catch(() => {});
    }, [config]);

    const handleDismissPromo = () => {
        if (activePromo?.id) {
            dismissAnnouncement(activePromo.id);
            setActivePromo(null);
        }
    };

    const filteredNav = navItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(user?.role);
    });

    if (modulesLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className={`h-screen flex overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
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
                <div className={`h-16 flex items-center px-5 border-b overflow-hidden ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <a
                        href="https://wcrm.si"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:opacity-85 transition-opacity py-1"
                        title="Wcrm — WhatsApp CRM (wcrm.si)"
                    >
                        <img
                            src={isDark ? '/wcrm-logo-for-dark-bg.png' : '/wcrm-logo-for-light-bg.png'}
                            alt="Wcrm"
                            className="h-8 max-h-9 w-auto object-contain"
                        />
                    </a>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {filteredNav.map((item) => {
                        const active = item.match
                            ? item.match.some(m => location.pathname === m || location.pathname.startsWith(m + '/'))
                            : location.pathname === item.to;

                        const badgeCount = item.to === '/inbox' ? unreadWhatsApp : 0;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={() => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active
                                    ? 'bg-emerald-600/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                                    : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <span className="flex-1 truncate">{item.label}</span>
                                {badgeCount > 0 && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Sidebar footer (self-hosted promotional card) */}
                <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Community Edition</span>
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
                </div>
            </aside>

            {/* Main content */}
            <div className={`flex-1 flex flex-col h-screen min-w-0 overflow-hidden ${isDark ? '' : 'bg-gray-50'}`}>
                {/* Community Promotional / Update Announcement Banner */}
                {activePromo && (
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
                <header className={`h-16 border-b backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-gray-200 bg-white/90'}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                                isDark 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                                {getRoleLabel(user?.role)}
                            </span>
                            {user?.company?.companyName && (
                                <span className={`text-xs hidden sm:inline font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    • {user.company.companyName}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}`}
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* User Profile Circular Avatar & Dropdown */}
                        <div 
                            className="relative" 
                            ref={profileMenuRef}
                        >
                            <button
                                type="button"
                                onClick={() => setProfileMenuOpen(prev => !prev)}
                                className={`flex items-center gap-2 p-0.5 rounded-full transition-all focus:outline-none cursor-pointer ${
                                    profileMenuOpen ? 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/25' : 'hover:ring-2 hover:ring-emerald-500/40'
                                }`}
                                title={displayName}
                                aria-expanded={profileMenuOpen}
                            >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md ring-1 ring-white/20">
                                    {displayName?.[0]?.toUpperCase()}
                                </div>
                            </button>

                            {profileMenuOpen && (
                                <div className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl border p-2 z-50 transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                                }`}>
                                    {/* Profile Header */}
                                    <div className={`px-3 py-2.5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                                        <p className="text-sm font-bold truncate">{displayName}</p>
                                        <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user?.email}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                                            {getRoleLabel(user?.role)}
                                        </span>
                                    </div>

                                    {/* Menu Options */}
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setProfileMenuOpen(false);
                                                navigate('/settings');
                                            }}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
                                                isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
                                            }`}
                                        >
                                            <Settings className="w-4 h-4 text-emerald-500" />
                                            Edit Profile & Settings
                                        </button>
                                    </div>

                                    {/* Logout Option */}
                                    <div className={`pt-1 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                                        <button
                                            onClick={() => {
                                                setProfileMenuOpen(false);
                                                handleLogout();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                {(() => {
                    const isInbox = location.pathname.startsWith('/inbox') || 
                                    location.pathname.startsWith('/whatsapp-chats') || 
                                    location.pathname.startsWith('/whatsapp-direct');
                    return (
                        <main className={`flex-1 min-h-0 ${isInbox ? 'overflow-hidden p-0 flex flex-col' : 'overflow-auto p-4 lg:p-6'} ${isDark ? '' : 'bg-gray-50'}`}>
                            <Outlet />
                        </main>
                    );
                })()}
            </div>
        </div>
    );
}
