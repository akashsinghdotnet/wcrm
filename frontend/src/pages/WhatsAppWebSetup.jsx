import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function WhatsAppWebSetup() {
    const [statusData, setStatusData] = useState({
        active: false,
        status: 'disconnected',
        phoneNumber: null,
        qrCode: null
    });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/whatsapp-web/status');
            setStatusData(res.data);
        } catch (err) {
            console.error('Failed to fetch whatsapp web status', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            fetchStatus();
        }, 3000); // Poll every 3 seconds to get immediate QR or status updates
        
        return () => clearInterval(interval);
    }, []);

    const handleStartSession = async () => {
        setActionLoading(true);
        try {
            await api.post('/whatsapp-web/start');
            toast.success('Scanner process starting. Please wait...');
            await fetchStatus();
        } catch (err) {
            toast.error('Failed to start session');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = async () => {
        setActionLoading(true);
        try {
            await api.post('/whatsapp-web/logout');
            toast.success('Logged out successfully');
            await fetchStatus();
        } catch (err) {
            toast.error('Failed to logout');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center flex-col gap-4 items-center h-[50vh]">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading WhatsApp Web status...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="inline text-green-500" /> WhatsApp Web Setup
                </h1>
                <p className="text-gray-500 dark:text-slate-400 mt-2">
                    Connect your CRM directly to your physical physical phone using standard WhatsApp Web (QR code scan). This bypasses the Meta Cloud API.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col items-center">
                
                {statusData.status === 'connected' ? (
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={48} className="text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Device Connected successfully!</h2>
                            <p className="text-gray-500 dark:text-slate-400 mt-2">Active Number: <span className="font-semibold text-gray-900 dark:text-gray-300">+{statusData.phoneNumber}</span></p>
                        </div>
                        <p className="max-w-md text-sm text-gray-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            Your WhatsApp is actively connected. To send and receive messages from the CRM, make sure your phone remains connected to the internet.
                        </p>
                        <button 
                            onClick={handleLogout}
                            disabled={actionLoading}
                            className="mt-4 flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl font-medium transition-colors"
                        >
                            <LogOut size={18} />
                            Disconnect Phone
                        </button>
                    </div>
                ) : statusData.status === 'qr_ready' && statusData.qrCode ? (
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-4 bg-white rounded-3xl shadow-xl shadow-black/5 ring-1 ring-black/5">
                            <img src={statusData.qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain rounded-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scan to Connect</h2>
                            <p className="text-gray-500 dark:text-slate-400 max-w-sm mt-3 text-sm">
                                Open WhatsApp on your phone.<br/>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>. Tap on <strong>Link a Device</strong> and point your camera at this screen.
                            </p>
                        </div>
                        <button 
                            onClick={handleStartSession}
                            disabled={actionLoading}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm flex items-center gap-1 mt-4 transition-colors"
                        >
                            <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
                            Refresh QR Code
                        </button>
                    </div>
                ) : statusData.status === 'connecting' ? (
                    <div className="flex flex-col items-center text-center space-y-6 py-12">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-green-100 dark:border-slate-700 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                            <QrCode className="absolute inset-0 m-auto text-green-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generating QR Code</h2>
                            <p className="text-gray-500 dark:text-slate-400 mt-2">Starting secure headless browser session...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center space-y-6 py-8">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <QrCode size={40} className="text-gray-400 dark:text-slate-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Not Connected</h2>
                            <p className="text-gray-500 dark:text-slate-400 max-w-sm mt-2 text-sm leading-relaxed">
                                You are not currently connected to WhatsApp Web. Since you have set your provider to WEB_JS, you must scan a physical phone to use messages.
                            </p>
                        </div>
                        <button 
                            onClick={handleStartSession}
                            disabled={actionLoading}
                            className="mt-4 px-8 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center gap-2"
                        >
                            {actionLoading ? <RefreshCw size={20} className="animate-spin" /> : <QrCode size={20} />}
                            Generate Secure QR Code
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
