import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useConfig } from './ConfigContext';
import api from '../services/api';

const ModuleContext = createContext(null);

// All available module definitions
export const MODULE_DEFINITIONS = [
    { key: 'WHATSAPP', label: 'WhatsApp CRM & Broadcasts', description: 'WhatsApp team inbox, live chats, and scheduled campaigns', icon: 'MessageCircle', color: 'from-green-500 to-emerald-500' },
    { key: 'SALES', label: 'Sales & Deal Pipeline', description: 'Leads management, pipeline view, and deal tracking', icon: 'Kanban', color: 'from-blue-500 to-cyan-500' },
    { key: 'AUTOMATIONS', label: 'AI Agents & Automations', description: 'Automated 24/7 AI agents and visual flowchart triggers', icon: 'Bot', color: 'from-purple-500 to-pink-500' },
    { key: 'CALLING', label: 'Phone Calling (Twilio)', description: 'Phone calling integration with Twilio', icon: 'Phone', color: 'from-orange-500 to-amber-500' },
    { key: 'REPORTS', label: 'Reports & Analytics', description: 'Advanced reports, dashboards, and analytics', icon: 'BarChart3', color: 'from-indigo-500 to-violet-500' },
];

export function ModuleProvider({ children }) {
    const { user, loading: authLoading } = useAuth();
    const { config } = useConfig();
    const isSelfHosted = config?.deployment_mode === 'self_hosted';
    const [activeModules, setActiveModules] = useState([]);
    const [modulesReady, setModulesReady] = useState(false);

    useEffect(() => {
        if (!user) {
            // Auth hasn't resolved yet — keep loading
            setModulesReady(false);
            return;
        }
        if (isSelfHosted) {
            setActiveModules(MODULE_DEFINITIONS.map(m => m.key));
            setModulesReady(true);
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
    }, [user, isSelfHosted]);

    // Loading until both auth and modules are resolved (modules only matter if user is logged in)
    const loading = authLoading || (Boolean(user) && !modulesReady);

    const hasModule = useCallback((moduleKey) => {
        // No user yet — don't show anything
        if (!user) return false;
        // In self_hosted mode, all CRM modules are unlocked 100%
        if (isSelfHosted) return true;
        // Super admin always has all modules (they have a role but no companyId)
        if (user.role && !user.companyId) return true;
        return activeModules.includes(moduleKey);
    }, [activeModules, user, isSelfHosted]);

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
