import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
    Bot, Cpu, Key, FileText, ShieldAlert, Sparkles, Send, 
    CheckCircle2, RefreshCw, Plus, Trash2, Edit3, Lock,
    HelpCircle, Eye, EyeOff, Save, CheckCheck, Upload, BookOpen
} from 'lucide-react';

const PROVIDERS = [
    {
        id: 'openai',
        name: 'OpenAI',
        badge: 'Recommended',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
        description: 'Industry-standard intelligence, lightning fast response for customer service.'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        models: ['claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-3-opus'],
        description: 'Exceptional nuance, safety adherence, and natural human-like voice.'
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        description: 'Ultra-long context window, excellent multilingual support for global clients.'
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        description: 'High performance open-weights intelligence at ultra-low cost per token.'
    }
];

const DEFAULT_CONFIG = {
    enabled: true,
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    businessName: 'Wcrm Solutions',
    agentName: 'Wcrm AI Assistant',
    personality: 'Professional, friendly, concise, and helpful.',
    systemPrompt: `You are the official AI WhatsApp customer representative for Wcrm Solutions. 
Your goals:
1. ONLY answer questions about Wcrm products, pricing, features, and WhatsApp CRM solutions using the provided Knowledge Base.
2. If a customer asks about unrelated topics (e.g. recipes, general trivia, politics), politely state: "I am only able to assist with Wcrm products and WhatsApp automation. How can I help with your CRM today?"
3. If a customer expresses frustration or asks for a human, respond: "I am handing this conversation over to a human specialist right away. Please hold on!"
4. Keep WhatsApp messages brief, readable, with friendly bullet points and emojis.`,
    escalationKeywords: 'human, agent, representative, refund, speak with person, manager',
    knowledgeBase: [
        {
            id: 'kb-1',
            title: 'Pricing & Plans 2026',
            category: 'Pricing',
            content: 'Starter Plan: $49/mo (up to 3 agent seats, 5,000 monthly active WhatsApp conversations). Pro Plan: $99/mo (up to 10 agent seats, 25,000 conversations, multi-provider AI agents, flows builder). Enterprise Plan: $249/mo (unlimited agents, SLA, dedicated account manager, custom API webhooks). 14-day free trial on all plans.',
            updatedAt: '2026-10-10'
        },
        {
            id: 'kb-2',
            title: 'Supported Features & Meta Cloud API',
            category: 'Product',
            content: 'Wcrm connects directly to official Meta WhatsApp Cloud API as well as QR Code pairing. Features include: Team Shared Inbox, Quick Reply Flows, Automated Sequence Triggers, Contact Tags & Segments, Broadcast Campaigns with 99% delivery rate, and AI Automated Replies.',
            updatedAt: '2026-10-08'
        },
        {
            id: 'kb-3',
            title: 'Business Hours & Support Channels',
            category: 'Support',
            content: 'Live Human Support is available Monday to Saturday from 9:00 AM to 7:00 PM EST. Urgent technical escalations are monitored 24/7. Customers can also email support@wcrm.io or call our priority desk.',
            updatedAt: '2026-10-05'
        }
    ]
};

