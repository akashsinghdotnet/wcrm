import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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

    return children;
}
