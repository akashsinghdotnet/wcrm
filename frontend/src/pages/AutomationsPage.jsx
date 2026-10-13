import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
    Zap, Plus, Play, Pause, Trash2, Edit3, Clock, 
    ArrowRight, MessageSquare, CheckCircle2, AlertCircle, 
    Sparkles, Filter, ChevronRight, X, Save, Check, RefreshCw, 
    Eye, Split, UserCheck, Tag, Globe, Search, Activity, 
    Terminal, ArrowDown, GitFork, CornerDownRight, Copy
} from 'lucide-react';

// Triggers available in WhatsApp CRM
const TRIGGER_DEFINITIONS = [
    {
        id: 'first_inbound',
        name: 'First Inbound Message',
        category: 'Inbound',
        description: 'Triggers when a completely new contact messages your WhatsApp business number for the first time.',
        badge: 'New Lead'
    },
    {
        id: 'every_inbound',
        name: 'Every Inbound Message',
        category: 'Inbound',
        description: 'Triggers on every incoming customer message unless an active flow is executing.',
        badge: 'All Chats'
    },
    {
        id: 'keyword_match',
        name: 'Keyword Match',
        category: 'Keywords',
        description: 'Triggers when customer message matches specific words or phrases (e.g., PRICE, DEMO, HELP).',
        badge: 'Keyword'
    },
    {
        id: 'tag_added',
        name: 'Tag Attached to Contact',
        category: 'Lifecycle',
        description: 'Triggers when a tag (e.g. "VIP", "High Intent", "Demo Booked") is added to a contact.',
        badge: 'Tag'
    },
    {
        id: 'contact_created',
        name: 'New Contact Created / Imported',
        category: 'Lifecycle',
        description: 'Triggers whenever a contact is manually added or imported via CSV/API.',
        badge: 'Contact'
    },
    {
        id: 'conversation_assigned',
        name: 'Conversation Assigned to Agent',
        category: 'Routing',
        description: 'Triggers when a chat is routed or reassigned to a human sales/support agent.',
        badge: 'Routing'
    },
    {
        id: 'after_hours',
        name: 'Message Outside Working Hours',
        category: 'Schedule',
        description: 'Triggers when inbound messages arrive outside defined business schedule (e.g., 7 PM - 9 AM).',
        badge: 'Schedule'
    },
    {
        id: 'inactivity_24h',
        name: '24-Hour Customer Inactivity',
        category: 'Re-engagement',
        description: 'Triggers when 24 hours have passed with no response from the contact after a quote or reply.',
        badge: 'Timer'
    }
];

const PRESET_TEMPLATES = [
    {
        id: 'tpl-welcome',
        name: '🚀 Instant Lead Welcome & Qualification',
        description: 'Greets first-time inbound contacts, verifies if they are existing customers, and routes accordingly.',
        trigger: 'first_inbound',
        triggerLabel: 'First Inbound Message',
        triggerConfig: {},
        steps: [
            { 
                id: 's1', 
                type: 'message', 
                content: 'Hi {{name}}! 👋 Welcome to Wcrm. Thanks for getting in touch with us!' 
            },
            { 
                id: 's2', 
                type: 'delay', 
                duration: '1 minute' 
            },
            {
                id: 's3',
                type: 'condition',
                conditionField: 'contact_tag',
                conditionOperator: 'equals',
                conditionValue: 'Existing Customer',
                yesSteps: [
                    { id: 's3-y1', type: 'tag', action: 'add', tagName: 'VIP Priority' },
                    { id: 's3-y2', type: 'assign', agentName: 'Account Management Team' },
                    { id: 's3-y3', type: 'message', content: 'Welcome back! Connecting you immediately with your dedicated account rep.' }
                ],
                noSteps: [
                    { id: 's3-n1', type: 'tag', action: 'add', tagName: 'New Inbound Lead' },
                    { id: 's3-n2', type: 'message', content: 'Could you share what product or service you are interested in exploring today?' }
                ]
            }
        ]
    },
    {
        id: 'tpl-afterhours',
        name: '🌙 Out-of-Office Away Auto-Responder',
        description: 'Informs contacts arriving after business hours (Mon-Sat 7 PM - 9 AM) that the team will reply promptly.',
        trigger: 'after_hours',
        triggerLabel: 'Message Outside Working Hours',
        triggerConfig: { schedule: 'Mon-Sat 19:00 - 09:00, Sun All Day' },
        steps: [
            { 
                id: 's1', 
                type: 'message', 
                content: 'Thank you for reaching out! 🌙 Our office is currently closed. Our team will get back to you first thing at 9:00 AM.' 
            },
            { 
                id: 's2', 
                type: 'tag', 
                action: 'add', 
                tagName: 'Needs Morning Follow-up' 
            }
        ]
    },
    {
        id: 'tpl-pricing-lead',
        name: '💰 Keyword Price & Quote Qualifier',
        description: 'Detects pricing inquiries, attaches high-intent tags, and notifies the enterprise sales team.',
        trigger: 'keyword_match',
        triggerLabel: 'Keyword matches: "PRICE", "COST", "QUOTE"',
        triggerConfig: { keywords: 'PRICE, COST, QUOTE, RATES' },
        steps: [
            { 
                id: 's1', 
                type: 'tag', 
                action: 'add', 
                tagName: 'High-Intent Buyer' 
            },
            { 
                id: 's2', 
                type: 'message', 
                content: 'Hello! Here is our current pricing overview:\n\n• Starter: $49/mo (Up to 3 agents)\n• Growth: $99/mo (Unlimited agents & broadcasts)\n• Enterprise: Custom tailored solutions\n\nWould you like a personalized quotation?' 
            },
            {
                id: 's3',
                type: 'assign',
                agentName: 'Enterprise Sales Desk'
            }
        ]
    },
    {
        id: 'tpl-followup',
        name: '⏰ 24-Hour Follow-Up Win-Back',
        description: 'Automatically re-engages prospective buyers if they went quiet after receiving a product quotation.',
        trigger: 'inactivity_24h',
        triggerLabel: 'No Reply for 24 Hours',
        triggerConfig: { hours: 24 },
        steps: [
            {
                id: 's1',
                type: 'condition',
                conditionField: 'contact_status',
                conditionOperator: 'equals',
                conditionValue: 'Lead',
                yesSteps: [
                    { id: 's1-y1', type: 'message', content: 'Hi {{name}}, just checking in! Did you have any questions regarding the proposal we sent yesterday?' },
                    { id: 's1-y2', type: 'tag', action: 'add', tagName: 'Follow-up Sent' }
                ],
                noSteps: [
                    { id: 's1-n1', type: 'delay', duration: '48 hours' }
                ]
            }
        ]
    }
];

