import { useState, useEffect } from 'react';
import { useModules, MODULE_DEFINITIONS } from '../context/ModuleContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    Kanban, Receipt, Mail, MessageCircle, Phone, Ticket, BarChart3,
    Blocks, Check, X, Loader2, ShieldCheck, Calendar, Hotel
} from 'lucide-react';

const iconMap = {
    Kanban, Receipt, Mail, MessageCircle, Phone, Ticket, BarChart3, Calendar, Hotel
};

export default function ModuleSettingsPage() {
    const { activeModules, setActiveModules } = useModules();
    const [localModules, setLocalModules] = useState([]);
    const [saving, setSaving] = useState(false);
    // Only show modules the company's plan grants access to (fetched from API)
    const [planModules, setPlanModules] = useState([]);
    const [allModules, setAllModules] = useState([]);

    useEffect(() => {
        setLocalModules([...activeModules]);
    }, [activeModules]);

    useEffect(() => {
        api.get('/modules')
            .then(res => {
                // planModules = the keys the company's plan grants (from the server)
                const allowed = res.data.planModules || res.data.activeModules || res.data.allModules?.map(m => m.key) || [];
                setPlanModules(allowed);
                // Build displayable module definitions, filtered to plan-allowed only
                const filtered = MODULE_DEFINITIONS.filter(d => allowed.includes(d.key));
                setAllModules(filtered.length > 0 ? filtered : MODULE_DEFINITIONS);
            })
            .catch(() => {
                // Fallback: show only currently active modules
                setAllModules(MODULE_DEFINITIONS.filter(d => activeModules.includes(d.key)));
            });
    }, [activeModules]);

    const toggleModule = (key) => {
        setLocalModules(prev =>
            prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.patch('/modules', { activeModules: localModules });
            setActiveModules(res.data.activeModules);
            toast.success('Modules updated successfully!');
        } catch (err) {
            toast.error('Failed to update modules');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify([...localModules].sort()) !== JSON.stringify([...activeModules].sort());

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Blocks className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Manager</h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Activate or deactivate CRM modules for your company
                        </p>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    Only activated modules will be visible in the sidebar and accessible by your team. You can enable or disable modules anytime without losing any data.
                </p>
            </div>

            {/* Module Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allModules.map((mod) => {
                    const isActive = localModules.includes(mod.key);
                    const IconComponent = iconMap[mod.icon] || Blocks;
                    
                    return (
                        <button
                            key={mod.key}
                            onClick={() => toggleModule(mod.key)}
                            className={`group relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                                isActive
                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-gray-300 dark:hover:border-slate-600'
                            }`}
                        >
                            {/* Active indicator */}
                            <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                                isActive
                                    ? 'bg-indigo-500 text-white scale-100'
                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 scale-90'
                            }`}>
                                {isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </div>

                            {/* Icon */}
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center mb-3 shadow-md transition-transform duration-300 group-hover:scale-110`}>
                                <IconComponent className="w-5 h-5 text-white" />
                            </div>

                            {/* Text */}
                            <h3 className={`font-semibold text-sm mb-1 ${
                                isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-400'
                            }`}>
                                {mod.label}
                            </h3>
                            <p className={`text-xs leading-relaxed ${
                                isActive ? 'text-gray-500 dark:text-slate-400' : 'text-gray-400 dark:text-slate-500'
                            }`}>
                                {mod.description}
                            </p>

                            {/* Status tag */}
                            <div className={`mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isActive
                                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-500'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400 dark:bg-slate-500'}`} />
                                {isActive ? 'Active' : 'Inactive'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Save Button */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-2xl shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-70"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
}
