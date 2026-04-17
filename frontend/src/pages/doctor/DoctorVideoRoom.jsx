import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import telemedicineService from '../../services/telemedicineService';
import prescriptionService from '../../services/prescriptionService';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Users, Loader2, Wifi, AlertCircle,
    FileText, Plus, Trash2, ChevronRight,
    ChevronLeft, CheckCircle, Save,
} from 'lucide-react';

// ── Empty medication template ─────────────────────────────────────────────────
const emptyMed = () => ({ name: '', dosage: '', frequency: '', duration: '', notes: '' });

// ── Prescription Sidebar ──────────────────────────────────────────────────────
const PrescriptionSidebar = ({ sessionData, appointmentId, patientId, onClose }) => {
    const [medications, setMedications]   = useState([emptyMed()]);
    const [diagnosis, setDiagnosis]       = useState('');
    const [instructions, setInstructions] = useState('');
    const [prescriptionId, setPrescriptionId] = useState(null);
    const [status, setStatus]             = useState('draft');   // 'draft' | 'issued'
    const [saving, setSaving]             = useState(false);
    const [issuing, setIssuing]           = useState(false);
    const [saveMsg, setSaveMsg]           = useState('');       // brief feedback label

    // Load existing prescription for this appointment on mount
    useEffect(() => {
        if (!appointmentId) return;
        prescriptionService.getByAppointment(appointmentId).then(data => {
            if (!data) return;
            setMedications(data.medications.length ? data.medications : [emptyMed()]);
            setDiagnosis(data.diagnosis || '');
            setInstructions(data.instructions || '');
            setPrescriptionId(data._id);
            setStatus(data.status);
        });
    }, [appointmentId]);

    const updateMed = (idx, field, value) => {
        setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
    };

    const addMed    = () => setMedications(prev => [...prev, emptyMed()]);
    const removeMed = (idx) => setMedications(prev => prev.filter((_, i) => i !== idx));

    const payload = useCallback(() => ({
        appointmentId,
        patientId,
        sessionId: sessionData.sessionId,
        medications,
        diagnosis,
        instructions,
    }), [appointmentId, patientId, sessionData, medications, diagnosis, instructions]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const saved = await prescriptionService.save(payload());
            setPrescriptionId(saved._id);
            setStatus(saved.status);
            setSaveMsg('Saved');
            setTimeout(() => setSaveMsg(''), 2000);
        } catch {
            setSaveMsg('Save failed');
            setTimeout(() => setSaveMsg(''), 2500);
        } finally {
            setSaving(false);
        }
    };

    const handleIssue = async () => {
        // Always save first to persist latest edits, then issue
        setIssuing(true);
        try {
            let id = prescriptionId;
            if (!id) {
                const saved = await prescriptionService.save(payload());
                id = saved._id;
                setPrescriptionId(id);
            } else {
                await prescriptionService.save(payload());
            }
            const issued = await prescriptionService.issue(id);
            setStatus(issued.status);
            setSaveMsg('Issued ✓');
        } catch {
            setSaveMsg('Issue failed');
            setTimeout(() => setSaveMsg(''), 2500);
        } finally {
            setIssuing(false);
        }
    };

    const isIssued = status === 'issued';

    return (
        <div className="w-80 shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Prescription
                    {isIssued && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Issued
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

                {/* Diagnosis */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        Diagnosis
                    </label>
                    <textarea
                        rows={2}
                        disabled={isIssued}
                        value={diagnosis}
                        onChange={e => setDiagnosis(e.target.value)}
                        placeholder="Primary diagnosis..."
                        className="w-full bg-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-500 border border-slate-600 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-60"
                    />
                </div>

                {/* Medications */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Medications
                        </label>
                        {!isIssued && (
                            <button
                                onClick={addMed}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {medications.map((med, idx) => (
                            <div key={idx} className="bg-slate-700/60 rounded-xl p-3 border border-slate-600 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400 font-medium">#{idx + 1}</span>
                                    {medications.length > 1 && !isIssued && (
                                        <button
                                            onClick={() => removeMed(idx)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {[
                                    { field: 'name',      placeholder: 'Drug name',      label: 'Name' },
                                    { field: 'dosage',    placeholder: 'e.g. 500mg',     label: 'Dosage' },
                                    { field: 'frequency', placeholder: 'e.g. Twice daily', label: 'Frequency' },
                                    { field: 'duration',  placeholder: 'e.g. 7 days',    label: 'Duration' },
                                ].map(({ field, placeholder, label }) => (
                                    <div key={field}>
                                        <label className="text-xs text-slate-500 mb-0.5 block">{label}</label>
                                        <input
                                            type="text"
                                            disabled={isIssued}
                                            value={med[field]}
                                            onChange={e => updateMed(idx, field, e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 placeholder-slate-600 border border-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                                        />
                                    </div>
                                ))}

                                <div>
                                    <label className="text-xs text-slate-500 mb-0.5 block">Notes (optional)</label>
                                    <input
                                        type="text"
                                        disabled={isIssued}
                                        value={med.notes}
                                        onChange={e => updateMed(idx, 'notes', e.target.value)}
                                        placeholder="Special instructions..."
                                        className="w-full bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 placeholder-slate-600 border border-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* General Instructions */}
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        General Instructions
                    </label>
                    <textarea
                        rows={3}
                        disabled={isIssued}
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        placeholder="Diet, rest, follow-up advice..."
                        className="w-full bg-slate-700 text-white text-sm rounded-xl px-3 py-2 placeholder-slate-500 border border-slate-600 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-60"
                    />
                </div>
            </div>

            {/* Footer actions */}
            {!isIssued && (
                <div className="px-4 py-3 border-t border-slate-700 space-y-2">
                    {saveMsg && (
                        <p className={`text-center text-xs font-medium ${saveMsg.includes('fail') ? 'text-red-400' : 'text-green-400'}`}>
                            {saveMsg}
                        </p>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || issuing}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Draft
                    </button>
                    <button
                        onClick={handleIssue}
                        disabled={saving || issuing || medications.every(m => !m.name)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Issue Prescription
                    </button>
                </div>
            )}

            {isIssued && (
                <div className="px-4 py-3 border-t border-slate-700">
                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Prescription issued to patient
                    </div>
                </div>
            )}
        </div>
    );
};


// ── Main Video Room ───────────────────────────────────────────────────────────
export default function DoctorVideoRoom() {
    const location = useLocation();
    const navigate = useNavigate();

    const { sessionData, patientName, appointmentId, patientId } = location.state || {};

    const clientRef      = useRef(null);
    const localTracksRef = useRef({ audio: null, video: null });
    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);

    const [joined, setJoined]               = useState(false);
    const [remoteJoined, setRemoteJoined]   = useState(false);
    const [micMuted, setMicMuted]           = useState(false);
    const [camOff, setCamOff]               = useState(false);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [duration, setDuration]           = useState(0);
    const [sidebarOpen, setSidebarOpen]     = useState(false);

    useEffect(() => {
        if (!joined) return;
        const interval = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [joined]);

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    useEffect(() => {
        if (!joined) return;
        const videoTrack = localTracksRef.current.video;
        if (videoTrack && localVideoRef.current) videoTrack.play(localVideoRef.current);
    }, [joined]);

    useEffect(() => {
        if (!sessionData) {
            setError('No session data. Please start session from the telemedicine page.');
            setLoading(false);
            return;
        }

        const { agoraAppId, channelName, token, uid, sessionId } = sessionData;
        let isCancelled = false;

        const join = async () => {
            try {
                const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                clientRef.current = client;

                client.on('user-published', async (user, mediaType) => {
                    await client.subscribe(user, mediaType);
                    if (mediaType === 'video') {
                        setRemoteJoined(true);
                        setTimeout(() => {
                            if (remoteVideoRef.current) user.videoTrack?.play(remoteVideoRef.current);
                        }, 0);
                    }
                    if (mediaType === 'audio') user.audioTrack?.play();
                });
                client.on('user-unpublished', (_u, t) => { if (t === 'video') setRemoteJoined(false); });
                client.on('user-left', () => setRemoteJoined(false));

                if (isCancelled) return;
                await client.join(agoraAppId, channelName, token, uid);
                if (isCancelled) { await client.leave(); return; }

                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracksRef.current = { audio: audioTrack, video: videoTrack };

                if (isCancelled) { audioTrack.close(); videoTrack.close(); await client.leave(); return; }

                await client.publish([audioTrack, videoTrack]);
                setJoined(true);
                setLoading(false);
                await telemedicineService.markActive(sessionId);
            } catch (err) {
                if (isCancelled) return;
                setError(err.message || 'Failed to join video session');
                setLoading(false);
            }
        };

        join();

        return () => {
            isCancelled = true;
            if (clientRef.current) {
                localTracksRef.current.audio?.close();
                localTracksRef.current.video?.close();
                localTracksRef.current = { audio: null, video: null };
                clientRef.current.leave().catch(() => {});
                clientRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const leaveCleanup = async () => {
        localTracksRef.current.audio?.close();
        localTracksRef.current.video?.close();
        localTracksRef.current = { audio: null, video: null };
        if (clientRef.current) {
            try { await clientRef.current.leave(); } catch (_) {}
            clientRef.current = null;
        }
    };

    const handleEndCall = async () => {
        await leaveCleanup();
        try { await telemedicineService.endSession(sessionData.sessionId); } catch (e) { console.error(e); }
        navigate('/doctor/telemedicine');
    };

    const toggleMic = async () => {
        const track = localTracksRef.current.audio;
        if (!track) return;
        await track.setMuted(!micMuted);
        setMicMuted(prev => !prev);
    };

    const toggleCam = async () => {
        const track = localTracksRef.current.video;
        if (!track) return;
        await track.setMuted(!camOff);
        setCamOff(prev => !prev);
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h2>
                    <p className="text-slate-600 text-sm mb-6">{error}</p>
                    <button onClick={() => navigate('/doctor/telemedicine')}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">
                        Back to Telemedicine
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                <p className="text-slate-400 text-sm">Connecting to session...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 backdrop-blur shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white text-sm font-medium">{patientName || 'Patient'}</span>
                    {remoteJoined
                        ? <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Connected</span>
                        : <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Waiting for patient...</span>
                    }
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="font-mono text-white">{formatDuration(duration)}</span>
                </div>
            </div>

            {/* Main area: video + optional sidebar */}
            <div className="flex flex-1 overflow-hidden">

                {/* Video area */}
                <div className="flex-1 relative bg-slate-900">
                    <div ref={remoteVideoRef} className="w-full h-full absolute inset-0" style={{ background: '#0f172a' }} />

                    {!remoteJoined && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                                <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-400 text-sm">Waiting for {patientName || 'patient'} to join...</p>
                        </div>
                    )}

                    {/* Local PiP */}
                    <div className="absolute bottom-24 right-4 w-36 h-28 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl bg-slate-800">
                        <div ref={localVideoRef} className="w-full h-full" />
                        {camOff && (
                            <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
                                <VideoOff className="w-6 h-6 text-slate-400" />
                            </div>
                        )}
                        <span className="absolute bottom-1 left-2 text-xs text-white/70">You</span>
                    </div>

                    {/* Prescription toggle button (floating, bottom-left of video) */}
                    <button
                        onClick={() => setSidebarOpen(o => !o)}
                        className={`absolute bottom-24 left-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-lg ${
                            sidebarOpen
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        Prescription
                        {sidebarOpen
                            ? <ChevronRight className="w-3.5 h-3.5" />
                            : <ChevronLeft className="w-3.5 h-3.5" />
                        }
                    </button>
                </div>

                {/* Prescription Sidebar */}
                {sidebarOpen && (
                    <PrescriptionSidebar
                        sessionData={sessionData}
                        appointmentId={appointmentId}
                        patientId={patientId}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-6 bg-slate-800/90 backdrop-blur shrink-0">
                <button onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                    {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95">
                    <PhoneOff className="w-6 h-6" />
                </button>
                <button onClick={toggleCam}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
                    {camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
}