const INITIAL_AUTOMATIONS = [
    {
        id: 'auto-1',
        name: 'Welcome Greeting & Menu',
        description: 'Sends instant friendly greeting and interactive menu when a new lead initiates a chat.',
        trigger: 'first_inbound',
        triggerLabel: 'First Inbound Message',
        triggerConfig: {},
        status: 'active',
        executedCount: 142,
        lastRunAt: '12 mins ago',
        steps: [
            { id: 's1', type: 'message', content: 'Hi there! 👋 Welcome to Wcrm. How can we help you today?' },
            { id: 's2', type: 'delay', duration: '2 mins' },
            {
                id: 's3',
                type: 'condition',
                conditionField: 'contact_tag',
                conditionOperator: 'equals',
                conditionValue: 'VIP',
                yesSteps: [
                    { id: 's3-y1', type: 'assign', agentName: 'VIP Executive Support' },
                    { id: 's3-y2', type: 'message', content: 'Connecting you with our senior executive desk...' }
                ],
                noSteps: [
                    { id: 's3-n1', type: 'tag', action: 'add', tagName: 'Standard Inbound' },
                    { id: 's3-n2', type: 'message', content: 'Feel free to reply with 1 for Pricing, 2 for Demo, or 3 for Catalog.' }
                ]
            }
        ]
    },
    {
        id: 'auto-2',
        name: 'Out of Office / After-Hours Responder',
        description: 'Replies outside business hours (Mon-Sat 7 PM - 9 AM) to inform leads we will reply first thing.',
        trigger: 'after_hours',
        triggerLabel: 'Message Outside Working Hours',
        triggerConfig: { schedule: '19:00 - 09:00' },
        status: 'active',
        executedCount: 89,
        lastRunAt: '2 hours ago',
        steps: [
            { id: 's1', type: 'message', content: 'Thanks for reaching out! Our team is currently offline. We will reply as soon as our office opens at 9:00 AM.' },
            { id: 's2', type: 'tag', action: 'add', tagName: 'After-Hours Lead' }
        ]
    },
    {
        id: 'auto-3',
        name: 'Lead Qualifier & Discovery',
        description: 'Collects visitor requirements and tags lead automatically before notifying sales reps.',
        trigger: 'keyword_match',
        triggerLabel: 'Keyword matches: "PRICE", "DEMO"',
        triggerConfig: { keywords: 'PRICE, DEMO' },
        status: 'active',
        executedCount: 64,
        lastRunAt: 'Yesterday',
        steps: [
            { id: 's1', type: 'message', content: 'Great to hear! Could you please share your business name and monthly WhatsApp chat volume?' },
            { id: 's2', type: 'tag', action: 'add', tagName: 'High-Intent Lead' },
            { id: 's3', type: 'assign', agentName: 'Direct Sales Pipeline' }
        ]
    },
    {
        id: 'auto-4',
        name: '24-Hour Follow-up Reminder',
        description: 'Follows up with leads who received a quote but haven\'t replied after 24 hours.',
        trigger: 'inactivity_24h',
        triggerLabel: 'No Reply for 24 Hours',
        triggerConfig: { hours: 24 },
        status: 'inactive',
        executedCount: 28,
        lastRunAt: '3 days ago',
        steps: [
            { id: 's1', type: 'message', content: 'Hi {{name}}! Just following up to see if you had any questions regarding the details we shared yesterday?' }
        ]
    }
];

