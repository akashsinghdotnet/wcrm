import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, X, User, FileText } from 'lucide-react';

export default function SearchBar() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ leads: [], clients: [] });
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    // ⌘K / Ctrl+K shortcut
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // Click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Debounced search
    const debounceTimer = useRef(null);
    const searchApi = useCallback((q) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!q || q.length < 2) {
            setResults({ leads: [], clients: [] });
            return;
        }
        debounceTimer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get('/dashboard/search', { params: { q } });
                setResults(res.data);
            } catch {
                setResults({ leads: [], clients: [] });
            } finally {
                setLoading(false);
            }
        }, 300);
    }, []);

    const handleChange = (e) => {
        setQuery(e.target.value);
        searchApi(e.target.value);
    };

    const handleSelect = (type, item) => {
        setOpen(false);
        setQuery('');
        setResults({ leads: [], clients: [] });
        if (type === 'lead') navigate('/leads');
        else navigate('/clients');
    };

    const hasResults = results.leads.length > 0 || results.clients.length > 0;

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger button */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-500 dark:text-slate-400 text-sm hover:border-gray-400 dark:border-slate-600 transition-colors"
            >
                <Search size={14} />
                <span className="hidden sm:inline">Search…</span>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] font-mono text-gray-500 dark:text-slate-400 ml-2">
                    ⌘K
                </kbd>
            </button>

            {/* Search overlay */}
            {open && (
                <div className="absolute top-0 right-0 w-80 sm:w-96 z-50">
                    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
                        {/* Input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-800">
                            <Search size={16} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={handleChange}
                                placeholder="Search leads & clients…"
                                className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm outline-none placeholder-slate-500"
                            />
                            <button onClick={() => setOpen(false)}>
                                <X size={16} className="text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:text-white" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-80 overflow-y-auto">
                            {loading && (
                                <div className="p-4 text-center text-gray-400 dark:text-slate-500 text-sm">Searching…</div>
                            )}

                            {!loading && query.length >= 2 && !hasResults && (
                                <div className="p-4 text-center text-gray-400 dark:text-slate-500 text-sm">No results found</div>
                            )}

                            {results.leads.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase bg-gray-100 dark:bg-slate-800/50">Leads</div>
                                    {results.leads.map((lead) => (
                                        <button
                                            key={lead.id}
                                            onClick={() => handleSelect('lead', lead)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white dark:bg-slate-800 transition-colors text-left"
                                        >
                                            <FileText size={14} className="text-indigo-400 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-white truncate">{lead.name}</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-500">{lead.phone || lead.email || lead.source}</p>
                                            </div>
                                            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${lead.status === 'converted' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    lead.status === 'lost' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                                                }`}>
                                                {lead.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.clients.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase bg-gray-100 dark:bg-slate-800/50">Clients</div>
                                    {results.clients.map((client) => (
                                        <button
                                            key={client.id}
                                            onClick={() => handleSelect('client', client)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white dark:bg-slate-800 transition-colors text-left"
                                        >
                                            <User size={14} className="text-cyan-400 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-white truncate">{client.clientName}</p>
                                                <p className="text-xs text-gray-400 dark:text-slate-500">{client.email || client.phone}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
