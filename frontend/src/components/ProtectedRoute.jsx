import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../context/ModuleContext';

export default function ProtectedRoute({ children, roles, module: requiredModule }) {
    const { user, loading: authLoading } = useAuth();
    const { hasModule, loading: modulesLoading } = useModules();

    if (authLoading || modulesLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        // Detect if user was previously a superadmin team member from localStorage
        const savedUser = JSON.parse(localStorage.getItem('magnetcrm_user') || '{}');
        const isSuperadminTeam = savedUser?.role === 'super_admin' ||
                                savedUser?.role === 'superadmin_admin' ||
                                savedUser?.role === 'superadmin_staff';
        const redirectTo = isSuperadminTeam ? '/army' : '/login';
        return <Navigate to={redirectTo} replace />;
    }

    // If specific roles are required, check them
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // If a module is required, check it's active
    if (requiredModule && !hasModule(requiredModule)) {
        return <Navigate to="/" replace />;
    }

    // If user's subscription is past due and they are trying to access restricted routes, redirect to subscription page
    if (user.subscriptionStatus === 'past_due') {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const allowedPaths = ['/billing', '/plans', '/settings'];
        const isCheckoutPath = currentPath.startsWith('/checkout');
        const isSettingsBilling = currentPath === '/settings' && currentSearch.includes('tab=billing');
        
        if (!allowedPaths.includes(currentPath) && !isCheckoutPath && !isSettingsBilling) {
            // Allow super admin team to bypass this
            const isSuperadminTeam = ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(user.role);
            if (!isSuperadminTeam) {
                return <Navigate to="/settings?tab=billing" replace />;
            }
        }
    }

    return children;
}