const INITIAL_EXECUTION_LOGS = [
    {
        id: 'log-101',
        automationId: 'auto-1',
        automationName: 'Welcome Greeting & Menu',
        trigger: 'First Inbound Message',
        contactName: 'Carlos Martinez',
        contactPhone: '+1 (555) 382-9901',
        timestamp: 'Just now (10:14 AM)',
        status: 'success',
        durationMs: 124,
        stepsExecuted: 3,
        branchTaken: 'No Branch (Standard Inbound)',
        details: [
            { step: '1. Send Message', status: 'Delivered', latency: '42ms' },
            { step: '2. Delay Wait', status: 'Completed', latency: '12ms' },
            { step: '3. Condition Check', status: 'Evaluated (False: Contact is not VIP)', latency: '70ms' }
        ]
    },
    {
        id: 'log-102',
        automationId: 'auto-3',
        automationName: 'Lead Qualifier & Discovery',
        trigger: 'Keyword Match ("PRICE")',
        contactName: 'Priya Sharma',
        contactPhone: '+91 98230 44102',
        timestamp: '14 mins ago',
        status: 'success',
        durationMs: 98,
        stepsExecuted: 3,
        branchTaken: 'Sequential',
        details: [
            { step: '1. Send Message', status: 'Delivered', latency: '40ms' },
            { step: '2. Add Tag [High-Intent Lead]', status: 'Saved', latency: '22ms' },
            { step: '3. Assign to Sales Desk', status: 'Routed', latency: '36ms' }
        ]
    },
    {
        id: 'log-103',
        automationId: 'auto-2',
        automationName: 'Out of Office / After-Hours Responder',
        trigger: 'Outside Working Hours',
        contactName: 'Alexander Hayes',
        contactPhone: '+44 7911 123456',
        timestamp: '2 hours ago',
        status: 'success',
        durationMs: 82,
        stepsExecuted: 2,
        branchTaken: 'Sequential',
        details: [
            { step: '1. Send Message', status: 'Delivered', latency: '46ms' },
            { step: '2. Add Tag [After-Hours Lead]', status: 'Saved', latency: '36ms' }
        ]
    },
    {
        id: 'log-104',
        automationId: 'auto-1',
        automationName: 'Welcome Greeting & Menu',
        trigger: 'First Inbound Message',
        contactName: 'Elena Rostova',
        contactPhone: '+49 170 555019',
        timestamp: '5 hours ago',
        status: 'success',
        durationMs: 146,
        stepsExecuted: 3,
        branchTaken: 'Yes Branch (VIP Executive)',
        details: [
            { step: '1. Send Message', status: 'Delivered', latency: '48ms' },
            { step: '2. Delay Wait', status: 'Completed', latency: '18ms' },
            { step: '3. Condition Check', status: 'Evaluated (True: Contact is VIP)', latency: '80ms' }
        ]
    },
    {
        id: 'log-105',
        automationId: 'auto-4',
        automationName: '24-Hour Follow-up Reminder',
        trigger: 'No Reply for 24 Hours',
        contactName: 'David Kim',
        contactPhone: '+1 (555) 773-8201',
        timestamp: 'Yesterday',
        status: 'skipped',
        durationMs: 34,
        stepsExecuted: 1,
        branchTaken: 'Condition Skipped (Chat already replied)',
        details: [
            { step: '1. Verification Check', status: 'Skipped - customer engaged before deadline', latency: '34ms' }
        ]
    }
];

