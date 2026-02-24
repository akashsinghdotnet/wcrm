import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Phone, Mail, Globe, Megaphone, PenLine, GripVertical, User } from 'lucide-react';

const COLUMNS = [
    { status: 'new', label: 'New', color: 'from-blue-600 to-blue-500', badge: 'bg-blue-500', border: 'border-blue-500/30' },
    { status: 'contacted', label: 'Contacted', color: 'from-cyan-600 to-cyan-500', badge: 'bg-cyan-500', border: 'border-cyan-500/30' },
    { status: 'follow_up', label: 'Follow Up', color: 'from-amber-600 to-amber-500', badge: 'bg-amber-500', border: 'border-amber-500/30' },
    { status: 'converted', label: 'Converted', color: 'from-emerald-600 to-emerald-500', badge: 'bg-emerald-500', border: 'border-emerald-500/30' },
    { status: 'lost', label: 'Lost', color: 'from-red-600 to-red-500', badge: 'bg-red-500', border: 'border-red-500/30' },
];

const SOURCE_ICON = {
    meta_ads: Megaphone,
    google_ads: Globe,
    justdial: Phone,
    website: Globe,
    manual: PenLine,
};

export default function PipelinePage() {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedLead, setDraggedLead] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);
    const columnsRef = useRef({});

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            setLoading(true);
            const res = await api.get('/leads', { params: { companyId: user.companyId } });
            setLeads(res.data.data || []);
        } catch {
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    };

    const getLeadsByStatus = (status) => leads.filter((l) => l.status === status);

    // --- Drag handlers ---
    const handleDragStart = (e, lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', lead.id);
        // Make the drag image slightly transparent
        setTimeout(() => {
            e.target.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedLead(null);
        setDragOverCol(null);
    };

    const handleDragOver = (e, status) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(status);
    };

    const handleDragLeave = () => {
        setDragOverCol(null);
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        setDragOverCol(null);

        if (!draggedLead || draggedLead.status === targetStatus) return;

        const oldStatus = draggedLead.status;

        // Optimistic update
        setLeads((prev) =>
            prev.map((l) => (l.id === draggedLead.id ? { ...l, status: targetStatus } : l))
        );

        try {
            await api.patch(`/leads/${draggedLead.id}`, { status: targetStatus });
            toast.success(`Moved to ${COLUMNS.find((c) => c.status === targetStatus)?.label}`);
        } catch {
            // Revert on failure
            setLeads((prev) =>
                prev.map((l) => (l.id === draggedLead.id ? { ...l, status: oldStatus } : l))
            );
            toast.error('Failed to update lead status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Pipeline</h2>
                    <p className="text-slate-400 mt-1">Drag leads between stages to update their status</p>
                </div>
                <div className="text-sm text-slate-500">{leads.length} total leads</div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 12rem)' }}>
                {COLUMNS.map((col) => {
                    const colLeads = getLeadsByStatus(col.status);
                    const isOver = dragOverCol === col.status;
                    return (
                        <div
                            key={col.status}
                            ref={(el) => (columnsRef.current[col.status] = el)}
                            className={`flex-shrink-0 w-64 flex flex-col rounded-2xl transition-all duration-200 ${isOver
                                ? `bg-slate-800/80 ring-2 ring-indigo-500/50 ${col.border}`
                                : 'bg-slate-900/60'
                                }`}
                            onDragOver={(e) => handleDragOver(e, col.status)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.status)}
                        >
                            {/* Column Header */}
                            <div className={`p-3 rounded-t-2xl bg-gradient-to-r ${col.color}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white">{col.label}</h3>
                                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-white/20 text-white">
                                        {colLeads.length}
                                    </span>
                                </div>
                            </div>

                            {/* Lead Cards */}
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                                {colLeads.length === 0 && (
                                    <div className={`text-center py-8 text-xs text-slate-600 border-2 border-dashed rounded-xl transition-colors ${isOver ? 'border-indigo-500/50 text-indigo-400' : 'border-slate-800'
                                        }`}>
                                        {isOver ? 'Drop here' : 'No leads'}
                                    </div>
                                )}

                                {colLeads.map((lead) => {
                                    const SrcIcon = SOURCE_ICON[lead.source] || Globe;
                                    return (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead)}
                                            onDragEnd={handleDragEnd}
                                            className={`p-3 bg-slate-800 border border-slate-700 rounded-xl cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all group ${draggedLead?.id === lead.id ? 'ring-2 ring-indigo-500 opacity-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                                                    {lead.phone && (
                                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                            <Phone size={10} /> {lead.phone}
                                                        </p>
                                                    )}
                                                </div>
                                                <GripVertical size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5" />
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <SrcIcon size={10} />
                                                    <span>{lead.source?.replace('_', ' ')}</span>
                                                </div>
                                                {lead.assignedUser && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500" title={lead.assignedUser.email}>
                                                        <User size={10} />
                                                        <span className="truncate max-w-[60px]">
                                                            {lead.assignedUser.email?.split('@')[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
