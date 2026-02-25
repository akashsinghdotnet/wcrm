import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';

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
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: FileText, roles: ['admin', 'staff'] },
    { to: '/pipeline', label: 'Pipeline', icon: Kanban, roles: ['admin', 'staff'] },
    { to: '/whatsapp-chats', label: 'WhatsApp Chats', icon: MessageCircle, roles: ['admin', 'manager', 'staff'] },
    {
        to: '/invoices',
        label: 'Invoices',
        icon: Receipt,
        show: (user) => ['admin', 'manager'].includes(user?.role) || (user?.role === 'staff' && user?.canCreateInvoices)
    },
    { to: '/integrations', label: 'Integrations', icon: Plug, roles: ['admin'] },
    { to: '/companies', label: 'Companies', icon: Building2, roles: ['super_admin', 'superadmin_admin', 'superadmin_staff'] },
    { to: '/plans', label: 'Plans', icon: Sparkles, roles: ['super_admin', 'superadmin_admin'] },
    { to: '/billing', label: 'Billing', icon: IndianRupee, roles: ['super_admin', 'superadmin_admin'] },
    { to: '/payment-settings', label: 'Payment Settings', icon: CreditCard, roles: ['super_admin'] },
    { to: '/coupons', label: 'Coupons', icon: Gift, roles: ['super_admin', 'superadmin_admin'] },
    { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
    { to: '/settings', label: 'Settings', icon: Settings },
    // Notifications removed as per user request
    // { to: '/notifications', label: 'Notifications', icon: Mail, roles: ['admin'] },
    { to: '/marketing', label: 'Marketing', icon: Mail, roles: ['super_admin', 'superadmin_admin', 'admin'] },
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
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        const isSuperadminTeam = user?.role === 'super_admin' ||
            user?.role === 'superadmin_admin' ||
            user?.role === 'superadmin_staff';
        const redirectTo = isSuperadminTeam ? '/army' : '/login';
        logout();
        navigate(redirectTo);
    };

    const filteredNav = navItems.filter((item) => {
        if (item.show) return item.show(user);
        return !item.roles || item.roles.includes(user?.role);
    });

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:sticky top-0 h-screen inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Logo */}
                <div
                    className="px-6 border-b border-slate-800"
                    style={{
                        paddingTop: config?.sidebar_padding_vertical ? `${config.sidebar_padding_vertical}px` : '1.5rem',
                        paddingBottom: config?.sidebar_padding_vertical ? `${config.sidebar_padding_vertical}px` : '1.5rem'
                    }}
                >
                    <div className="flex items-center gap-3">
                        {config?.sidebar_logo_link ? (
                            <a href={config.sidebar_logo_link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                {(config?.sidebar_logo_url || config?.app_logo) ? (
                                    <img
                                        src={config.sidebar_logo_url || config.app_logo}
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
                                {(config?.sidebar_logo_url || config?.app_logo) ? (
                                    <img
                                        src={config.sidebar_logo_url || config.app_logo}
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
                                <h1 className="text-lg font-bold text-white">{config?.sidebar_text_content || 'MagnetCRM'}</h1>
                                <p className="text-xs text-slate-400">Marketing Agency CRM</p>
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
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User info + logout */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center">
                            <span className="text-sm font-semibold text-indigo-400">
                                {user?.email?.[0]?.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-slate-400">{getRoleLabel(user?.role)}</p>
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
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* Top bar */}
                <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-4 lg:px-6 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden mr-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
                        <span className="px-2.5 py-1 text-xs font-medium bg-indigo-600/20 text-indigo-400 rounded-full">
                            {getRoleLabel(user?.role)}
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
