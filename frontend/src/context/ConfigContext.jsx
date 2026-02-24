import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ConfigContext = createContext(null);

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/settings/public');
            setConfig(res.data || {});
        } catch (err) {
            console.error('Failed to load config:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = (key, value) => {
        setConfig(prev => ({
            ...prev,
            [key]: value
        }));
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>;
    }

    return (
        <ConfigContext.Provider value={{ config, updateConfig, refreshConfig: fetchConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};
