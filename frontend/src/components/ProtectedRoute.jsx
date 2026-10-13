import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../context/ModuleContext';
import { useConfig } from '../context/ConfigContext';

export default function ProtectedRoute({ children, roles, module: requiredModule }) {
    const { user, loading: authLoading } = useAuth();
    const { hasModule, loading: modulesLoading } = useModules();
    const { config } = useConfig();
    const isSelfHosted = config?.deployment_mode === 'self_hosted';

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        // Detect if user was previously a superadmin team member from localStorage
        const savedUser = JSON.parse(localStorage.getItem('wcrm_user') || '{}');
        const isSuperadminTeam = !isSelfHosted && (
            savedUser?.role === 'super_admin' ||
            savedUser?.role === 'superadmin_admin' ||
            savedUser?.role === 'superadmin_staff'
        );
        const redirectTo = isSuperadminTeam ? '/army' : '/login';
        return <Navigate to={redirectTo} replace />;
    }

    if (modulesLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // In Self-Hosted / Community Edition, block Super-Admin SaaS management routes completely
    const isSuperadminOnlyRoute = roles && roles.every(r => ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(r));
    if (isSelfHosted && isSuperadminOnlyRoute) {
        return <Navigate to="/" replace />;
    }

    // If specific roles are required, check them (allow super admin team in cloud mode)
    const isSuperadminTeam = !isSelfHosted && ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user.role);
    if (roles && !roles.includes(user.role) && !isSuperadminTeam) {
        return <Navigate to="/" replace />;
    }

    // If a module is required, check it's active (always active in self-hosted mode)
    if (!isSelfHosted && requiredModule && !hasModule(requiredModule)) {
        return <Navigate to="/" replace />;
    }

    // If user's subscription is past due and they are trying to access restricted routes (Cloud mode only)
    if (!isSelfHosted && user.subscriptionStatus === 'past_due') {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const allowedPaths = ['/billing', '/plans', '/settings'];
        const isCheckoutPath = currentPath.startsWith('/checkout');
        const isSettingsBilling = currentPath === '/settings' && currentSearch.includes('tab=billing');
        
        if (!allowedPaths.includes(currentPath) && !isCheckoutPath && !isSettingsBilling) {
            if (!isSuperadminTeam) {
                return <Navigate to="/settings?tab=billing" replace />;
            }
        }
    }

    return children;
}