export default function AutomationsPage() {
    const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' | 'logs'
    const [automations, setAutomations] = useState(() => {
        const saved = localStorage.getItem('wcrm_automations_v2');
        return saved ? JSON.parse(saved) : INITIAL_AUTOMATIONS;
    });
    const [executionLogs, setExecutionLogs] = useState(() => {
        const saved = localStorage.getItem('wcrm_automation_logs_v2');
        return saved ? JSON.parse(saved) : INITIAL_EXECUTION_LOGS;
    });

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
        { id: 'step-1', type: 'message', content: 'Hello! Thanks for reaching out to Wcrm.' }
    ]);

    // Test Simulation Modal State
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [simulatingAuto, setSimulatingAuto] = useState(null);
    const [simulationState, setSimulationState] = useState({ running: false, completed: false, stepsDone: [] });

    // Selected Log detail drawer
    const [selectedLog, setSelectedLog] = useState(null);
    const [logFilter, setLogFilter] = useState('all'); // 'all' | 'success' | 'skipped' | 'failed'
    const [logSearch, setLogSearch] = useState('');

    useEffect(() => {
        localStorage.setItem('wcrm_automations_v2', JSON.stringify(automations));
    }, [automations]);

    useEffect(() => {
        localStorage.setItem('wcrm_automation_logs_v2', JSON.stringify(executionLogs));
    }, [executionLogs]);

    const toggleStatus = (id) => {
        setAutomations(prev => prev.map(a => {
            if (a.id === id) {
                const nextStatus = a.status === 'active' ? 'inactive' : 'active';
                toast.success(`Automation "${a.name}" is now ${nextStatus}`);
                return { ...a, status: nextStatus };
            }
            return a;
        }));
    };

    const deleteAutomation = (id) => {
        if (!confirm('Are you sure you want to delete this automation workflow?')) return;
        setAutomations(prev => prev.filter(a => a.id !== id));
        toast.success('Automation deleted');
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setName('');
        setDescription('');
        setTrigger('first_inbound');
        setKeywordInput('');
        setSteps([
            { id: 'step-1', type: 'message', content: 'Hi {{name}}! Welcome to our WhatsApp service.' }
        ]);
        setModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setName(item.name);
        setDescription(item.description);
        setTrigger(item.trigger);
        setKeywordInput(item.triggerConfig?.keywords || '');
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

    const addBranchStep = (parentIndex, branch, type) => {
        const newSubStep = createEmptyStep(type);
        setSteps(prev => {
            const next = [...prev];
            const parent = { ...next[parentIndex] };
            if (branch === 'yes') {
                parent.yesSteps = [...(parent.yesSteps || []), newSubStep];
            } else {
                parent.noSteps = [...(parent.noSteps || []), newSubStep];
            }
            next[parentIndex] = parent;
            return next;
        });
    };

    const updateBranchStep = (parentIndex, branch, stepIndex, updated) => {
        setSteps(prev => {
            const next = [...prev];
            const parent = { ...next[parentIndex] };
            const list = branch === 'yes' ? [...(parent.yesSteps || [])] : [...(parent.noSteps || [])];
            list[stepIndex] = { ...list[stepIndex], ...updated };
            if (branch === 'yes') parent.yesSteps = list;
            else parent.noSteps = list;
            next[parentIndex] = parent;
            return next;
        });
    };

    const removeBranchStep = (parentIndex, branch, stepIndex) => {
        setSteps(prev => {
            const next = [...prev];
            const parent = { ...next[parentIndex] };
            if (branch === 'yes') {
                parent.yesSteps = (parent.yesSteps || []).filter((_, i) => i !== stepIndex);
            } else {
                parent.noSteps = (parent.noSteps || []).filter((_, i) => i !== stepIndex);
            }
            next[parentIndex] = parent;
            return next;
        });
    };

    const createEmptyStep = (type) => {
        const id = 'step-' + Math.random().toString(36).substr(2, 7);
        switch (type) {
            case 'message':
                return { id, type: 'message', content: '' };
            case 'delay':
                return { id, type: 'delay', duration: '5 minutes' };
            case 'condition':
                return {
                    id,
                    type: 'condition',
                    conditionField: 'contact_tag',
                    conditionOperator: 'equals',
                    conditionValue: 'VIP',
                    yesSteps: [{ id: 'sub-y-' + Math.random().toString(36).substr(2, 5), type: 'message', content: 'Exclusive VIP priority response.' }],
                    noSteps: [{ id: 'sub-n-' + Math.random().toString(36).substr(2, 5), type: 'message', content: 'Standard welcome follow-up.' }]
                };
            case 'tag':
                return { id, type: 'tag', action: 'add', tagName: 'New Lead' };
            case 'assign':
                return { id, type: 'assign', agentName: 'General Sales Desk' };
            case 'webhook':
                return { id, type: 'webhook', url: 'https://api.yourdomain.com/webhook', method: 'POST' };
            default:
                return { id, type: 'message', content: '' };
        }
    };

    const handleSaveAutomation = (e) => {
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

        if (editingItem) {
            setAutomations(prev => prev.map(a => a.id === editingItem.id ? automationData : a));
            toast.success('Automation updated successfully!');
        } else {
            setAutomations(prev => [automationData, ...prev]);
            toast.success('New automation created!');
        }
        setModalOpen(false);
    };

    // Test simulation runner
    const runTestSimulation = (auto) => {
        setSimulatingAuto(auto);
        setTestModalOpen(true);
        setSimulationState({ running: true, completed: false, stepsDone: [] });

        const stepsList = auto.steps || [];
        let cur = 0;

        const interval = setInterval(() => {
            if (cur < stepsList.length) {
                const s = stepsList[cur];
                setSimulationState(prev => ({
                    ...prev,
                    stepsDone: [...prev.stepsDone, {
                        title: s.type === 'message' ? 'Sent WhatsApp Message' :
                               s.type === 'delay' ? `Delay ${s.duration}` :
                               s.type === 'condition' ? `Condition evaluated (${s.conditionValue}) -> TRUE` :
                               s.type === 'tag' ? `Tag [${s.tagName}] added` :
                               s.type === 'assign' ? `Assigned to [${s.agentName}]` : 'Webhook executed',
                        status: 'success',
                        timestamp: new Date().toLocaleTimeString()
                    }]
                }));
                cur++;
            } else {
                clearInterval(interval);
                setSimulationState(prev => ({ ...prev, running: false, completed: true }));

                // Add to log
                const newLog = {
                    id: 'log-' + Date.now(),
                    automationId: auto.id,
                    automationName: auto.name,
                    trigger: auto.triggerLabel,
                    contactName: 'Test Contact (Simulator)',
                    contactPhone: '+1 (555) 019-9281',
                    timestamp: 'Just now',
                    status: 'success',
                    durationMs: 118,
                    stepsExecuted: stepsList.length,
                    branchTaken: 'Live Simulator Run',
                    details: stepsList.map((s, idx) => ({
                        step: `${idx + 1}. ${s.type.toUpperCase()}`,
                        status: 'Success / Verified',
                        latency: '38ms'
                    }))
                };
                setExecutionLogs(prev => [newLog, ...prev]);
            }
        }, 600);
    };

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return executionLogs.filter(log => {
            if (logFilter !== 'all' && log.status !== logFilter) return false;
            if (logSearch.trim()) {
                const q = logSearch.toLowerCase();
                return log.automationName.toLowerCase().includes(q) ||
                       log.contactName.toLowerCase().includes(q) ||
                       log.contactPhone.toLowerCase().includes(q) ||
                       log.trigger.toLowerCase().includes(q);
            }
            return true;
        });
    }, [executionLogs, logFilter, logSearch]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                WhatsApp Automations
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Event-Driven Engine
                                </span>
                            </h1>
                            <p className="text-sm text-slate-400">
                                Trigger instant automated replies, tagging, condition-based Yes/No branches, and agent routing for WhatsApp chats.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setTemplatesModalOpen(true)}
                        className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-sm font-medium transition-all flex items-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        Templates Library
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Automation
                    </button>
                </div>
            </div>

            {/* Navigation Tabs (Workflows vs Logs) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'workflows'
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <Zap className="w-4 h-4" />
                        Active Automations
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 border border-white/10">
                            {automations.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            activeTab === 'logs'
                                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        Execution Run Logs
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300 border border-white/10">
                            {executionLogs.length}
                        </span>
                    </button>
                </div>

                <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    WhatsApp Webhook Listener: <strong className="text-slate-200">Online & Ready</strong>
                </div>
            </div>

            {/* TAB 1: AUTOMATIONS WORKFLOW LIST */}
            {activeTab === 'workflows' && (
                <div className="space-y-4">
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
                                                    <h3 className="font-semibold text-white text-base leading-snug">
                                                        {auto.name}
                                                    </h3>
                                                    <span className="text-xs text-slate-400 font-mono">
                                                        {auto.id}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Switch */}
                                            <button
                                                onClick={() => toggleStatus(auto.id)}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
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
                                        <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 mb-4">
                                            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                                                <Terminal className="w-3 h-3 text-emerald-400" />
                                                Event Trigger
                                            </div>
                                            <div className="text-xs text-emerald-300 font-medium truncate">
                                                {auto.triggerLabel || triggerDef?.name || auto.trigger}
                                            </div>
                                        </div>

                                        {/* Steps Preview */}
                                        <div className="space-y-1.5 mb-4">
                                            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                                                <span>Workflow Steps</span>
                                                <span className="text-slate-400">{auto.steps?.length || 0} actions</span>
                                            </div>
                                            <div className="space-y-1">
                                                {(auto.steps || []).slice(0, 3).map((st, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-md">
                                                        {st.type === 'message' && <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                                                        {st.type === 'delay' && <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                                        {st.type === 'condition' && <Split className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                                                        {st.type === 'tag' && <Tag className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                                                        {st.type === 'assign' && <UserCheck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                                                        {st.type === 'webhook' && <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                                                        
                                                        <span className="truncate flex-1">
                                                            {st.type === 'message' && (st.content ? `"${st.content}"` : 'Send WhatsApp Message')}
                                                            {st.type === 'delay' && `Wait ${st.duration || '5 mins'}`}
                                                            {st.type === 'condition' && `If ${st.conditionField || 'Tag'} == "${st.conditionValue}" (Branch)`}
                                                            {st.type === 'tag' && `Add Tag: "${st.tagName}"`}
                                                            {st.type === 'assign' && `Assign to: ${st.agentName}`}
                                                            {st.type === 'webhook' && `Call Webhook: ${st.url}`}
                                                        </span>
                                                    </div>
                                                ))}
                                                {(auto.steps?.length || 0) > 3 && (
                                                    <div className="text-[11px] text-slate-400 pl-2">
                                                        + {auto.steps.length - 3} more sub-steps...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Stats & Actions */}
                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                                        <div className="text-xs text-slate-400">
                                            <span className="text-emerald-400 font-semibold">{auto.executedCount || 0}</span> runs
                                            <span className="mx-1.5">•</span>
                                            {auto.lastRunAt || 'Never'}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => runTestSimulation(auto)}
                                                title="Simulate / Test Trigger"
                                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs flex items-center gap-1 px-2"
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
                </div>
            )}

            {/* TAB 2: EXECUTION RUN LOGS */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* Filter bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search contact, phone or automation..."
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
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
                                    {f === 'all' ? 'All Executions' : f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table of logs */}
                    <div className="bg-slate-900/80 rounded-xl border border-white/10 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950/70 text-slate-400 border-b border-white/10 font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Automation</th>
                                        <th className="py-3 px-4">Trigger Fired</th>
                                        <th className="py-3 px-4">Contact</th>
                                        <th className="py-3 px-4">Result</th>
                                        <th className="py-3 px-4">Execution Path</th>
                                        <th className="py-3 px-4">Latency</th>
                                        <th className="py-3 px-4">Time</th>
                                        <th className="py-3 px-4 text-right">Inspect</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-500">
                                                No automation execution logs match your filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 px-4 font-medium text-white">
                                                    {log.automationName}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]">
                                                        {log.trigger}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-white">{log.contactName}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{log.contactPhone}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {log.status === 'success' && (
                                                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Delivered ({log.stepsExecuted} steps)
                                                        </span>
                                                    )}
                                                    {log.status === 'skipped' && (
                                                        <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            Skipped
                                                        </span>
                                                    )}
                                                    {log.status === 'failed' && (
                                                        <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                                                            <X className="w-3.5 h-3.5" />
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-300">
                                                    {log.branchTaken}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-slate-400">
                                                    {log.durationMs}ms
                                                </td>
                                                <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                                    {log.timestamp}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all font-medium text-[11px]"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* LOG DETAILS DRAWER MODAL */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-400" />
                                <h3 className="font-semibold text-white text-lg">Execution Run Breakdown</h3>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-black/40 p-3.5 rounded-xl border border-white/5 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-0.5">Automation:</span>
                                <strong className="text-white">{selectedLog.automationName}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Trigger:</span>
                                <span className="text-emerald-400 font-mono">{selectedLog.trigger}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Recipient:</span>
                                <strong className="text-white">{selectedLog.contactName} ({selectedLog.contactPhone})</strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Total Runtime:</span>
                                <strong className="text-emerald-400">{selectedLog.durationMs}ms</strong>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                                Step Execution Sequence
                            </h4>
                            <div className="space-y-2">
                                {(selectedLog.details || []).map((d, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            <span className="text-slate-200">{d.step}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-emerald-300 font-medium">{d.status}</span>
                                            <span className="text-slate-400 font-mono text-[11px]">{d.latency}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                            >
                                Close Breakdown
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TEMPLATES LIBRARY MODAL */}
            {templatesModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <h3 className="font-bold text-white text-lg">WhatsApp Automation Templates</h3>
                                    <p className="text-xs text-slate-400">Pre-built industry standard flows tested for maximum conversion & response rate.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTemplatesModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                            {PRESET_TEMPLATES.map((tpl) => (
                                <div
                                    key={tpl.id}
                                    className="p-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.02] transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <h4 className="font-semibold text-white text-sm">
                                                {tpl.name}
                                            </h4>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                {tpl.trigger}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                                            {tpl.description}
                                        </p>
                                        <div className="text-[11px] text-slate-400 mb-4">
                                            Includes <strong>{tpl.steps.length} sequential actions</strong> with conditional branching.
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => loadTemplate(tpl)}
                                        className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-2"
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
                                    <h3 className="font-bold text-white text-base">Automation Live Ticker</h3>
                                    <p className="text-xs text-slate-400">Testing trigger for: {simulatingAuto.name}</p>
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
                            <div className="text-emerald-400 flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5" />
                                <span>[WHATSAPP WEBHOOK RECEIVED]</span>
                            </div>
                            <div className="text-slate-300">
                                Contact: +1 (555) 019-9281 (Test Simulator)
                            </div>
                            <div className="text-slate-300">
                                Trigger: {simulatingAuto.triggerLabel}
                            </div>
                        </div>

                        <div className="space-y-2 min-h-[140px]">
                            {simulationState.stepsDone.map((st, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs animate-fadeIn">
                                    <div className="flex items-center gap-2 text-emerald-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>{st.title}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono">{st.timestamp}</span>
                                </div>
                            ))}

                            {simulationState.running && (
                                <div className="flex items-center gap-2 p-2.5 text-xs text-slate-400 italic">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                    <span>Executing next automation step in sequence...</span>
                                </div>
                            )}

                            {simulationState.completed && (
                                <div className="p-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    <span>Workflow successfully completed! Run entry recorded in Execution Logs tab.</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                            <button
                                onClick={() => {
                                    setTestModalOpen(false);
                                    setActiveTab('logs');
                                }}
                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                            >
                                View in Execution Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT AUTOMATION BUILDER MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-950/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">
                                        {editingItem ? 'Edit Automation Workflow' : 'Create New Automation'}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Design WhatsApp actions with event triggers, delay timers, and conditional Yes/No decision branches.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Form */}
                        <form onSubmit={handleSaveAutomation} className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Meta Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Automation Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Welcome Greeting & Routing"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Brief note about what this automation achieves..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Trigger Selector */}
                            <div className="space-y-3 p-4 rounded-xl bg-black/40 border border-white/10">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                    1. Select WhatsApp Trigger Event
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    {TRIGGER_DEFINITIONS.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTrigger(t.id)}
                                            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                                                trigger === t.id
                                                    ? 'bg-emerald-600/20 border-emerald-500/50 text-white shadow-md shadow-emerald-950/20'
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
                                    <div className="pt-2">
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Keywords to match (comma separated)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="PRICE, DEMO, QUOTE, CATALOG"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Workflow Steps Builder */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                            2. Workflow Action Steps & Branching
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Add sequential messages, delay intervals, or conditional splits with Yes/No branches.
                                        </p>
                                    </div>

                                    {/* Add Step Dropdown / Quick Buttons */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => addRootStep('message')}
                                            className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            + Message
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addRootStep('delay')}
                                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <Clock className="w-3.5 h-3.5" />
                                            + Delay
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addRootStep('condition')}
                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <Split className="w-3.5 h-3.5" />
                                            + Condition Split
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addRootStep('tag')}
                                            className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <Tag className="w-3.5 h-3.5" />
                                            + Tag
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addRootStep('assign')}
                                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1.5"
                                        >
                                            <UserCheck className="w-3.5 h-3.5" />
                                            + Assign
                                        </button>
                                    </div>
                                </div>

                                {/* Step Sequence List */}
                                <div className="space-y-4">
                                    {steps.map((step, idx) => (
                                        <div
                                            key={step.id || idx}
                                            className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-3 relative group"
                                        >
                                            {/* Step header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-center font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-semibold text-xs uppercase tracking-wider text-slate-200">
                                                        {step.type === 'message' && '💬 Send WhatsApp Message'}
                                                        {step.type === 'delay' && '⏳ Delay / Wait Timer'}
                                                        {step.type === 'condition' && '🔀 Condition Branch (Yes / No)'}
                                                        {step.type === 'tag' && '🏷️ Attach CRM Tag'}
                                                        {step.type === 'assign' && '👤 Route to Agent / Department'}
                                                        {step.type === 'webhook' && '🌐 Trigger Webhook HTTP POST'}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeRootStep(idx)}
                                                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Step specific inputs */}
                                            {step.type === 'message' && (
                                                <div className="space-y-1.5">
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Enter WhatsApp text message... You can use tokens like {{name}}, {{phone}}"
                                                        value={step.content}
                                                        onChange={(e) => updateRootStep(idx, { content: e.target.value })}
                                                        className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                                    />
                                                    <div className="text-[10px] text-slate-400">
                                                        Supported dynamic tags: <code className="text-emerald-400 font-mono">{'{{name}}'}</code>, <code className="text-emerald-400 font-mono">{'{{phone}}'}</code>
                                                    </div>
                                                </div>
                                            )}

                                            {step.type === 'delay' && (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., 5 mins, 1 hour, 2 days"
                                                        value={step.duration}
                                                        onChange={(e) => updateRootStep(idx, { duration: e.target.value })}
                                                        className="px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white w-64 focus:outline-none focus:border-amber-500"
                                                    />
                                                    <span className="text-xs text-slate-400">
                                                        Pauses subsequent steps until the specified duration elapses.
                                                    </span>
                                                </div>
                                            )}

                                            {step.type === 'tag' && (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. VIP, High Intent, Demo Requested"
                                                        value={step.tagName}
                                                        onChange={(e) => updateRootStep(idx, { tagName: e.target.value })}
                                                        className="px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white w-64 focus:outline-none focus:border-purple-500"
                                                    />
                                                    <span className="text-xs text-slate-400">
                                                        Automatically attaches this tag to the customer profile.
                                                    </span>
                                                </div>
                                            )}

                                            {step.type === 'assign' && (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., Sales Team, Sarah Support, Enterprise Desk"
                                                        value={step.agentName}
                                                        onChange={(e) => updateRootStep(idx, { agentName: e.target.value })}
                                                        className="px-3 py-2 text-xs rounded-lg bg-slate-800 border border-white/10 text-white w-64 focus:outline-none focus:border-rose-500"
                                                    />
                                                    <span className="text-xs text-slate-400">
                                                        Re-assigns the WhatsApp conversation thread in Inbox.
                                                    </span>
                                                </div>
                                            )}

                                            {/* CONDITION STEP WITH DUAL YES/NO BRANCHES */}
                                            {step.type === 'condition' && (
                                                <div className="space-y-4 pt-1">
                                                    {/* Condition Expression */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg border border-white/5 text-xs">
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Field</label>
                                                            <select
                                                                value={step.conditionField || 'contact_tag'}
                                                                onChange={(e) => updateRootStep(idx, { conditionField: e.target.value })}
                                                                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-white/10 text-white text-xs"
                                                            >
                                                                <option value="contact_tag">Contact Tag</option>
                                                                <option value="lead_source">Lead Source</option>
                                                                <option value="country_code">Country Code</option>
                                                                <option value="business_hours">Business Hours Status</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Operator</label>
                                                            <select
                                                                value={step.conditionOperator || 'equals'}
                                                                onChange={(e) => updateRootStep(idx, { conditionOperator: e.target.value })}
                                                                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-white/10 text-white text-xs"
                                                            >
                                                                <option value="equals">Equals</option>
                                                                <option value="not_equals">Does Not Equal</option>
                                                                <option value="contains">Contains</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Value</label>
                                                            <input
                                                                type="text"
                                                                value={step.conditionValue || 'VIP'}
                                                                onChange={(e) => updateRootStep(idx, { conditionValue: e.target.value })}
                                                                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-white/10 text-white text-xs"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Branch Columns: YES vs NO */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* YES Branch */}
                                                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    IF TRUE (Yes Branch)
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addBranchStep(idx, 'yes', 'message')}
                                                                        className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/30"
                                                                    >
                                                                        + Msg
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addBranchStep(idx, 'yes', 'tag')}
                                                                        className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/30"
                                                                    >
                                                                        + Tag
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {(step.yesSteps || []).map((sub, sIdx) => (
                                                                    <div key={sub.id || sIdx} className="p-2 rounded bg-black/40 border border-emerald-500/20 text-xs flex items-center gap-2">
                                                                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">{sub.type}:</span>
                                                                        <input
                                                                            type="text"
                                                                            value={sub.content || sub.tagName || sub.agentName || ''}
                                                                            onChange={(e) => updateBranchStep(idx, 'yes', sIdx, { 
                                                                                content: e.target.value,
                                                                                tagName: e.target.value,
                                                                                agentName: e.target.value
                                                                            })}
                                                                            placeholder="Action content..."
                                                                            className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeBranchStep(idx, 'yes', sIdx)}
                                                                            className="text-slate-500 hover:text-red-400"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* NO Branch */}
                                                        <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                                                    <X className="w-3.5 h-3.5" />
                                                                    IF FALSE (No Branch)
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addBranchStep(idx, 'no', 'message')}
                                                                        className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-medium hover:bg-red-500/30"
                                                                    >
                                                                        + Msg
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addBranchStep(idx, 'no', 'tag')}
                                                                        className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-medium hover:bg-red-500/30"
                                                                    >
                                                                        + Tag
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                {(step.noSteps || []).map((sub, sIdx) => (
                                                                    <div key={sub.id || sIdx} className="p-2 rounded bg-black/40 border border-red-500/20 text-xs flex items-center gap-2">
                                                                        <span className="text-[10px] font-mono text-red-400 uppercase font-bold">{sub.type}:</span>
                                                                        <input
                                                                            type="text"
                                                                            value={sub.content || sub.tagName || sub.agentName || ''}
                                                                            onChange={(e) => updateBranchStep(idx, 'no', sIdx, { 
                                                                                content: e.target.value,
                                                                                tagName: e.target.value,
                                                                                agentName: e.target.value
                                                                            })}
                                                                            placeholder="Action content..."
                                                                            className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeBranchStep(idx, 'no', sIdx)}
                                                                            className="text-slate-500 hover:text-red-400"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Submit */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingItem ? 'Update Automation' : 'Save & Activate Automation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
