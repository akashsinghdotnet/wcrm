import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ModuleContext = createContext(null);

// All available module definitions
export const MODULE_DEFINITIONS = [
    { key: 'SALES', label: 'Sales & Pipeline', description: 'Leads management, pipeline view, and client tracking', icon: 'Kanban', color: 'from-blue-500 to-cyan-500' },
    { key: 'FINANCE', label: 'Finance & Invoicing', description: 'Create invoices, manage billing, and track payments', icon: 'Receipt', color: 'from-emerald-500 to-green-500' },
    { key: 'MARKETING', label: 'Marketing', description: 'Email campaigns, marketing automation, and outreach', icon: 'Mail', color: 'from-purple-500 to-pink-500' },
    { key: 'WHATSAPP', label: 'WhatsApp', description: 'WhatsApp messaging, chats, and broadcast campaigns', icon: 'MessageCircle', color: 'from-green-500 to-emerald-500' },
    { key: 'CALLING', label: 'Calling', description: 'Phone calling integration with Twilio', icon: 'Phone', color: 'from-orange-500 to-amber-500' },
    { key: 'REPORTS', label: 'Reports & Analytics', description: 'Advanced reports, dashboards, and analytics', icon: 'BarChart3', color: 'from-indigo-500 to-violet-500' },
    { key: 'APPOINTMENTS', label: 'Appointments & Booking', description: 'Calendar integration, meeting types, and public booking pages', icon: 'Calendar', color: 'from-sky-500 to-cyan-500' },
    { key: 'EVENTS', label: 'Event Booking', description: 'Create and manage events, ticket types, and public booking pages with payment collection', icon: 'CalendarDays', color: 'from-violet-500 to-purple-500' },
];

export function ModuleProvider({ children }) {
    const { user, loading: authLoading } = useAuth();
    const [activeModules, setActiveModules] = useState([]);
    const [modulesReady, setModulesReady] = useState(false);

    useEffect(() => {
        if (!user) {
            // Auth hasn't resolved yet — keep loading
            setModulesReady(false);
            return;
        }
        if (user.activeModules) {
            setActiveModules(user.activeModules);
            setModulesReady(true);
        } else {
            // Fallback: fetch from API
            setModulesReady(false);
            api.get('/modules')
                .then(res => setActiveModules(res.data.activeModules || []))
                .catch(() => setActiveModules(MODULE_DEFINITIONS.map(m => m.key)))
                .finally(() => setModulesReady(true));
        }
    }, [user]);

    // Loading until both auth and modules are resolved
    const loading = authLoading || !modulesReady;

    const hasModule = useCallback((moduleKey) => {
        // No user yet — don't show anything
        if (!user) return false;
        // Super admin always has all modules (they have a role but no companyId)
        if (user.role && !user.companyId) return true;
        return activeModules.includes(moduleKey);
    }, [activeModules, user]);

    const refreshModules = useCallback(async () => {
        try {
            const res = await api.get('/modules');
            setActiveModules(res.data.activeModules || []);
        } catch {}
    }, []);

    return (
        <ModuleContext.Provider value={{ activeModules, setActiveModules, hasModule, refreshModules, loading }}>
            {children}
        </ModuleContext.Provider>
    );
}

export function useModules() {
    const context = useContext(ModuleContext);
    if (!context) {
        throw new Error('useModules must be used within a ModuleProvider');
    }
    return context;
}
