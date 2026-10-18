import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
    Zap, Plus, Play, Pause, Trash2, Edit3, Clock, 
    ArrowRight, MessageSquare, CheckCircle2, AlertCircle, 
    Sparkles, Filter, ChevronRight, X, Save, Check, RefreshCw, 
    Eye, Split, UserCheck, Tag, Globe, Search, Activity, 
    Terminal, ArrowDown, GitFork, CornerDownRight, Copy,
    ExternalLink, Smartphone, Link as LinkIcon
} from 'lucide-react';

// Triggers available in WhatsApp CRM
const TRIGGER_DEFINITIONS = [
    {
        id: 'first_inbound',
        name: 'First Inbound Message',
        category: 'Inbound',
        description: 'Triggers when a new customer messages your WhatsApp business number for the first time.',
        badge: 'New Lead'
    },
    {
        id: 'keyword_match',
        name: 'Keyword Match',
        category: 'Keywords',
        description: 'Triggers when customer message matches specific words (e.g. HI, PRICE, DEMO, MENU).',
        badge: 'Keyword'
    },
    {
        id: 'every_inbound',
        name: 'Every Inbound Message',
        category: 'Inbound',
        description: 'Triggers on every incoming message received on WhatsApp.',
        badge: 'All Chats'
    }
];

const PRESET_TEMPLATES = [
    {
        id: 'tpl-welcome-buttons',
        name: '🚀 Instant Lead Welcome & Quick Buttons',
        description: 'Greets first-time inbound contacts, introduces your brand, and presents interactive quick-reply buttons.',
        trigger: 'first_inbound',
        triggerLabel: 'First Inbound Message',
        triggerConfig: {},
        steps: [
            { 
                id: 's1', 
                type: 'message', 
                content: 'Hi {{name}}! 👋 Welcome to Wcrm. How can our team assist you today?' 
            },
            {
                id: 's2',
                type: 'buttons',
                headerText: 'Menu Options',
                content: 'Tap an option below to get started:',
                footerText: 'Select an option',
                buttons: [
                    { id: 'b1', label: '💰 Pricing & Plans' },
                    { id: 'b2', label: '📅 Book a Live Demo' },
                    { id: 'b3', label: '👤 Talk to an Agent' }
                ]
            }
        ]
    },
    {
        id: 'tpl-pricing-link',
        name: '💰 Keyword Price & Booking Portal Link',
        description: 'Detects pricing inquiries (PRICE, DEMO, COST) and immediately sends your brochure or booking link.',
        trigger: 'keyword_match',
        triggerLabel: 'Keyword matches: "PRICE, DEMO, COST"',
        triggerConfig: { keywords: 'PRICE, DEMO, COST, PLANS, QUOTE' },
        steps: [
            { 
                id: 's1', 
                type: 'message', 
                content: 'Hello {{name}}! Here is our current pricing overview and plan breakdown.' 
            },
            {
                id: 's2',
                type: 'link',
                content: 'Explore all features and select a plan that fits your business:',
                url: 'https://wcrm.si',
                buttonLabel: 'View Pricing & Plans ↗'
            },
            {
                id: 's3',
                type: 'tag',
                tagName: 'Pricing Inquiry'
            }
        ]
    },
    {
        id: 'tpl-agent-routing',
        name: '👤 Support & Agent Hand-off',
        description: 'Recognizes urgent support keywords (HELP, SUPPORT, AGENT) and routes to team specialists.',
        trigger: 'keyword_match',
        triggerLabel: 'Keyword matches: "HELP, SUPPORT, AGENT"',
        triggerConfig: { keywords: 'HELP, SUPPORT, AGENT, HUMAN, PROBLEM' },
        steps: [
            {
                id: 's1',
                type: 'message',
                content: 'We understand you need assistance! Connecting you immediately with our live support desk.'
            },
            {
                id: 's2',
                type: 'assign',
                agentName: 'Support Desk'
            },
            {
                id: 's3',
                type: 'tag',
                tagName: 'Support Request'
            }
        ]
    }
];

