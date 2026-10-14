import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModules } from '../context/ModuleContext';

export default function ProtectedRoute({ children, roles, module: requiredModule }) {
    const { user, loading: authLoading } = useAuth();
    const { hasModule, loading: modulesLoading } = useModules();

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (modulesLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // If specific roles are required, check them
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // If a module is required, check it's active
    if (requiredModule && !hasModule(requiredModule)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
