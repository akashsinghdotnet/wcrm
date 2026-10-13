import { useState, useEffect } from 'react';
import { Sparkles, Cloud, Server, ShieldCheck, CheckCircle2, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { fetchCommunityFeed } from '../services/communityFeed';

export default function CommunitySettingsCard({ config }) {
    const [feed, setFeed] = useState(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        loadFeed();
    }, []);

    const loadFeed = async () => {
        setChecking(true);
        try {
            const data = await fetchCommunityFeed(config);
            setFeed(data);
        } catch {
            /* ignore */
        } finally {
            setChecking(false);
        }
    };

    const cloudUrl = config?.cloud_url || 'https://wcrm.si';
    const appVersion = config?.app_version || '1.0.0';

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Version & Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <Server className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Wcrm Community Edition</h3>
                                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                    SELF-HOSTED
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                Installed Version: <span className="font-semibold text-gray-700 dark:text-slate-200">v{appVersion}</span> • Dedicated Single-Tenant CRM
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={loadFeed}
                        disabled={checking}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                        {checking ? 'Checking...' : 'Check for Updates'}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">License</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">Open-Source / Community</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Internal business use</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">CRM Modules</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">100% Unlocked</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Inbox, Broadcasts, Flows & AI</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Meta WhatsApp API</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">Direct Cloud API</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Bring your own credentials</p>
                    </div>
                </div>
            </div>

            {/* Cloud Upgrade Showcase */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-emerald-950 p-8 text-white border border-indigo-700/30 shadow-xl">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Managed Cloud Available</span>
                    </div>

                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Tired of managing servers, SSL, and Meta developer apps?
                    </h2>
                    <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                        Upgrade to <strong>Wcrm Managed Cloud</strong>. We manage the high-availability infrastructure, automated database backups, version updates, and 1-click WhatsApp Embedded Signup so you can focus on growing your business.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
                        <div className="space-y-2.5">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-200"><strong>1-Click Meta Embedded Signup</strong> (No developer console setup required)</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-200"><strong>99.9% Uptime Guarantee</strong> on managed high-speed cloud</span>
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-200"><strong>Automated Backups & Updates</strong> with zero downtime</span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="text-xs text-slate-200"><strong>Priority 24/7 WhatsApp & Email Support</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <a
                            href={cloudUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                        >
                            <span>Explore Managed Cloud Plans</span>
                            <ArrowRight className="w-4 h-4" />
                        </a>
                        <a
                            href={config?.github_url || "https://github.com/wcrm-crm/wcrm"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-sm transition-colors border border-white/10"
                        >
                            <span>GitHub Community</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