export default function AutomationsPage() {
    const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' | 'logs'
    const [automations, setAutomations] = useState([]);
    const [executionLogs, setExecutionLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Builder Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [trigger, setTrigger] = useState('first_inbound');
    const [keywordInput, setKeywordInput] = useState('PRICE, DEMO');
    const [steps, setSteps] = useState([
        { id: 'node-1', type: 'message', content: 'Hi {{name}}! Welcome to our WhatsApp service.' }
    ]);

    // Test Simulation Modal State
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [simulatingAuto, setSimulatingAuto] = useState(null);
    const [simulationState, setSimulationState] = useState({ running: false, completed: false, stepsDone: [] });

    // Selected Log detail drawer
    const [selectedLog, setSelectedLog] = useState(null);
    const [logFilter, setLogFilter] = useState('all'); // 'all' | 'success' | 'skipped' | 'failed'
    const [logSearch, setLogSearch] = useState('');

    // Fetch automations from server on mount
    useEffect(() => {
        let isMounted = true;
        const fetchAutomations = async () => {
            setIsLoading(true);
            try {
                const res = await api.get('/whatsapp/automations');
                if (isMounted && res.data && Array.isArray(res.data)) {
                    setAutomations(res.data);
                }
            } catch (err) {
                console.warn('Could not load automations from server:', err);
                const saved = localStorage.getItem('wcrm_automations_v2');
                if (saved) {
                    try { setAutomations(JSON.parse(saved)); } catch (e) {}
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchAutomations();
        return () => { isMounted = false; };
    }, []);

    // Sync helper to server and localStorage
    const syncWithServer = async (updatedList) => {
        localStorage.setItem('wcrm_automations_v2', JSON.stringify(updatedList));
        try {
            await api.post('/whatsapp/automations', { automations: updatedList });
        } catch (err) {
            console.error('Failed to sync automations to server:', err);
        }
    };

    const toggleStatus = async (id) => {
        const updated = automations.map(a => {
            if (a.id === id) {
                const nextStatus = a.status === 'active' ? 'inactive' : 'active';
                toast.success(`Automation "${a.name}" is now ${nextStatus}`);
                return { ...a, status: nextStatus };
            }
            return a;
        });
        setAutomations(updated);
        await syncWithServer(updated);
    };

    const deleteAutomation = async (id) => {
        if (!confirm('Are you sure you want to delete this automation workflow?')) return;
        const updated = automations.filter(a => a.id !== id);
        setAutomations(updated);
        await syncWithServer(updated);
        toast.success('Automation deleted');
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setDescription('');
        setTrigger('first_inbound');
        setKeywordInput('');
        setSteps([
            { id: 'node-1', type: 'message', content: 'Hi {{name}}! Welcome to our WhatsApp service.' }
        ]);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name);
        setDescription(item.description || '');
        setTrigger(item.trigger);
        setKeywordInput(item.triggerConfig?.keywords || item.keywords || '');
        setSteps(JSON.parse(JSON.stringify(item.steps || [])));
        setModalOpen(true);
    };

    const loadTemplate = (tpl) => {
        setName(tpl.name.replace(/^[^\w\s]+/, '').trim());
        setDescription(tpl.description);
        setTrigger(tpl.trigger);
        setKeywordInput(tpl.triggerConfig?.keywords || '');
        setSteps(JSON.parse(JSON.stringify(tpl.steps)));
        setTemplatesModalOpen(false);
        setModalOpen(true);
        toast.success(`Template loaded: ${tpl.name}`);
    };

    // Step Manipulation Functions
    const createEmptyStep = (type) => {
        const id = 'node-' + Math.random().toString(36).substr(2, 7);
        switch (type) {
            case 'message':
                return { id, type: 'message', content: 'Hi {{name}}! How can we assist you today?' };
            case 'link':
                return { 
                    id, 
                    type: 'link', 
                    content: 'Check out our services and details here:', 
                    url: 'https://wcrm.si', 
                    buttonLabel: 'Visit Website ↗' 
                };
            case 'template':
                return { 
                    id, 
                    type: 'template', 
                    templateName: 'welcome_lead', 
                    languageCode: 'en_US', 
                    content: 'Welcome to our service!' 
                };
            case 'buttons':
                return { 
                    id, 
                    type: 'buttons', 
                    headerText: 'Menu Options', 
                    content: 'Please choose an option to continue:', 
                    footerText: 'Select an option below',
                    buttons: [
                        { id: 'b1', label: '💰 Pricing & Plans' },
                        { id: 'b2', label: '📅 Book a Demo' },
                        { id: 'b3', label: '👤 Talk to Agent' }
                    ] 
                };
            case 'tag':
                return { id, type: 'tag', tagName: 'New Lead' };
            case 'assign':
                return { id, type: 'assign', agentName: 'Sales Team' };
            default:
                return { id, type: 'message', content: '' };
        }
    };

    const addRootStep = (type) => {
        const newStep = createEmptyStep(type);
        setSteps(prev => [...prev, newStep]);
    };

    const removeRootStep = (index) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
    };

    const updateRootStep = (index, updated) => {
        setSteps(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updated };
            return next;
        });
    };

    const handleSaveAutomation = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter an automation title');
            return;
        }

        const triggerDef = TRIGGER_DEFINITIONS.find(t => t.id === trigger);
        const triggerLabel = trigger === 'keyword_match' 
            ? `Keyword matches: "${keywordInput || 'PRICE'}"` 
            : triggerDef?.name || trigger;

        const automationData = {
            id: editingItem ? editingItem.id : 'auto-' + Date.now(),
            name,
            description,
            trigger,
            triggerLabel,
            triggerConfig: trigger === 'keyword_match' ? { keywords: keywordInput } : {},
            status: editingItem ? editingItem.status : 'active',
            executedCount: editingItem ? editingItem.executedCount : 0,
            lastRunAt: editingItem ? editingItem.lastRunAt : 'Never',
            steps
        };

        const updated = editingItem
            ? automations.map(a => a.id === editingItem.id ? automationData : a)
            : [automationData, ...automations];

        setAutomations(updated);
        await syncWithServer(updated);
        setModalOpen(false);
        toast.success(editingItem ? 'Automation updated and deployed live!' : 'New automation created and deployed live!');
    };

    const runTestSimulation = (auto) => {
        setSimulatingAuto(auto);
        setSimulationState({ running: true, completed: false, stepsDone: [] });
        setTestModalOpen(true);

        const execSteps = auto.steps || [];
        let cur = 0;

        const timer = setInterval(() => {
            if (cur < execSteps.length) {
                const s = execSteps[cur];
                const stepTitle = s.type === 'message'
                    ? `💬 Sent Message: "${(s.content || '').slice(0, 35)}..."`
                    : s.type === 'link'
                    ? `🔗 Sent Link: ${s.url}`
                    : s.type === 'buttons'
                    ? `🔘 Sent Quick Buttons (${s.buttons?.length || 0} options)`
                    : s.type === 'template'
                    ? `📄 Sent Template: "${s.templateName}"`
                    : s.type === 'tag'
                    ? `🏷️ Attached Tag: "${s.tagName}"`
                    : s.type === 'assign'
                    ? `👤 Assigned to: "${s.agentName}"`
                    : `Executed: ${s.type}`;

                setSimulationState(prev => ({
                    ...prev,
                    stepsDone: [...prev.stepsDone, { title: stepTitle, timestamp: 'Just now' }]
                }));
                cur++;
            } else {
                clearInterval(timer);
                setSimulationState(prev => ({ ...prev, running: false, completed: true }));
            }
        }, 600);
    };

    const filteredLogs = useMemo(() => {
        return executionLogs.filter(log => {
            const matchesFilter = logFilter === 'all' || log.status === logFilter;
            const matchesSearch = !logSearch 
                || log.automationName?.toLowerCase().includes(logSearch.toLowerCase())
                || log.contactName?.toLowerCase().includes(logSearch.toLowerCase())
                || log.contactPhone?.includes(logSearch);
            return matchesFilter && matchesSearch;
        });
    }, [executionLogs, logFilter, logSearch]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white tracking-tight">WhatsApp Automations</h1>
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                Real-Time Engine
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Build sequential multi-step node workflows: trigger on inbound messages or keywords, then send messages, links, templates, and buttons.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setTemplatesModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Templates
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Automation
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'workflows'
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Active Automations
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-white/10">
                            {automations.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                            activeTab === 'logs'
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Execution Logs
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-white/10">
                            {executionLogs.length}
                        </span>
                    </button>
                </div>

                <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Webhook Engine: <strong className="text-slate-200">Active</strong>
                </div>
            </div>

            {/* TAB 1: AUTOMATIONS LIST */}
            {activeTab === 'workflows' && (
                <div className="space-y-4">
                    {automations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
                                <Zap className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-white mb-1.5">No WhatsApp Automations Configured Yet</h3>
                            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                                Create an automated workflow to reply to new leads, match keywords (e.g. PRICE, MENU, DEMO), send links, templates, and interactive buttons.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={openCreateModal}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Automation
                                </button>
                                <button
                                    onClick={() => setTemplatesModalOpen(true)}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition-all flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                    Explore Templates
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {automations.map((auto) => {
                                const isAutoActive = auto.status === 'active';
                                const triggerDef = TRIGGER_DEFINITIONS.find(t => t.id === auto.trigger);

                                return (
                                    <div
                                        key={auto.id}
                                        className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                                            isAutoActive
                                                ? 'bg-slate-900/80 border-emerald-500/30 shadow-lg shadow-emerald-950/20 hover:border-emerald-500/50'
                                                : 'bg-slate-900/40 border-white/5 opacity-75 hover:opacity-100'
                                        }`}
                                    >
                                        <div>
                                            {/* Header Row */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`p-2 rounded-lg ${
                                                        isAutoActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                                                    }`}>
                                                        <Zap className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-white text-sm leading-snug">
                                                            {auto.name}
                                                        </h3>
                                                        <span className="text-[11px] text-slate-400 font-mono">
                                                            {auto.id}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Status Switch */}
                                                <button
                                                    onClick={() => toggleStatus(auto.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                                                        isAutoActive
                                                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                            : 'bg-slate-800 text-slate-400 border-white/10'
                                                    }`}
                                                >
                                                    {isAutoActive ? (
                                                        <>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                            Active
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                            Paused
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                                                {auto.description || 'No description provided.'}
                                            </p>

                                            {/* Trigger Badge */}
                                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 mb-3">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 flex items-center gap-1.5">
                                                    <Terminal className="w-3 h-3 text-emerald-400" />
                                                    Trigger Event
                                                </div>
                                                <div className="text-xs text-emerald-300 font-medium truncate">
                                                    {auto.triggerLabel || triggerDef?.name || auto.trigger}
                                                </div>
                                            </div>

                                            {/* Action Sequence Preview */}
                                            <div className="space-y-1 mb-4">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between mb-1">
                                                    <span>Action Chain</span>
                                                    <span className="text-slate-400">{auto.steps?.length || 0} nodes</span>
                                                </div>
                                                {(auto.steps || []).slice(0, 3).map((st, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-lg">
                                                        {st.type === 'message' && <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                                                        {st.type === 'link' && <Globe className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                                                        {st.type === 'buttons' && <GitFork className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                                                        {st.type === 'template' && <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                                        {st.type === 'tag' && <Tag className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                                                        {st.type === 'assign' && <UserCheck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                                                        
                                                        <span className="truncate flex-1">
                                                            {st.type === 'message' && (st.content ? `"${st.content}"` : 'Send Message')}
                                                            {st.type === 'link' && `Send Link: ${st.url || 'URL'}`}
                                                            {st.type === 'buttons' && `Interactive Buttons (${st.buttons?.length || 0} options)`}
                                                            {st.type === 'template' && `Template: ${st.templateName || 'Meta Template'}`}
                                                            {st.type === 'tag' && `Tag: ${st.tagName || 'Lead'}`}
                                                            {st.type === 'assign' && `Assign: ${st.agentName || 'Agent'}`}
                                                        </span>
                                                    </div>
                                                ))}
                                                {(auto.steps?.length || 0) > 3 && (
                                                    <div className="text-[11px] text-slate-400 pl-2">
                                                        + {auto.steps.length - 3} more actions...
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer Stats & Actions */}
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                                            <div className="text-[11px] text-slate-400">
                                                <span className="text-emerald-400 font-semibold">{auto.executedCount || 0}</span> runs
                                                <span className="mx-1.5">•</span>
                                                {auto.lastRunAt || 'Never'}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => runTestSimulation(auto)}
                                                    title="Simulate Workflow"
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs flex items-center gap-1 px-2 font-medium"
                                                >
                                                    <Play className="w-3 h-3 fill-current" />
                                                    <span>Test</span>
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(auto)}
                                                    title="Edit Automation"
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteAutomation(auto.id)}
                                                    title="Delete Automation"
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: EXECUTION LOGS */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by phone, contact, or automation..."
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            {['all', 'success', 'skipped'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setLogFilter(f)}
                                    className={`px-3 py-1 text-xs rounded-lg capitalize font-medium transition-all ${
                                        logFilter === f
                                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                                    }`}
                                >
                                    {f === 'all' ? 'All Logs' : f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 rounded-xl border border-white/10 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950/70 text-slate-400 border-b border-white/10 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Automation</th>
                                        <th className="py-3 px-4">Trigger</th>
                                        <th className="py-3 px-4">Contact</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Runtime</th>
                                        <th className="py-3 px-4">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-500">
                                                No execution logs yet. Logs will record automatically when incoming WhatsApp messages trigger automations.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 px-4 font-medium text-white">{log.automationName}</td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
                                                        {log.trigger}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-medium">{log.contactPhone || log.contactName}</td>
                                                <td className="py-3 px-4 text-emerald-400 font-medium">Delivered</td>
                                                <td className="py-3 px-4 font-mono text-slate-400">{log.durationMs || 45}ms</td>
                                                <td className="py-3 px-4 text-slate-400">{log.timestamp || 'Just now'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TEMPLATES LIBRARY MODAL */}
            {templatesModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <h3 className="font-bold text-white text-base">WhatsApp Automation Templates</h3>
                                    <p className="text-xs text-slate-400">Pre-built multi-step workflows ready to deploy.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTemplatesModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {PRESET_TEMPLATES.map((tpl) => (
                                <div
                                    key={tpl.id}
                                    className="p-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <h4 className="font-semibold text-white text-sm">
                                                {tpl.name}
                                            </h4>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {tpl.trigger}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                                            {tpl.description}
                                        </p>
                                        <div className="text-[11px] text-slate-300 font-mono">
                                            Contains {tpl.steps.length} sequential action nodes
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => loadTemplate(tpl)}
                                        className="py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        Use Template
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE SIMULATOR MODAL */}
            {testModalOpen && simulatingAuto && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Play className="w-5 h-5 text-emerald-400 fill-current" />
                                <div>
                                    <h3 className="font-bold text-white text-sm">Testing Automation Execution</h3>
                                    <p className="text-xs text-slate-400">{simulatingAuto.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTestModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-3 bg-black/50 rounded-xl border border-white/5 space-y-1.5 font-mono text-xs">
                            <div className="text-emerald-400 flex items-center gap-2 font-semibold">
                                <Terminal className="w-3.5 h-3.5" />
                                <span>[WHATSAPP MESSAGE INBOUND RECEIVED]</span>
                            </div>
                            <div className="text-slate-300">
                                Contact: +1 (555) 019-9281
                            </div>
                            <div className="text-slate-300">
                                Matched Trigger: {simulatingAuto.triggerLabel}
                            </div>
                        </div>

                        <div className="space-y-2 min-h-[140px]">
                            {simulationState.stepsDone.map((st, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                    <div className="flex items-center gap-2 text-emerald-300 font-medium">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>{st.title}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono">{st.timestamp}</span>
                                </div>
                            ))}

                            {simulationState.running && (
                                <div className="flex items-center gap-2 p-2.5 text-xs text-slate-400 italic">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                    <span>Executing next sequential action node...</span>
                                </div>
                            )}

                            {simulationState.completed && (
                                <div className="p-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    <span>All workflow nodes executed successfully!</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-white/10">
                            <button
                                onClick={() => setTestModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT NODE WORKFLOW BUILDER MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-5xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/60">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base sm:text-lg">
                                        {editingItem ? 'Edit Automation Workflow' : 'Create Automation Workflow'}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Define your entry trigger point and configure sequential action nodes (send messages, links, templates, and buttons).
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body: Two Column Layout */}
                        <form onSubmit={handleSaveAutomation} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                {/* LEFT COLUMN: Workflow Node Builder */}
                                <div className="lg:col-span-7 space-y-5">
                                    {/* Automation Meta Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                                                Workflow Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Welcome & Product Navigator"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                                                Description (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="What this workflow achieves..."
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    {/* NODE 1: ENTRY TRIGGER POINT */}
                                    <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/40 space-y-3 relative shadow-md">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                                                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono">1</span>
                                                <span>Trigger Point (When This Happens)</span>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Entry Trigger
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {TRIGGER_DEFINITIONS.map(t => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setTrigger(t.id)}
                                                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                                                        trigger === t.id
                                                            ? 'bg-emerald-600/20 border-emerald-500/60 text-white shadow-sm'
                                                            : 'bg-slate-900/60 border-white/5 text-slate-300 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="font-semibold text-xs mb-1 flex items-center justify-between">
                                                        <span>{t.name}</span>
                                                        {trigger === t.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 line-clamp-2">
                                                        {t.description}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>

                                        {trigger === 'keyword_match' && (
                                            <div className="pt-2 border-t border-white/5">
                                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                                    Keywords to match (comma separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="HI, HELLO, PRICE, DEMO, MENU, SUPPORT"
                                                    value={keywordInput}
                                                    onChange={(e) => setKeywordInput(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Matches if the customer message equals or contains any of these words.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Visual Connecting Wire */}
                                    <div className="flex flex-col items-center justify-center py-0.5">
                                        <div className="w-0.5 h-4 bg-gradient-to-b from-emerald-500 to-blue-500"></div>
                                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-0.5 px-3 rounded-full bg-slate-800 border border-white/10 flex items-center gap-1.5 shadow-sm">
                                            <ArrowDown className="w-3 h-3 text-blue-400" />
                                            Then Execute Action Nodes In Sequence
                                        </div>
                                        <div className="w-0.5 h-4 bg-gradient-to-b from-blue-500 to-indigo-500"></div>
                                    </div>

                                    {/* SEQUENTIAL ACTION NODES */}
                                    <div className="space-y-4">
                                        {steps.map((step, idx) => (
                                            <div
                                                key={step.id || idx}
                                                className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-3 relative shadow-md"
                                            >
                                                {/* Node Header Row */}
                                                <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 font-mono text-xs flex items-center justify-center font-bold">
                                                            {idx + 2}
                                                        </span>
                                                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                                                            Action Node #{idx + 1}
                                                        </span>
                                                    </div>

                                                    {/* Node Type Selector Pills */}
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {[
                                                            { type: 'message', label: 'Message', icon: MessageSquare },
                                                            { type: 'link', label: 'Link', icon: Globe },
                                                            { type: 'buttons', label: 'Buttons', icon: GitFork },
                                                            { type: 'template', label: 'Template', icon: Sparkles },
                                                            { type: 'tag', label: 'Tag', icon: Tag },
                                                            { type: 'assign', label: 'Assign', icon: UserCheck }
                                                        ].map(t => (
                                                            <button
                                                                key={t.type}
                                                                type="button"
                                                                onClick={() => updateRootStep(idx, { type: t.type })}
                                                                className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all ${
                                                                    step.type === t.type
                                                                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                                                                        : 'bg-white/5 text-slate-400 hover:text-white'
                                                                }`}
                                                            >
                                                                <t.icon className="w-3 h-3" />
                                                                {t.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {steps.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRootStep(idx)}
                                                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                            title="Delete this node"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Step Configuration: MESSAGE */}
                                                {step.type === 'message' && (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                                            <span>Message Text</span>
                                                            <div className="flex items-center gap-1 text-[10px]">
                                                                <span>Click to insert:</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateRootStep(idx, { content: (step.content || '') + ' {{name}}' })}
                                                                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-mono"
                                                                >
                                                                    {'{{name}}'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateRootStep(idx, { content: (step.content || '') + ' {{phone}}' })}
                                                                    className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-mono"
                                                                >
                                                                    {'{{phone}}'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Enter message text... (e.g. Hi {{name}}! Welcome to our store.)"
                                                            value={step.content || ''}
                                                            onChange={(e) => updateRootStep(idx, { content: e.target.value })}
                                                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                )}

                                                {/* Step Configuration: LINK */}
                                                {step.type === 'link' && (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Message Text</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Check out our website and pricing here:"
                                                                value={step.content || ''}
                                                                onChange={(e) => updateRootStep(idx, { content: e.target.value })}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-teal-500"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Target URL *</label>
                                                                <input
                                                                    type="url"
                                                                    placeholder="https://wcrm.si"
                                                                    value={step.url || ''}
                                                                    onChange={(e) => updateRootStep(idx, { url: e.target.value })}
                                                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white font-mono focus:outline-none focus:border-teal-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Button / Title (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Visit Website ↗"
                                                                    value={step.buttonLabel || ''}
                                                                    onChange={(e) => updateRootStep(idx, { buttonLabel: e.target.value })}
                                                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-teal-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step Configuration: INTERACTIVE QUICK BUTTONS */}
                                                {step.type === 'buttons' && (
                                                    <div className="space-y-2.5">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Header (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Welcome to Wcrm! 🚀"
                                                                    value={step.headerText || ''}
                                                                    onChange={(e) => updateRootStep(idx, { headerText: e.target.value })}
                                                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Footer (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Tap an option below"
                                                                    value={step.footerText || ''}
                                                                    onChange={(e) => updateRootStep(idx, { footerText: e.target.value })}
                                                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Body Text</label>
                                                            <textarea
                                                                rows={2}
                                                                placeholder="Please select what you would like to explore today:"
                                                                value={step.content || ''}
                                                                onChange={(e) => updateRootStep(idx, { content: e.target.value })}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                                                                Quick-Reply Buttons (Up to 3)
                                                            </label>
                                                            <div className="space-y-1.5">
                                                                {(step.buttons || []).map((btn, bIdx) => (
                                                                    <div key={btn.id || bIdx} className="flex items-center gap-2">
                                                                        <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center font-bold">
                                                                            {bIdx + 1}
                                                                        </span>
                                                                        <input
                                                                            type="text"
                                                                            value={btn.label || ''}
                                                                            onChange={(e) => {
                                                                                const newButtons = [...(step.buttons || [])];
                                                                                newButtons[bIdx] = { ...newButtons[bIdx], label: e.target.value };
                                                                                updateRootStep(idx, { buttons: newButtons });
                                                                            }}
                                                                            placeholder={`Option ${bIdx + 1} (e.g. 💰 Pricing)`}
                                                                            className="flex-1 px-3 py-1 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newButtons = (step.buttons || []).filter((_, i) => i !== bIdx);
                                                                                updateRootStep(idx, { buttons: newButtons });
                                                                            }}
                                                                            className="p-1 rounded text-slate-500 hover:text-red-400"
                                                                        >
                                                                            <X className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                                {(step.buttons || []).length < 3 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newButtons = [...(step.buttons || []), { id: `btn-${Date.now()}`, label: 'New Option' }];
                                                                            updateRootStep(idx, { buttons: newButtons });
                                                                        }}
                                                                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 pt-1"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                        Add Button
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step Configuration: TEMPLATE */}
                                                {step.type === 'template' && (
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Meta Template Name *</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="welcome_greeting"
                                                                    value={step.templateName || ''}
                                                                    onChange={(e) => updateRootStep(idx, { templateName: e.target.value })}
                                                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white font-mono focus:outline-none focus:border-amber-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Language Code</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="en_US"
                                                                    value={step.languageCode || 'en_US'}
                                                                    onChange={(e) => updateRootStep(idx, { languageCode: e.target.value })}
                                                                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white font-mono focus:outline-none focus:border-amber-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Fallback Text</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Hi {{name}}! Welcome to our service."
                                                                value={step.content || ''}
                                                                onChange={(e) => updateRootStep(idx, { content: e.target.value })}
                                                                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Step Configuration: TAG */}
                                                {step.type === 'tag' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Tag Name to Attach *</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. VIP, High Intent, Inbound Lead, Demo Requested"
                                                            value={step.tagName || ''}
                                                            onChange={(e) => updateRootStep(idx, { tagName: e.target.value })}
                                                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-medium"
                                                        />
                                                    </div>
                                                )}

                                                {/* Step Configuration: ASSIGN */}
                                                {step.type === 'assign' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Assign to Agent / Department *</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Sales Desk, Technical Support, John Doe"
                                                            value={step.agentName || ''}
                                                            onChange={(e) => updateRootStep(idx, { agentName: e.target.value })}
                                                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-rose-500 font-medium"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* ADD NEXT ACTION NODE BAR */}
                                    <div className="p-3.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                            <Plus className="w-4 h-4 text-emerald-400" />
                                            <span>Add next action to this workflow chain:</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => addRootStep('message')}
                                                className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1"
                                            >
                                                <MessageSquare className="w-3 h-3" />
                                                + Message
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addRootStep('link')}
                                                className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-semibold flex items-center gap-1"
                                            >
                                                <Globe className="w-3 h-3" />
                                                + Link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addRootStep('buttons')}
                                                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1"
                                            >
                                                <GitFork className="w-3 h-3" />
                                                + Buttons
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addRootStep('template')}
                                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                + Template
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => addRootStep('tag')}
                                                className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1"
                                            >
                                                <Tag className="w-3 h-3" />
                                                + Tag
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Real-Time WhatsApp Phone Simulator */}
                                <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl border border-white/10 p-4 sticky top-2 shadow-2xl flex flex-col">
                                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Live WhatsApp Phone Preview</span>
                                        </div>
                                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            Real-Time
                                        </span>
                                    </div>

                                    {/* Phone Screen Mock */}
                                    <div className="bg-[#0b141a] rounded-xl border border-white/10 overflow-hidden flex flex-col min-h-[380px] shadow-inner">
                                        {/* Phone WhatsApp Header */}
                                        <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2 border-b border-white/5">
                                            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                                                W
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-white">Wcrm Business</div>
                                                <div className="text-[10px] text-emerald-400">Online</div>
                                            </div>
                                        </div>

                                        {/* Chat Messages Sequence */}
                                        <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-start overflow-y-auto font-sans text-xs">
                                            {/* Inbound Trigger Bubble */}
                                            <div className="self-end bg-[#005c4b] text-white p-2.5 rounded-xl rounded-tr-none max-w-[85%] shadow-sm">
                                                <p className="text-[11px]">
                                                    {trigger === 'keyword_match'
                                                        ? (keywordInput ? keywordInput.split(',')[0].trim() : 'HI')
                                                        : 'Hello! I am inquiring about your services.'}
                                                </p>
                                                <span className="text-[9px] text-emerald-200 block text-right mt-0.5">10:00 AM ✓✓</span>
                                            </div>

                                            {/* Outbound Automated Actions in Sequence */}
                                            {steps.map((st, i) => (
                                                <div key={i} className="self-start max-w-[90%] space-y-1">
                                                    {st.type === 'message' && (
                                                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-xl rounded-tl-none shadow-sm space-y-1">
                                                            <p className="text-[11px] whitespace-pre-wrap">
                                                                {(st.content || 'Hi there!').replace(/\{\{name\}\}/gi, 'Alex').replace(/\{\{phone\}\}/gi, '+1 555-0192')}
                                                            </p>
                                                            <span className="text-[9px] text-slate-400 block text-right">10:00 AM</span>
                                                        </div>
                                                    )}

                                                    {st.type === 'link' && (
                                                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-xl rounded-tl-none shadow-sm space-y-2">
                                                            <p className="text-[11px]">{st.content || 'Check out our link:'}</p>
                                                            <a
                                                                href={st.url || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="block p-2 rounded-lg bg-[#111b21] border border-teal-500/30 text-teal-300 text-[11px] font-medium flex items-center justify-between"
                                                            >
                                                                <span className="truncate">{st.buttonLabel || st.url || 'Open Link ↗'}</span>
                                                                <ExternalLink className="w-3 h-3 text-teal-400 flex-shrink-0 ml-1" />
                                                            </a>
                                                            <span className="text-[9px] text-slate-400 block text-right">10:00 AM</span>
                                                        </div>
                                                    )}

                                                    {st.type === 'buttons' && (
                                                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-xl rounded-tl-none shadow-sm space-y-2">
                                                            {st.headerText && <div className="font-bold text-[11px] text-white">{st.headerText}</div>}
                                                            <p className="text-[11px]">{st.content || 'Please choose an option:'}</p>
                                                            <div className="space-y-1 pt-1">
                                                                {(st.buttons || []).map((b, bIdx) => (
                                                                    <div
                                                                        key={bIdx}
                                                                        className="p-1.5 rounded-lg bg-[#111b21] hover:bg-[#182229] border border-white/10 text-center text-emerald-400 text-[11px] font-semibold transition cursor-pointer"
                                                                    >
                                                                        {b.label || `Option ${bIdx + 1}`}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {st.footerText && <div className="text-[9px] text-slate-400 italic">{st.footerText}</div>}
                                                            <span className="text-[9px] text-slate-400 block text-right">10:00 AM</span>
                                                        </div>
                                                    )}

                                                    {st.type === 'template' && (
                                                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-xl rounded-tl-none shadow-sm space-y-1 border-l-2 border-amber-400">
                                                            <div className="text-[10px] text-amber-400 font-mono">Meta Template: {st.templateName || 'welcome'}</div>
                                                            <p className="text-[11px]">{st.content || 'Template message body'}</p>
                                                            <span className="text-[9px] text-slate-400 block text-right">10:00 AM</span>
                                                        </div>
                                                    )}

                                                    {st.type === 'tag' && (
                                                        <div className="self-center mx-auto my-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] font-mono flex items-center gap-1">
                                                            <Tag className="w-2.5 h-2.5" />
                                                            <span>Tagged: {st.tagName || 'Lead'}</span>
                                                        </div>
                                                    )}

                                                    {st.type === 'assign' && (
                                                        <div className="self-center mx-auto my-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] font-mono flex items-center gap-1">
                                                            <UserCheck className="w-2.5 h-2.5" />
                                                            <span>Assigned: {st.agentName || 'Agent'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-2 text-center">
                                        Incoming message matches trigger, then action nodes execute sequentially.
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Controls */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingItem ? 'Update & Deploy Automation' : 'Save & Deploy Automation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
