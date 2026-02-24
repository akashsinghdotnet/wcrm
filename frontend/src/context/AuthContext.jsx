import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('magnetcrm_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Verify token is still valid by fetching the user profile
            api.get('/auth/me')
                .then((res) => {
                    // /auth/me returns { userId, email, role, companyId }
                    const meData = res.data;
                    const savedUser = JSON.parse(localStorage.getItem('magnetcrm_user') || '{}');
                    setUser({
                        ...savedUser,
                        ...meData,
                        id: meData.userId || meData.id || savedUser.id,
                    });
                    setLoading(false);
                })
                .catch(() => {
                    // Token invalid — clear everything
                    localStorage.removeItem('magnetcrm_token');
                    localStorage.removeItem('magnetcrm_user');
                    setToken(null);
                    setUser(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = res.data;
        localStorage.setItem('magnetcrm_token', access_token);
        localStorage.setItem('magnetcrm_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('magnetcrm_token');
        localStorage.removeItem('magnetcrm_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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