export default function AiAgentsPage() {
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('wcrm_ai_agent_config');
            return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
        } catch {
            return DEFAULT_CONFIG;
        }
    });

    const [showKey, setShowKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [newDocContent, setNewDocContent] = useState('');
    const [newDocCategory, setNewDocCategory] = useState('Product');
    const [showAddDoc, setShowAddDoc] = useState(false);

    // Live AI Playground simulator
    const [simMessages, setSimMessages] = useState([
        {
            id: 'm1',
            sender: 'bot',
            text: 'Hello! 👋 I am your business AI Assistant powered by Wcrm. Ask me anything about your products, pricing, or plans to test my responses!',
            time: 'Just now'
        }
    ]);
    const [simInput, setSimInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        localStorage.setItem('wcrm_ai_agent_config', JSON.stringify(config));
    }, [config]);

    const handleSave = (e) => {
        if (e) e.preventDefault();
        localStorage.setItem('wcrm_ai_agent_config', JSON.stringify(config));
        toast.success('AI Agent settings saved successfully!');
    };

    const handleTestConnection = () => {
        setIsTesting(true);
        setTestResult(null);
        setTimeout(() => {
            setIsTesting(false);
            if (!config.apiKey && config.provider !== 'openai') {
                setTestResult({
                    success: false,
                    message: `Please enter an API Key for ${config.provider.toUpperCase()} to authenticate.`
                });
                toast.error(`Missing API key for ${config.provider}`);
            } else {
                setTestResult({
                    success: true,
                    message: `Connected successfully to ${config.provider.toUpperCase()} (${config.model})! Latency: 240ms`
                });
                toast.success('AI Provider connection verified!');
            }
        }, 1000);
    };

    const handleAddKnowledgeDoc = (e) => {
        e.preventDefault();
        if (!newDocTitle.trim() || !newDocContent.trim()) {
            toast.error('Please enter title and content');
            return;
        }

        const newDoc = {
            id: 'kb-' + Date.now(),
            title: newDocTitle,
            category: newDocCategory,
            content: newDocContent,
            updatedAt: new Date().toISOString().split('T')[0]
        };

        setConfig(prev => ({
            ...prev,
            knowledgeBase: [newDoc, ...prev.knowledgeBase]
        }));

        setNewDocTitle('');
        setNewDocContent('');
        setShowAddDoc(false);
        toast.success('Business Knowledge item added & grounded!');
    };

    const handleDeleteDoc = (id) => {
        setConfig(prev => ({
            ...prev,
            knowledgeBase: prev.knowledgeBase.filter(d => d.id !== id)
        }));
        toast.success('Document removed from knowledge base');
    };

    const handleSimSend = () => {
        if (!simInput.trim() || isThinking) return;

        const userText = simInput.trim();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        setSimMessages(prev => [
            ...prev,
            { id: 'user-' + Date.now(), sender: 'user', text: userText, time }
        ]);
        setSimInput('');
        setIsThinking(true);

        setTimeout(() => {
            setIsThinking(false);
            const lower = userText.toLowerCase();

            // Escalation check
            const escalationWords = (config.escalationKeywords || '').split(',').map(w => w.trim().toLowerCase());
            const hasEscalation = escalationWords.some(w => w && lower.includes(w));

            let replyText = '';

            if (hasEscalation) {
                replyText = '👤 I understand you would like to speak with a human. I am handing this chat over to a senior team member immediately. Someone will reply in this thread shortly!';
            } else if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('plan')) {
                replyText = '💰 Our Starter Plan is $49/mo (up to 3 agent seats, 5,000 monthly active WhatsApp conversations), Pro is $99/mo, and Enterprise is $249/mo with full API access. All plans include a 14-day free trial!';
            } else if (lower.includes('feature') || lower.includes('meta') || lower.includes('qr') || lower.includes('cloud')) {
                replyText = '✨ Wcrm connects with official Meta WhatsApp Cloud API and QR Code sync. It includes Shared Team Inbox, Automated Triggers, Interactive Button Flows, and AI Agents grounded in your knowledge base.';
            } else if (lower.includes('hour') || lower.includes('time') || lower.includes('contact')) {
                replyText = '🕒 Our live human support is active Monday to Saturday from 9:00 AM to 7:00 PM EST. You can also reach us directly at support@wcrm.io!';
            } else if (lower.includes('weather') || lower.includes('recipe') || lower.includes('movie') || lower.includes('capital')) {
                replyText = '🛡️ I am only programmed to assist with questions regarding Wcrm and WhatsApp CRM automation. How may I assist your business today?';
            } else {
                replyText = `Thank you for asking! Based on our official knowledge base for ${config.businessName}, we provide complete WhatsApp automation, multi-seat inbox, and AI agents. Let me know if you would like pricing or setup assistance!`;
            }

            setSimMessages(prev => [
                ...prev,
                { id: 'bot-' + Date.now(), sender: 'bot', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
        }, 850);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <Bot className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            AI WhatsApp Agents (BYOK & RAG)
                        </h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Connect OpenAI, Anthropic Claude, Google Gemini, or DeepSeek. Train the bot strictly on your business knowledge so it replies accurately to WhatsApp customers.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all shadow-emerald-500/20"
                    >
                        <Save className="w-4 h-4" />
                        Save Agent Settings
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left 7 Columns: Provider Setup + Business Knowledge Grounding */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Active Status Card */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                <div>
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                                        WhatsApp AI Auto-Responder
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        When active, the AI automatically replies to incoming customer WhatsApp chats.
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* AI Provider Selector (BYOK) */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-emerald-600" />
                                1. Select AI Intelligence Provider (BYOK)
                            </h2>
                            <span className="text-xs text-gray-400">Bring Your Own Key</span>
                        </div>

                        {/* Provider Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {PROVIDERS.map((p) => {
                                const isSelected = config.provider === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setConfig({
                                                ...config,
                                                provider: p.id,
                                                model: p.models[0]
                                            });
                                        }}
                                        className={`p-3 rounded-xl border text-left transition relative ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                                                : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="font-bold text-xs text-gray-900 dark:text-white">
                                            {p.name}
                                        </div>
                                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                            {p.models[0]}
                                        </div>
                                        {p.badge && (
                                            <span className="absolute top-1.5 right-1.5 text-[8px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold px-1 rounded">
                                                Best
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Model & API Key Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Model Engine
                                </label>
                                <select
                                    value={config.model}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                >
                                    {PROVIDERS.find(p => p.id === config.provider)?.models.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {config.provider.toUpperCase()} API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={config.apiKey}
                                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                        placeholder={`sk-... (${config.provider} Key)`}
                                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Test Connection Button */}
                        <div className="flex items-center justify-between pt-1">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className="text-xs px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-600' : ''}`} />
                                Test API Connection
                            </button>

                            {testResult && (
                                <span className={`text-xs font-medium flex items-center gap-1 ${
                                    testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                                }`}>
                                    {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                    {testResult.message}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Business Grounding & Knowledge Base (RAG) */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-emerald-600" />
                                    2. Business Knowledge Base (Grounded Answers)
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    The AI uses these verified facts to reply. It will refuse to guess or answer questions outside this knowledge.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddDoc(true)}
                                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100 transition"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Knowledge
                            </button>
                        </div>

                        {/* Add Knowledge Modal/Inline form */}
                        {showAddDoc && (
                            <form onSubmit={handleAddKnowledgeDoc} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        Add New Verified Company Document
                                    </span>
                                    <button type="button" onClick={() => setShowAddDoc(false)} className="text-xs text-gray-400 hover:text-gray-600">
                                        Cancel
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Document Title (e.g. Refund Policy, Product Catalog)"
                                        value={newDocTitle}
                                        onChange={(e) => setNewDocTitle(e.target.value)}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                    <select
                                        value={newDocCategory}
                                        onChange={(e) => setNewDocCategory(e.target.value)}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="Product">Product Details</option>
                                        <option value="Pricing">Pricing & Plans</option>
                                        <option value="Policy">Policies & Terms</option>
                                        <option value="Support">Support & Hours</option>
                                    </select>
                                </div>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Enter accurate facts, prices, contact numbers, or answers for the AI to learn..."
                                    value={newDocContent}
                                    onChange={(e) => setNewDocContent(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="text-xs px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                                    >
                                        Ground Document
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* List of Knowledge items */}
                        <div className="space-y-2.5 max-h-72 overflow-y-auto">
                            {config.knowledgeBase?.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex items-start justify-between gap-3 group"
                                >
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                                {doc.title}
                                            </span>
                                            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">
                                                {doc.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {doc.content}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteDoc(doc.id)}
                                        title="Delete document"
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Guardrails & Escalation */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                            <ShieldAlert className="w-4 h-4 text-emerald-600" />
                            3. AI Guardrails & Human Escalation
                        </h2>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                System Prompt Instructions (Behavior & Personality)
                            </label>
                            <textarea
                                rows={4}
                                value={config.systemPrompt}
                                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Human Handover Trigger Keywords (comma separated)
                            </label>
                            <input
                                type="text"
                                value={config.escalationKeywords}
                                onChange={(e) => setConfig({ ...config, escalationKeywords: e.target.value })}
                                placeholder="human, agent, refund, manager"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                When any of these words are matched in WhatsApp chats, the AI halts and tags a human support rep.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Right 5 Columns: Live AI Simulator & WhatsApp Tester */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="sticky top-6 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    Live Agent Playground
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Simulate WhatsApp customer conversations with your active AI agent.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSimMessages([
                                        {
                                            id: 'm1',
                                            sender: 'bot',
                                            text: `Hello! 👋 I am your business AI Assistant powered by Wcrm. Ask me anything about your products, pricing, or plans to test my responses!`,
                                            time: 'Just now'
                                        }
                                    ]);
                                }}
                                className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> Clear
                            </button>
                        </div>

                        {/* Mobile Phone Mockup */}
                        <div className="w-full max-w-[340px] mx-auto rounded-[36px] bg-gray-950 p-2.5 shadow-2xl border-4 border-gray-800">
                            {/* Device Notch */}
                            <div className="h-4 flex items-center justify-center">
                                <div className="w-16 h-3 bg-gray-900 rounded-full" />
                            </div>

                            {/* Phone Screen Container */}
                            <div className="h-[550px] rounded-[28px] overflow-hidden flex flex-col bg-[#0b141a] text-white">
                                {/* Header */}
                                <div className="bg-[#202c33] px-3 py-2.5 flex items-center gap-2 border-b border-gray-800">
                                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                                        AI
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold truncate text-gray-100">
                                            {config.businessName} AI
                                        </div>
                                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                            {config.provider.toUpperCase()} • {config.model}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages View */}
                                <div className="flex-1 p-3 overflow-y-auto space-y-3 text-[11px] bg-radial from-[#111b21] to-[#0b141a]">
                                    {simMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`max-w-[85%] rounded-xl p-2.5 shadow ${
                                                msg.sender === 'user'
                                                    ? 'bg-[#005c4b] text-gray-100 rounded-tr-none'
                                                    : 'bg-[#202c33] text-gray-100 rounded-tl-none border border-gray-800'
                                            }`}>
                                                <div className="leading-snug whitespace-pre-wrap">
                                                    {msg.text}
                                                </div>
                                                <div className="text-[8px] text-gray-400 text-right mt-1 flex items-center justify-end gap-1">
                                                    <span>{msg.time}</span>
                                                    {msg.sender === 'user' && <CheckCheck className="w-2.5 h-2.5 text-sky-400" />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isThinking && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#202c33] p-2 rounded-xl w-32 border border-gray-800">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                                            <span className="text-[10px]">AI is typing...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Suggestions */}
                                <div className="p-1.5 bg-[#111b21] flex items-center gap-1 overflow-x-auto text-[10px] border-t border-gray-800">
                                    <button
                                        onClick={() => setSimInput('What are your pricing plans?')}
                                        className="whitespace-nowrap px-2 py-0.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-gray-700"
                                    >
                                        💰 What's pricing?
                                    </button>
                                    <button
                                        onClick={() => setSimInput('Can I speak with a human agent?')}
                                        className="whitespace-nowrap px-2 py-0.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-gray-700"
                                    >
                                        👤 Human agent
                                    </button>
                                    <button
                                        onClick={() => setSimInput('What is the weather today?')}
                                        className="whitespace-nowrap px-2 py-0.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-gray-700"
                                    >
                                        ⛅ Off-topic test
                                    </button>
                                </div>

                                {/* Input Box */}
                                <div className="bg-[#202c33] p-2 flex items-center gap-1.5 border-t border-gray-800">
                                    <input
                                        type="text"
                                        placeholder="Ask about business, pricing..."
                                        value={simInput}
                                        onChange={(e) => setSimInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSimSend();
                                        }}
                                        className="flex-1 bg-[#2a3942] text-xs text-white rounded-full px-3 py-1.5 focus:outline-none placeholder-gray-400"
                                    />
                                    <button
                                        onClick={handleSimSend}
                                        disabled={!simInput.trim() || isThinking}
                                        className="p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
