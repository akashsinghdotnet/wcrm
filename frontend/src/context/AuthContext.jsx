import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useConfig } from './ConfigContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('wcrm_token'));
    const [loading, setLoading] = useState(true);
    const { config } = useConfig() || {};
    const isSelfHosted = config?.deployment_mode === 'self_hosted';

    const isSuperAdminUser = (u) => {
        if (!u) return false;
        return ['super_admin', 'superadmin_admin', 'superadmin_staff'].includes(u.role) || (!u.companyId && u.role === 'admin');
    };

    const logout = () => {
        localStorage.removeItem('wcrm_token');
        localStorage.removeItem('wcrm_user');
        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        if (isSelfHosted && user && isSuperAdminUser(user)) {
            logout();
        }
    }, [isSelfHosted, user]);

    useEffect(() => {
        if (token) {
            // Verify token is still valid by fetching the user profile
            api.get('/auth/me')
                .then((res) => {
                    // /auth/me returns { userId, email, role, companyId }
                    const meData = res.data;
                    const savedUser = JSON.parse(localStorage.getItem('wcrm_user') || '{}');
                    const resolvedUser = {
                        ...savedUser,
                        ...meData,
                        id: meData.userId || meData.id || savedUser.id,
                    };

                    if (isSelfHosted && isSuperAdminUser(resolvedUser)) {
                        logout();
                        setLoading(false);
                        return;
                    }

                    setUser(resolvedUser);
                    setLoading(false);
                })
                .catch(() => {
                    // Token invalid — clear everything
                    logout();
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token, isSelfHosted]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        // If 2FA is required, return the response without storing token
        if (res.data.requires2FA) {
            return res.data; // { requires2FA: true, userId }
        }
        const { access_token, user: userData } = res.data;
        if (isSelfHosted && isSuperAdminUser(userData)) {
            logout();
            throw new Error('Super-Admin portal and accounts are disabled in Community Edition.');
        }
        localStorage.setItem('wcrm_token', access_token);
        localStorage.setItem('wcrm_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return userData;
    };

    const verify2FA = async (userId, token) => {
        const res = await api.post('/auth/login/verify-2fa', { userId, token });
        const { access_token, user: userData } = res.data;
        if (isSelfHosted && isSuperAdminUser(userData)) {
            logout();
            throw new Error('Super-Admin portal and accounts are disabled in Community Edition.');
        }
        localStorage.setItem('wcrm_token', access_token);
        localStorage.setItem('wcrm_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return userData;
    };

    return (
        <AuthContext.Provider value={{ user, token, login, verify2FA, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
