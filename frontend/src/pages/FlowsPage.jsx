import React, { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
    GitFork, Plus, Play, Trash2, Edit3, MessageSquare, 
    Smartphone, CheckCircle2, ArrowRight, CornerDownRight, 
    Share2, Layers, Sparkles, X, Save, RefreshCw, Send, CheckCheck,
    ZoomIn, ZoomOut, Maximize2, Move, HelpCircle, AlertCircle,
    Split, Clock, UserCheck, Image, FileText, ListFilter, Sliders,
    ChevronRight, ChevronDown, Check, Eye, CloudUpload
} from 'lucide-react';

const NODE_TYPES = [
    { type: 'start', label: 'Start Trigger', icon: Play, color: 'emerald', description: 'Flow entry point (keyword or payload)' },
    { type: 'send_buttons', label: 'Interactive Buttons', icon: GitFork, color: 'teal', description: 'WhatsApp message with up to 3 quick-reply buttons' },
    { type: 'send_list', label: 'Interactive List', icon: ListFilter, color: 'sky', description: 'WhatsApp interactive list menu with up to 10 rows' },
    { type: 'send_message', label: 'Send Message', icon: MessageSquare, color: 'blue', description: 'Text message with dynamic variables' },
    { type: 'condition', label: 'Condition Branch', icon: Split, color: 'amber', description: 'If / Else decision split (Yes / No paths)' },
    { type: 'collect_input', label: 'Collect Input', icon: FileText, color: 'indigo', description: 'Wait for customer reply and save to variable' },
    { type: 'send_media', label: 'Send Media', icon: Image, color: 'purple', description: 'Send image, PDF document, or video' },
    { type: 'handoff', label: 'Agent Handoff', icon: UserCheck, color: 'rose', description: 'Transfer chat to human team and pause bot' },
];

const INITIAL_FLOWS = [
    {
        id: 'flow-sales-demo',
        name: 'Sales Inbound & Product Navigator',
        description: 'Multi-branch interactive button flow that routes incoming leads to pricing, live demo, or senior specialists.',
        triggerKeyword: 'HI, HELLO, START, MENU',
        status: 'active',
        nodes: [
            {
                id: 'node-start',
                type: 'start',
                title: 'Start: Customer Inbound',
                x: 60,
                y: 180,
                config: {
                    keyword: 'HI, HELLO, START',
                    nextNodeId: 'node-welcome-buttons'
                }
            },
            {
                id: 'node-welcome-buttons',
                type: 'send_buttons',
                title: 'Welcome & Choose Option',
                x: 360,
                y: 140,
                config: {
                    headerText: 'Welcome to Wcrm! 🚀',
                    bodyText: 'We help growing teams supercharge customer sales & support on WhatsApp. What would you like to explore today?',
                    footerText: 'Tap an option below',
                    buttons: [
                        { id: 'btn-pricing', label: '💰 View Pricing', targetNodeId: 'node-pricing' },
                        { id: 'btn-demo', label: '📅 Book Demo', targetNodeId: 'node-demo' },
                        { id: 'btn-agent', label: '👤 Talk to Agent', targetNodeId: 'node-handoff' }
                    ]
                }
            },
            {
                id: 'node-pricing',
                type: 'send_message',
                title: 'Send Pricing Details',
                x: 740,
                y: 40,
                config: {
                    text: 'Our Starter plan begins at $49/mo with unlimited WhatsApp chats, contact management, and AI agent integration! Starter: $49/mo | Pro: $99/mo | Enterprise: $249/mo.',
                    nextNodeId: 'node-ask-signup'
                }
            },
            {
                id: 'node-ask-signup',
                type: 'send_buttons',
                title: 'Interested in Trial?',
                x: 1080,
                y: 40,
                config: {
                    bodyText: 'Would you like us to generate your 14-day free trial link now?',
                    buttons: [
                        { id: 'btn-trial-yes', label: '✅ Yes, start trial', targetNodeId: 'node-collect-email' },
                        { id: 'btn-trial-no', label: '❓ Have questions', targetNodeId: 'node-handoff' }
                    ]
                }
            },
            {
                id: 'node-collect-email',
                type: 'collect_input',
                title: 'Capture Work Email',
                x: 1420,
                y: 40,
                config: {
                    promptText: 'Great! Please type your official work email address to receive your trial invitation:',
                    variableName: 'lead_email',
                    nextNodeId: 'node-confirm-trial'
                }
            },
            {
                id: 'node-confirm-trial',
                type: 'send_message',
                title: 'Trial Confirmation',
                x: 1760,
                y: 40,
                config: {
                    text: 'Thank you! 🎉 We have sent your onboarding details. Our team is ready whenever you need us.',
                    nextNodeId: ''
                }
            },
            {
                id: 'node-demo',
                type: 'send_message',
                title: 'Send Calendar Link',
                x: 740,
                y: 220,
                config: {
                    text: 'Awesome! You can pick a convenient 15-minute slot on our calendar: https://cal.com/wcrm-demo\n\nLooking forward to speaking with you!',
                    nextNodeId: ''
                }
            },
            {
                id: 'node-handoff',
                type: 'handoff',
                title: 'Transfer to Human Rep',
                x: 740,
                y: 390,
                config: {
                    note: 'High intent customer requested live human representative from interactive flow.',
                    assignTo: 'Senior Sales Agent'
                }
            }
        ]
    }
];

