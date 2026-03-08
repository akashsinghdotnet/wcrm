import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, MicOff, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Device } from '@twilio/voice-sdk';

const DISPOSITIONS = [
    { value: 'interested', label: 'Interested', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
    { value: 'not_interested', label: 'Not Interested', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    { value: 'callback', label: 'Callback Later', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { value: 'no_answer', label: 'No Answer', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
    { value: 'wrong_number', label: 'Wrong Number', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
    { value: 'other', label: 'Other', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
];

export default function BrowserDialer({ lead, onClose }) {
    const { user } = useAuth();
    const [callState, setCallState] = useState('idle'); // idle, connecting, ringing, in-progress, completed, failed
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);
    const [callLogId, setCallLogId] = useState(null);
    const [disposition, setDisposition] = useState('');
    const [notes, setNotes] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);
    const [deviceReady, setDeviceReady] = useState(false);
    const [loadingDevice, setLoadingDevice] = useState(true);

    const deviceRef = useRef(null);
    const connectionRef = useRef(null);
    const timerRef = useRef(null);

    // Initialize Twilio Device
    useEffect(() => {
        initializeDevice();
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (connectionRef.current) {
            try { connectionRef.current.disconnect(); } catch { }
        }
        if (deviceRef.current) {
            try { deviceRef.current.destroy(); } catch { }
        }
    };

    const initializeDevice = async () => {
        try {
            // Get access token from backend
            const res = await api.get('/calling/token');
            const token = res.data.token;

            const device = new Device(token, {
                codecPreferences: [Device.Codec.Opus, Device.Codec.PCMU],
                enableRingingState: true,
            });

            device.on('registered', () => {
                setDeviceReady(true);
                setLoadingDevice(false);
            });

            device.on('error', (err) => {
                console.error('Twilio Device error:', err);
                toast.error(`Call error: ${err.message}`);
                setCallState('failed');
            });

            await device.register();
            deviceRef.current = device;
        } catch (err) {
            console.error('Failed to init Twilio:', err);
            toast.error(err.response?.data?.message || 'Failed to initialize calling. Check Twilio settings.');
            setLoadingDevice(false);
        }
    };

    const startCall = async () => {
        if (!deviceRef.current || !lead.phone) return;

        setCallState('connecting');

        try {
            // Create call log in backend
            const logRes = await api.post('/calling/call', {
                leadId: lead.id,
                phoneNumber: lead.phone,
            });
            setCallLogId(logRes.data.id);

            // Format phone number
            const phone = formatPhone(lead.phone);

            // Make the call via Twilio Device
            const call = await deviceRef.current.connect({
                params: {
                    To: phone,
                },
            });

            connectionRef.current = call;

            call.on('ringing', () => {
                setCallState('ringing');
            });

            call.on('accept', () => {
                setCallState('in-progress');
                startTimer();

                // Update call SID in backend
                if (call.parameters?.CallSid) {
                    api.patch(`/calling/call/${logRes.data.id}/sid`, {
                        twilioCallSid: call.parameters.CallSid,
                    }).catch(() => { });
                }
            });

            call.on('disconnect', () => {
                setCallState('completed');
                stopTimer();
            });

            call.on('cancel', () => {
                setCallState('completed');
                stopTimer();
            });

            call.on('error', (err) => {
                console.error('Call error:', err);
                setCallState('failed');
                stopTimer();
            });
        } catch (err) {
            console.error('Call failed:', err);
            toast.error('Failed to connect call');
            setCallState('failed');
        }
    };

    const endCall = () => {
        if (connectionRef.current) {
            connectionRef.current.disconnect();
        }
        setCallState('completed');
        stopTimer();
    };

    const toggleMute = () => {
        if (connectionRef.current) {
            const newMuted = !muted;
            connectionRef.current.mute(newMuted);
            setMuted(newMuted);
        }
    };

    const startTimer = () => {
        setDuration(0);
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatPhone = (phone) => {
        const digits = phone.replace(/[^0-9]/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (!phone.startsWith('+')) return `+${digits}`;
        return phone;
    };

    const handleSaveNotes = async () => {
        if (!callLogId) return;
        setSavingNotes(true);
        try {
            await api.patch(`/calling/call/${callLogId}/notes`, { disposition, notes });
            toast.success('Call notes saved');
            onClose();
        } catch {
            toast.error('Failed to save notes');
        } finally {
            setSavingNotes(false);
        }
    };

    const isCallActive = ['connecting', 'ringing', 'in-progress'].includes(callState);
    const isCallEnded = ['completed', 'failed'].includes(callState);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCallActive ? 'bg-green-500/20' : isCallEnded ? 'bg-slate-700' : 'bg-blue-500/20'}`}>
                            <Phone size={18} className={isCallActive ? 'text-green-400' : isCallEnded ? 'text-slate-400' : 'text-blue-400'} />
                        </div>
                        <div>
                            <p className="text-white font-semibold text-sm">{lead.name || 'Unknown'}</p>
                            <p className="text-slate-400 text-xs">{lead.phone}</p>
                        </div>
                    </div>
                    {!isCallActive && (
                        <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Call Status & Timer */}
                <div className="p-8 text-center space-y-4">
                    {/* Status */}
                    <div>
                        {callState === 'idle' && loadingDevice && (
                            <div className="flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">Initializing...</span>
                            </div>
                        )}
                        {callState === 'idle' && !loadingDevice && deviceReady && (
                            <p className="text-slate-400 text-sm">Ready to call</p>
                        )}
                        {callState === 'idle' && !loadingDevice && !deviceReady && (
                            <p className="text-red-400 text-sm">Calling not available. Check Twilio settings.</p>
                        )}
                        {callState === 'connecting' && (
                            <div className="flex items-center justify-center gap-2 text-amber-400">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">Connecting...</span>
                            </div>
                        )}
                        {callState === 'ringing' && (
                            <div className="flex items-center justify-center gap-2 text-blue-400">
                                <Phone size={16} className="animate-pulse" />
                                <span className="text-sm">Ringing...</span>
                            </div>
                        )}
                        {callState === 'in-progress' && (
                            <div className="flex items-center justify-center gap-2 text-green-400">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-sm">In Progress</span>
                            </div>
                        )}
                        {callState === 'completed' && (
                            <div className="flex items-center justify-center gap-2 text-slate-300">
                                <CheckCircle size={16} />
                                <span className="text-sm">Call Ended</span>
                            </div>
                        )}
                        {callState === 'failed' && (
                            <div className="flex items-center justify-center gap-2 text-red-400">
                                <XCircle size={16} />
                                <span className="text-sm">Call Failed</span>
                            </div>
                        )}
                    </div>

                    {/* Timer */}
                    {(isCallActive || isCallEnded) && (
                        <div className="text-3xl font-mono text-white tracking-wider">
                            {formatDuration(duration)}
                        </div>
                    )}

                    {/* Call Controls */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                        {callState === 'idle' && deviceReady && (
                            <button
                                onClick={startCall}
                                className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 transition-all cursor-pointer"
                            >
                                <Phone size={22} />
                            </button>
                        )}

                        {isCallActive && (
                            <>
                                <button
                                    onClick={toggleMute}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${muted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
                                >
                                    {muted ? <MicOff size={18} /> : <Mic size={18} />}
                                </button>
                                <button
                                    onClick={endCall}
                                    className="w-14 h-14 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all cursor-pointer"
                                >
                                    <PhoneOff size={22} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Post-call: Disposition & Notes */}
                {isCallEnded && callLogId && (
                    <div className="p-4 border-t border-slate-800 space-y-3">
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Call Outcome</p>
                        <div className="flex flex-wrap gap-2">
                            {DISPOSITIONS.map(d => (
                                <button
                                    key={d.value}
                                    onClick={() => setDisposition(d.value)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${disposition === d.value ? d.color + ' ring-1 ring-current' : 'text-slate-400 bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Call notes (optional)..."
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveNotes}
                                disabled={savingNotes || !disposition}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Save & Close
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl font-medium transition-all cursor-pointer border border-slate-700"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