export default function FlowsPage() {
    const [flows, setFlows] = useState(() => {
        try {
            const saved = localStorage.getItem('wcrm_interactive_flows_v2');
            return saved ? JSON.parse(saved) : INITIAL_FLOWS;
        } catch {
            return INITIAL_FLOWS;
        }
    });

    const [selectedFlowId, setSelectedFlowId] = useState(flows[0]?.id || 'flow-sales-demo');
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'list'
    const [isSimOpen, setIsSimOpen] = useState(false);
    
    // Canvas transform state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 20, y: 20 });
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Node dragging state
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Active flow
    const activeFlow = useMemo(() => {
        return flows.find(f => f.id === selectedFlowId) || flows[0];
    }, [flows, selectedFlowId]);

    const activeNode = useMemo(() => {
        return activeFlow?.nodes?.find(n => n.id === selectedNodeId) || null;
    }, [activeFlow, selectedNodeId]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch flows from backend on mount
    useEffect(() => {
        let isMounted = true;
        const fetchServerFlows = async () => {
            try {
                const res = await api.get('/whatsapp/flows');
                if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
                    setFlows(res.data);
                    if (!res.data.some(f => f.id === selectedFlowId)) {
                        setSelectedFlowId(res.data[0].id);
                    }
                } else if (isMounted) {
                    // Seed initial flow to backend
                    await api.post('/whatsapp/flows', { flows: INITIAL_FLOWS }).catch(() => {});
                }
            } catch (err) {
                console.warn('Could not load flows from server:', err);
            } finally {
                if (isMounted) setIsLoaded(true);
            }
        };
        fetchServerFlows();
        return () => { isMounted = false; };
    }, []);

    const handleSaveAndDeploy = async () => {
        setIsSaving(true);
        try {
            await api.post('/whatsapp/flows', { flows });
            localStorage.setItem('wcrm_interactive_flows_v2', JSON.stringify(flows));
            toast.success('Flows saved and deployed to WhatsApp server! Active flows are live.');
        } catch (err) {
            toast.error('Failed to deploy flows: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('wcrm_interactive_flows_v2', JSON.stringify(flows));
    }, [flows]);

    // Handle flow metadata updates
    const updateActiveFlowMeta = (field, val) => {
        setFlows(prev => prev.map(f => f.id === activeFlow.id ? { ...f, [field]: val } : f));
    };

    // Update specific node
    const updateNode = (nodeId, updater) => {
        setFlows(prev => prev.map(f => {
            if (f.id !== activeFlow.id) return f;
            return {
                ...f,
                nodes: f.nodes.map(n => {
                    if (n.id !== nodeId) return n;
                    return typeof updater === 'function' ? updater(n) : { ...n, ...updater };
                })
            };
        }));
    };

    // Add new node to canvas
    const handleAddNode = (nodeType) => {
        const typeInfo = NODE_TYPES.find(t => t.type === nodeType) || NODE_TYPES[3];
        const newId = `node-${Date.now().toString(36)}`;
        
        // Position relative to canvas center
        const spawnX = Math.round((-pan.x + 400) / zoom);
        const spawnY = Math.round((-pan.y + 250) / zoom);

        const baseConfig = {
            send_buttons: {
                headerText: 'Menu',
                bodyText: 'Please select an option below:',
                footerText: 'Tap to continue',
                buttons: [
                    { id: 'b1', label: 'Option 1', targetNodeId: '' },
                    { id: 'b2', label: 'Option 2', targetNodeId: '' }
                ]
            },
            send_list: {
                headerText: 'Catalog & Services',
                bodyText: 'Browse our solutions list:',
                buttonLabel: 'View Options',
                sections: [
                    {
                        title: 'Popular',
                        rows: [
                            { id: 'r1', title: 'Pricing & Plans', description: 'See pricing breakdown', targetNodeId: '' },
                            { id: 'r2', title: 'Customer Support', description: 'Open support request', targetNodeId: '' }
                        ]
                    }
                ]
            },
            send_message: {
                text: 'Hi there! Thanks for getting in touch with us.',
                nextNodeId: ''
            },
            condition: {
                variableName: 'contact.tag',
                operator: 'contains',
                expectedValue: 'VIP',
                yesNodeId: '',
                noNodeId: ''
            },
            collect_input: {
                promptText: 'Please provide your answer:',
                variableName: 'user_response',
                nextNodeId: ''
            },
            send_media: {
                mediaType: 'image',
                mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
                caption: 'Check out our latest product catalog!',
                nextNodeId: ''
            },
            handoff: {
                note: 'Transferred from automated flow.',
                assignTo: 'Support Team'
            },
            start: {
                keyword: 'MENU',
                nextNodeId: ''
            }
        };

        const newNode = {
            id: newId,
            type: nodeType,
            title: `${typeInfo.label} #${activeFlow.nodes.length + 1}`,
            x: Math.max(50, spawnX),
            y: Math.max(50, spawnY),
            config: baseConfig[nodeType] || {}
        };

        setFlows(prev => prev.map(f => {
            if (f.id !== activeFlow.id) return f;
            return { ...f, nodes: [...f.nodes, newNode] };
        }));

        setSelectedNodeId(newId);
        toast.success(`Added ${typeInfo.label} node to canvas`);
    };

    // Delete node
    const handleDeleteNode = (nodeId) => {
        if (nodeId === 'node-start') {
            toast.error("The Start node cannot be deleted.");
            return;
        }
        if (window.confirm("Delete this node? Connected wires will be detached.")) {
            setFlows(prev => prev.map(f => {
                if (f.id !== activeFlow.id) return f;
                // Remove node and clear references pointing to it
                const cleanedNodes = f.nodes.filter(n => n.id !== nodeId).map(n => {
                    const cfg = { ...n.config };
                    if (cfg.nextNodeId === nodeId) cfg.nextNodeId = '';
                    if (cfg.yesNodeId === nodeId) cfg.yesNodeId = '';
                    if (cfg.noNodeId === nodeId) cfg.noNodeId = '';
                    if (cfg.buttons) {
                        cfg.buttons = cfg.buttons.map(b => b.targetNodeId === nodeId ? { ...b, targetNodeId: '' } : b);
                    }
                    if (cfg.sections) {
                        cfg.sections = cfg.sections.map(s => ({
                            ...s,
                            rows: s.rows.map(r => r.targetNodeId === nodeId ? { ...r, targetNodeId: '' } : r)
                        }));
                    }
                    return { ...n, config: cfg };
                });
                return { ...f, nodes: cleanedNodes };
            }));
            if (selectedNodeId === nodeId) setSelectedNodeId(null);
            toast.success("Node deleted");
        }
    };

    // Calculate all visual connection edges (wires) between nodes
    const edges = useMemo(() => {
        if (!activeFlow?.nodes) return [];
        const result = [];
        const nodeMap = new Map(activeFlow.nodes.map(n => [n.id, n]));

        activeFlow.nodes.forEach(source => {
            const cfg = source.config || {};

            // 1. Single nextNodeId (start, send_message, collect_input, send_media)
            if (cfg.nextNodeId && nodeMap.has(cfg.nextNodeId)) {
                result.push({
                    id: `${source.id}->${cfg.nextNodeId}`,
                    sourceId: source.id,
                    targetId: cfg.nextNodeId,
                    label: null,
                    color: '#10b981'
                });
            }

            // 2. Buttons multi-outlets
            if (cfg.buttons && Array.isArray(cfg.buttons)) {
                cfg.buttons.forEach((btn, bIdx) => {
                    if (btn.targetNodeId && nodeMap.has(btn.targetNodeId)) {
                        result.push({
                            id: `${source.id}-${btn.id}->${btn.targetNodeId}`,
                            sourceId: source.id,
                            targetId: btn.targetNodeId,
                            label: btn.label,
                            color: '#06b6d4',
                            slotIndex: bIdx,
                            totalSlots: cfg.buttons.length
                        });
                    }
                });
            }

            // 3. List Menu rows multi-outlets
            if (cfg.sections && Array.isArray(cfg.sections)) {
                cfg.sections.forEach(sec => {
                    (sec.rows || []).forEach(row => {
                        if (row.targetNodeId && nodeMap.has(row.targetNodeId)) {
                            result.push({
                                id: `${source.id}-${row.id}->${row.targetNodeId}`,
                                sourceId: source.id,
                                targetId: row.targetNodeId,
                                label: row.title,
                                color: '#38bdf8'
                            });
                        }
                    });
                });
            }

            // 4. Condition True / False outlets
            if (source.type === 'condition') {
                if (cfg.yesNodeId && nodeMap.has(cfg.yesNodeId)) {
                    result.push({
                        id: `${source.id}-yes->${cfg.yesNodeId}`,
                        sourceId: source.id,
                        targetId: cfg.yesNodeId,
                        label: 'Yes (True)',
                        color: '#22c55e'
                    });
                }
                if (cfg.noNodeId && nodeMap.has(cfg.noNodeId)) {
                    result.push({
                        id: `${source.id}-no->${cfg.noNodeId}`,
                        sourceId: source.id,
                        targetId: cfg.noNodeId,
                        label: 'No (False)',
                        color: '#ef4444'
                    });
                }
            }
        });

        return result;
    }, [activeFlow]);

    // Canvas panning handlers
    const handleCanvasMouseDown = (e) => {
        if (e.target.closest('.flow-node-card') || e.target.closest('.canvas-ui-control')) return;
        setIsPanning(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleCanvasMouseMove = (e) => {
        if (isPanning) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        } else if (draggingNodeId) {
            const newX = Math.round((e.clientX - pan.x) / zoom - dragOffset.x);
            const newY = Math.round((e.clientY - pan.y) / zoom - dragOffset.y);
            updateNode(draggingNodeId, { x: Math.max(20, newX), y: Math.max(20, newY) });
        }
    };

    const handleCanvasMouseUp = () => {
        setIsPanning(false);
        setDraggingNodeId(null);
    };

    // Node drag start
    const handleNodeMouseDown = (e, node) => {
        e.stopPropagation();
        setSelectedNodeId(node.id);
        setDraggingNodeId(node.id);
        const mouseCanvasX = (e.clientX - pan.x) / zoom;
        const mouseCanvasY = (e.clientY - pan.y) / zoom;
        setDragOffset({
            x: mouseCanvasX - node.x,
            y: mouseCanvasY - node.y
        });
    };

    // Live Simulator runner
    const [simMessages, setSimMessages] = useState([]);
    const [currentSimNodeId, setCurrentSimNodeId] = useState('node-start');

    const resetSimulator = () => {
        const startNode = activeFlow.nodes.find(n => n.type === 'start') || activeFlow.nodes[0];
        if (!startNode) return;
        
        const firstTarget = activeFlow.nodes.find(n => n.id === startNode.config.nextNodeId) || startNode;
        setCurrentSimNodeId(firstTarget.id);
        setSimMessages([
            {
                id: 'm-' + Date.now(),
                sender: 'bot',
                node: firstTarget,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
    };

    const handleSimButtonClick = (btn) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // User reply
        const userMsg = { id: 'u-' + Date.now(), sender: 'user', text: btn.label, time };
        
        // Find next target node
        const nextNode = activeFlow.nodes.find(n => n.id === btn.targetNodeId);
        if (nextNode) {
            const botMsg = { id: 'b-' + Date.now(), sender: 'bot', node: nextNode, time };
            setSimMessages(prev => [...prev, userMsg, botMsg]);
            setCurrentSimNodeId(nextNode.id);
        } else {
            const botEndMsg = { id: 'b-' + Date.now(), sender: 'bot', text: 'End of configured flow branch.', time };
            setSimMessages(prev => [...prev, userMsg, botEndMsg]);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden bg-slate-950 text-slate-100">
            {/* Top Toolbar */}
            <header className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <GitFork className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={activeFlow?.name || ''}
                                onChange={(e) => updateActiveFlowMeta('name', e.target.value)}
                                className="font-bold text-base bg-transparent border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none text-white px-1 -ml-1 transition"
                            />
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {activeFlow?.status || 'Active'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Trigger keyword: <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded font-mono">{activeFlow?.triggerKeyword || 'MENU'}</code>
                            <span className="mx-2">•</span>
                            {activeFlow?.nodes?.length || 0} Nodes connected
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                            onClick={() => setViewMode('canvas')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                viewMode === 'canvas' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Graph Canvas
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                viewMode === 'list' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Linear List
                        </button>
                    </div>

                    {/* Add Node Menu */}
                    <div className="relative group">
                        <button className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                            <Plus className="w-4 h-4 text-emerald-400" />
                            Add Node
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50">
                            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Interactive Elements</p>
                            {NODE_TYPES.slice(1, 4).map(t => (
                                <button
                                    key={t.type}
                                    onClick={() => handleAddNode(t.type)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-left text-xs text-slate-200 hover:text-white transition"
                                >
                                    <t.icon className="w-4 h-4 text-emerald-400" />
                                    <div>
                                        <div className="font-semibold">{t.label}</div>
                                        <div className="text-[10px] text-slate-400">{t.description}</div>
                                    </div>
                                </button>
                            ))}
                            <div className="my-1 border-t border-slate-800" />
                            <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Logic & Handover</p>
                            {NODE_TYPES.slice(4).map(t => (
                                <button
                                    key={t.type}
                                    onClick={() => handleAddNode(t.type)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-left text-xs text-slate-200 hover:text-white transition"
                                >
                                    <t.icon className="w-4 h-4 text-teal-400" />
                                    <div>
                                        <div className="font-semibold">{t.label}</div>
                                        <div className="text-[10px] text-slate-400">{t.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Save & Deploy to Server */}
                    <button
                        onClick={handleSaveAndDeploy}
                        disabled={isSaving}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                        title="Deploy active flows directly to WhatsApp server engine"
                    >
                        {isSaving ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <CloudUpload className="w-3.5 h-3.5" />
                        )}
                        Save & Deploy
                    </button>

                    {/* Simulator Trigger */}
                    <button
                        onClick={() => {
                            setIsSimOpen(true);
                            resetSimulator();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-white/10 transition"
                    >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Test in Mobile
                    </button>
                </div>
            </header>

            {/* Main Interactive Canvas Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {viewMode === 'canvas' ? (
                    <div
                        className="flex-1 h-full relative cursor-grab active:cursor-grabbing select-none overflow-hidden"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        style={{
                            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
                            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                            backgroundColor: '#090d16'
                        }}
                    >
                        {/* SVG Connection Wires Layer */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <defs>
                                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                    <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                                </marker>
                                <marker id="arrowhead-cyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                    <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
                                </marker>
                                <marker id="arrowhead-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                    <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                                </marker>
                            </defs>
                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                                {edges.map(edge => {
                                    const sourceNode = activeFlow.nodes.find(n => n.id === edge.sourceId);
                                    const targetNode = activeFlow.nodes.find(n => n.id === edge.targetId);
                                    if (!sourceNode || !targetNode) return null;

                                    // Compute handle positions
                                    const nodeWidth = 260;
                                    const startX = sourceNode.x + nodeWidth;
                                    
                                    // Y offset based on slot index for multi-buttons
                                    let startY = sourceNode.y + 50;
                                    if (edge.slotIndex !== undefined) {
                                        startY = sourceNode.y + 80 + (edge.slotIndex * 34);
                                    } else if (edge.label === 'Yes (True)') {
                                        startY = sourceNode.y + 70;
                                    } else if (edge.label === 'No (False)') {
                                        startY = sourceNode.y + 104;
                                    }

                                    const endX = targetNode.x;
                                    const endY = targetNode.y + 40;

                                    // Cubic Bezier curve control points
                                    const dx = Math.max(80, Math.abs(endX - startX) * 0.5);
                                    const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
                                    const markerId = edge.color === '#ef4444' ? 'url(#arrowhead-red)' : (edge.color === '#06b6d4' ? 'url(#arrowhead-cyan)' : 'url(#arrowhead)');

                                    return (
                                        <g key={edge.id}>
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke={edge.color}
                                                strokeWidth="2.5"
                                                strokeDasharray={edge.label === 'No (False)' ? '4,4' : 'none'}
                                                markerEnd={markerId}
                                                className="transition-all opacity-85 hover:opacity-100"
                                            />
                                            {edge.label && (
                                                <g transform={`translate(${(startX + endX) / 2}, ${(startY + endY) / 2})`}>
                                                    <rect
                                                        x="-40"
                                                        y="-11"
                                                        width="80"
                                                        height="22"
                                                        rx="11"
                                                        fill="#0f172a"
                                                        stroke={edge.color}
                                                        strokeWidth="1.2"
                                                    />
                                                    <text
                                                        x="0"
                                                        y="3.5"
                                                        textAnchor="middle"
                                                        fill="#f1f5f9"
                                                        fontSize="9"
                                                        fontWeight="600"
                                                    >
                                                        {edge.label.length > 12 ? edge.label.slice(0, 11) + '…' : edge.label}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>

                        {/* Interactive Node Tiles on Canvas */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                transformOrigin: '0 0'
                            }}
                        >
                            {activeFlow?.nodes?.map(node => {
                                const isSelected = selectedNodeId === node.id;
                                const typeMeta = NODE_TYPES.find(t => t.type === node.type) || NODE_TYPES[3];
                                const cfg = node.config || {};

                                return (
                                    <div
                                        key={node.id}
                                        onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                        className={`flow-node-card absolute w-[260px] rounded-2xl border transition-shadow cursor-grab active:cursor-grabbing pointer-events-auto select-none ${
                                            isSelected 
                                                ? 'bg-slate-900/95 border-emerald-500 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30' 
                                                : 'bg-slate-900/85 border-slate-800 hover:border-slate-700 shadow-lg'
                                        }`}
                                        style={{
                                            left: `${node.x}px`,
                                            top: `${node.y}px`
                                        }}
                                    >
                                        {/* Node Header */}
                                        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400`}>
                                                    <typeMeta.icon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="font-bold text-xs text-white truncate">
                                                    {node.title}
                                                </span>
                                            </div>

                                            {node.type !== 'start' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNode(node.id);
                                                    }}
                                                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Node Content Preview */}
                                        <div className="p-3 space-y-2 text-xs">
                                            {node.type === 'start' && (
                                                <p className="text-[11px] text-slate-400">
                                                    Keyword match: <span className="text-emerald-400 font-mono font-semibold">{cfg.keyword}</span>
                                                </p>
                                            )}

                                            {node.type === 'send_buttons' && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[11px] text-slate-300 line-clamp-2">
                                                        {cfg.bodyText}
                                                    </p>
                                                    <div className="space-y-1 pt-1">
                                                        {(cfg.buttons || []).map((btn, bIdx) => (
                                                            <div 
                                                                key={btn.id || bIdx}
                                                                className="flex items-center justify-between px-2 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[10px]"
                                                            >
                                                                <span className="font-semibold text-teal-300 truncate max-w-[170px]">{btn.label}</span>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0" title="Outgoing wire outlet" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {node.type === 'send_message' && (
                                                <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                                                    {cfg.text || 'Empty message...'}
                                                </p>
                                            )}

                                            {node.type === 'condition' && (
                                                <div className="space-y-1.5 text-[11px]">
                                                    <div className="text-slate-400">
                                                        If <span className="text-amber-400 font-mono">{cfg.variableName}</span> {cfg.operator} <span className="text-white font-mono">{cfg.expectedValue}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                                                        <span>True / Yes Path</span>
                                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/40 text-rose-400">
                                                        <span>False / No Path</span>
                                                        <div className="w-2 h-2 rounded-full bg-rose-400" />
                                                    </div>
                                                </div>
                                            )}

                                            {node.type === 'collect_input' && (
                                                <div className="space-y-1 text-[11px]">
                                                    <p className="text-slate-300 line-clamp-2">{cfg.promptText}</p>
                                                    <p className="text-[10px] text-indigo-400 font-mono">Stores in: ${cfg.variableName}</p>
                                                </div>
                                            )}

                                            {node.type === 'handoff' && (
                                                <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-800/30 text-rose-300 text-[11px]">
                                                    <span className="font-semibold block">Transfers to Live Agent</span>
                                                    <span className="text-[10px] text-slate-400">{cfg.assignTo}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Target Outlet Port (for single outgoing nodes) */}
                                        {['start', 'send_message', 'collect_input', 'send_media'].includes(node.type) && (
                                            <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/50 pt-1.5">
                                                <span>Next step:</span>
                                                <span className="text-emerald-400 font-mono font-semibold">
                                                    {cfg.nextNodeId ? activeFlow.nodes.find(n => n.id === cfg.nextNodeId)?.title?.slice(0, 15) : 'None (End)'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Floating Canvas Controls */}
                        <div className="canvas-ui-control absolute bottom-5 left-6 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 backdrop-blur-md shadow-xl z-20">
                            <button
                                onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
                                title="Zoom In"
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[3rem] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
                                title="Zoom Out"
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-800 mx-1" />
                            <button
                                onClick={() => { setZoom(1); setPan({ x: 20, y: 20 }); }}
                                title="Reset View"
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Linear List View */
                    <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Layers className="w-5 h-5 text-emerald-400" />
                                Step Sequence View ({activeFlow.nodes.length} Steps)
                            </h2>
                            <span className="text-xs text-slate-400">Read order of automated flow tree</span>
                        </div>

                        <div className="space-y-3">
                            {activeFlow.nodes.map((node, idx) => (
                                <div
                                    key={node.id}
                                    onClick={() => setSelectedNodeId(node.id)}
                                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                                        selectedNodeId === node.id 
                                            ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/20' 
                                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center text-emerald-400">
                                                {idx + 1}
                                            </span>
                                            <h3 className="font-bold text-sm text-white">{node.title}</h3>
                                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                {node.type}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                                            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" /> Configure
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 ml-8">
                                        {node.config?.bodyText || node.config?.text || node.config?.keyword || 'Configured node'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Right Slide-Over: Node Configuration Drawer */}
                {activeNode && (
                    <aside className="w-96 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col shrink-0 z-30 shadow-2xl">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-emerald-400" />
                                <h3 className="font-bold text-sm text-white">Configure Node</h3>
                            </div>
                            <button
                                onClick={() => setSelectedNodeId(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Node Settings Form */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">Node Title</label>
                                <input
                                    type="text"
                                    value={activeNode.title}
                                    onChange={(e) => updateNode(activeNode.id, { title: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Start Node Config */}
                            {activeNode.type === 'start' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Trigger Keywords (comma separated)</label>
                                        <input
                                            type="text"
                                            value={activeNode.config?.keyword || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, keyword: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Target First Node</label>
                                        <select
                                            value={activeNode.config?.nextNodeId || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, nextNodeId: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                                        >
                                            <option value="">-- Choose next step --</option>
                                            {activeFlow.nodes.filter(n => n.id !== activeNode.id).map(n => (
                                                <option key={n.id} value={n.id}>{n.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Buttons Node Config */}
                            {activeNode.type === 'send_buttons' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Header Text (Optional)</label>
                                        <input
                                            type="text"
                                            value={activeNode.config?.headerText || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, headerText: e.target.value } }))}
                                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Message Body *</label>
                                        <textarea
                                            rows={3}
                                            value={activeNode.config?.bodyText || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, bodyText: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>

                                    {/* Action Buttons & Outlets */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center justify-between">
                                            <label className="font-bold text-slate-300 uppercase text-[10px]">Quick Reply Buttons (Max 3)</label>
                                            {(activeNode.config?.buttons || []).length < 3 && (
                                                <button
                                                    onClick={() => {
                                                        const newBtn = { id: `b-${Date.now().toString(36)}`, label: 'New Option', targetNodeId: '' };
                                                        updateNode(activeNode.id, prev => ({
                                                            ...prev,
                                                            config: { ...prev.config, buttons: [...(prev.config.buttons || []), newBtn] }
                                                        }));
                                                    }}
                                                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Button
                                                </button>
                                            )}
                                        </div>

                                        {(activeNode.config?.buttons || []).map((btn, idx) => (
                                            <div key={btn.id || idx} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <input
                                                        type="text"
                                                        value={btn.label}
                                                        onChange={(e) => {
                                                            const nextBtns = [...activeNode.config.buttons];
                                                            nextBtns[idx] = { ...nextBtns[idx], label: e.target.value };
                                                            updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, buttons: nextBtns } }));
                                                        }}
                                                        placeholder="Button Label"
                                                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs font-semibold flex-1"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const nextBtns = activeNode.config.buttons.filter((_, i) => i !== idx);
                                                            updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, buttons: nextBtns } }));
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-rose-400"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] text-slate-400 mb-0.5">Connect to Node Branch:</label>
                                                    <select
                                                        value={btn.targetNodeId || ''}
                                                        onChange={(e) => {
                                                            const nextBtns = [...activeNode.config.buttons];
                                                            nextBtns[idx] = { ...nextBtns[idx], targetNodeId: e.target.value };
                                                            updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, buttons: nextBtns } }));
                                                        }}
                                                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-teal-300 text-xs"
                                                    >
                                                        <option value="">-- No branch connected --</option>
                                                        {activeFlow.nodes.filter(n => n.id !== activeNode.id).map(n => (
                                                            <option key={n.id} value={n.id}>{n.title}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Plain Message Config */}
                            {activeNode.type === 'send_message' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Message Text *</label>
                                        <textarea
                                            rows={4}
                                            value={activeNode.config?.text || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, text: e.target.value } }))}
                                            placeholder="Write message... Use {{lead_name}} for personalization"
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Advance to Next Node</label>
                                        <select
                                            value={activeNode.config?.nextNodeId || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, nextNodeId: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                                        >
                                            <option value="">-- Terminal step (End) --</option>
                                            {activeFlow.nodes.filter(n => n.id !== activeNode.id).map(n => (
                                                <option key={n.id} value={n.id}>{n.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Condition Node Config */}
                            {activeNode.type === 'condition' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Variable Name</label>
                                        <input
                                            type="text"
                                            value={activeNode.config?.variableName || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, variableName: e.target.value } }))}
                                            placeholder="e.g. contact.tag, vars.budget"
                                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Operator</label>
                                        <select
                                            value={activeNode.config?.operator || 'equals'}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, operator: e.target.value } }))}
                                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        >
                                            <option value="equals">Equals</option>
                                            <option value="contains">Contains</option>
                                            <option value="greater_than">Greater than</option>
                                            <option value="is_set">Is Set (Not Empty)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Match Value</label>
                                        <input
                                            type="text"
                                            value={activeNode.config?.expectedValue || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, expectedValue: e.target.value } }))}
                                            placeholder="e.g. VIP, 1000"
                                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-slate-800 space-y-2">
                                        <div>
                                            <label className="block text-emerald-400 font-bold mb-0.5">True / Yes Branch Target</label>
                                            <select
                                                value={activeNode.config?.yesNodeId || ''}
                                                onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, yesNodeId: e.target.value } }))}
                                                className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-emerald-500/40 text-emerald-300"
                                            >
                                                <option value="">-- No target --</option>
                                                {activeFlow.nodes.filter(n => n.id !== activeNode.id).map(n => (
                                                    <option key={n.id} value={n.id}>{n.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-rose-400 font-bold mb-0.5">False / No Branch Target</label>
                                            <select
                                                value={activeNode.config?.noNodeId || ''}
                                                onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, noNodeId: e.target.value } }))}
                                                className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-rose-500/40 text-rose-300"
                                            >
                                                <option value="">-- No target --</option>
                                                {activeFlow.nodes.filter(n => n.id !== activeNode.id).map(n => (
                                                    <option key={n.id} value={n.id}>{n.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Collect Input Config */}
                            {activeNode.type === 'collect_input' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Prompt Question *</label>
                                        <textarea
                                            rows={3}
                                            value={activeNode.config?.promptText || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, promptText: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Store into Variable Name</label>
                                        <input
                                            type="text"
                                            value={activeNode.config?.variableName || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, variableName: e.target.value } }))}
                                            placeholder="e.g. user_email, company_name"
                                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Advance to Node</label>
                                        <select
                                            value={activeNode.config?.nextNodeId || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, nextNodeId: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                                        >
                                            <option value="">-- Terminal step --</option>
                                            {activeFlow.nodes.filter(n => n.id !== activeNode.id).map(n => (
                                                <option key={n.id} value={n.id}>{n.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Handoff Config */}
                            {activeNode.type === 'handoff' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Assign to Agent or Department</label>
                                        <input
                                            type="text"
                                            value={activeNode.config?.assignTo || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, assignTo: e.target.value } }))}
                                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1">Internal Handover Note</label>
                                        <textarea
                                            rows={3}
                                            value={activeNode.config?.note || ''}
                                            onChange={(e) => updateNode(activeNode.id, prev => ({ ...prev, config: { ...prev.config, note: e.target.value } }))}
                                            placeholder="Reason for escalation..."
                                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Confirmation Button */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
                            <button
                                onClick={() => {
                                    toast.success("Node configuration updated!");
                                    setSelectedNodeId(null);
                                }}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
                            >
                                <Check className="w-4 h-4" /> Done Editing
                            </button>
                        </div>
                    </aside>
                )}
            </div>

            {/* Live WhatsApp Mobile Simulation Modal */}
            {isSimOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-[360px] rounded-[40px] bg-slate-950 border-4 border-slate-800 shadow-2xl p-3 flex flex-col">
                        {/* Device Notch */}
                        <div className="h-5 flex items-center justify-between px-6 text-[10px] text-slate-400 font-medium">
                            <span>09:41</span>
                            <div className="w-16 h-3 bg-slate-900 rounded-full" />
                            <span>5G 100%</span>
                        </div>

                        {/* WhatsApp Window */}
                        <div className="h-[580px] rounded-[28px] overflow-hidden flex flex-col bg-[#0b141a] text-white">
                            {/* WhatsApp Header */}
                            <div className="bg-[#202c33] px-3.5 py-3 flex items-center justify-between border-b border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                                        W
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-100">{activeFlow.name}</div>
                                        <div className="text-[10px] text-emerald-400">● Interactive Preview</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSimOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Chat Thread */}
                            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-[11px] bg-radial from-[#111b21] to-[#0b141a]">
                                {simMessages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className={`max-w-[88%] rounded-xl p-2.5 shadow ${
                                            msg.sender === 'user'
                                                ? 'bg-[#005c4b] text-slate-100 rounded-tr-none'
                                                : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-slate-800'
                                        }`}>
                                            {msg.node?.config?.headerText && (
                                                <div className="font-bold text-emerald-400 text-[11px] mb-1">
                                                    {msg.node.config.headerText}
                                                </div>
                                            )}
                                            <div className="leading-relaxed whitespace-pre-wrap">
                                                {msg.node?.config?.bodyText || msg.node?.config?.text || msg.node?.config?.promptText || msg.text}
                                            </div>
                                            {msg.node?.config?.footerText && (
                                                <div className="text-[9px] text-slate-400 mt-1 italic">
                                                    {msg.node.config.footerText}
                                                </div>
                                            )}
                                            <div className="text-[8px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                                                <span>{msg.time}</span>
                                                {msg.sender === 'user' && <CheckCheck className="w-2.5 h-2.5 text-sky-400" />}
                                            </div>
                                        </div>

                                        {/* Buttons */}
                                        {msg.node?.config?.buttons && (
                                            <div className="w-[88%] space-y-1 mt-1">
                                                {msg.node.config.buttons.map(btn => (
                                                    <button
                                                        key={btn.id}
                                                        onClick={() => handleSimButtonClick(btn)}
                                                        className="w-full py-1.5 px-3 rounded-lg bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] transition text-center shadow-sm active:scale-95"
                                                    >
                                                        {btn.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Reset Bar */}
                            <div className="p-2 bg-[#202c33] border-t border-slate-800 flex items-center justify-between text-xs">
                                <span className="text-[10px] text-slate-400">Node: {currentSimNodeId}</span>
                                <button
                                    onClick={resetSimulator}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                                >
                                    <RefreshCw className="w-3 h-3" /> Restart Flow
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
