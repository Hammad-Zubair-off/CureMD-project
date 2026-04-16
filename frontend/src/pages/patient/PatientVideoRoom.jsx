import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    Users,
    Loader2,
    Wifi,
    AlertCircle,
} from 'lucide-react';

export default function PatientVideoRoom() {
    const location = useLocation();
    const navigate = useNavigate();

    //const { sessionData, doctorName } = location.state || {}; // production
    const { sessionData, doctorName, cameraTestMode } = location.state || {}; // testing

    const clientRef = useRef(null);
    const localTracksRef = useRef({ audio: null, video: null });
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const [joined, setJoined] = useState(false);
    const [remoteJoined, setRemoteJoined] = useState(false);
    const [micMuted, setMicMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [duration, setDuration] = useState(0);

    // this is for testing 36 -74
    useEffect(() => {
        if (!cameraTestMode) return;

        let stream = null;

        const startLocalPreview = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

                if (localVideoRef.current) {
                    localVideoRef.current.innerHTML = '';
                    const videoEl = document.createElement('video');
                    videoEl.autoplay = true;
                    videoEl.muted = true;
                    videoEl.playsInline = true;
                    videoEl.srcObject = stream;
                    videoEl.style.width = '100%';
                    videoEl.style.height = '100%';
                    localVideoRef.current.appendChild(videoEl);
                }

                setJoined(true);
                setRemoteJoined(false);
                setLoading(false);
            } catch (err) {
                setError(err?.message || 'Camera/Microphone access failed');
                setLoading(false);
            }
        };

        startLocalPreview();

        return () => {
            if (stream) {
                stream.getTracks().forEach((t) => t.stop());
            }
        };
    }, [cameraTestMode]);

    useEffect(() => {
        if (!joined) return;
        const interval = setInterval(() => setDuration((d) => d + 1), 1000);
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
        if (videoTrack && localVideoRef.current) {
            videoTrack.play(localVideoRef.current);
        }
    }, [joined]);

    useEffect(() => {
        // for testing only
        if (cameraTestMode) {
            return;
        }
        if (!sessionData) {
            setError('No session data. Please join from the telemedicine page.');
            setLoading(false);
            return;
        }

        const { agoraAppId, channelName, token, uid } = sessionData;
        if (!agoraAppId || !channelName || !token || !uid) {
            setError('Session is not ready yet. Please try again in a moment.');
            setLoading(false);
            return;
        }

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
                    if (mediaType === 'audio') {
                        user.audioTrack?.play();
                    }
                });

                client.on('user-unpublished', (_user, mediaType) => {
                    if (mediaType === 'video') setRemoteJoined(false);
                });

                client.on('user-left', () => setRemoteJoined(false));

                if (isCancelled) return;
                await client.join(agoraAppId, channelName, token, uid);

                if (isCancelled) {
                    await client.leave();
                    return;
                }

                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracksRef.current = { audio: audioTrack, video: videoTrack };

                if (isCancelled) {
                    audioTrack.close();
                    videoTrack.close();
                    await client.leave();
                    return;
                }

                await client.publish([audioTrack, videoTrack]);
                setJoined(true);
                setLoading(false);
            } catch (err) {
                if (isCancelled) return;
                setError(err?.message || 'Failed to join video session');
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
                clientRef.current.leave().catch(() => { });
                clientRef.current = null;
            }
        };
    }, [sessionData, cameraTestMode]);  // Added cameraTestMode for testing

    const leaveCleanup = async () => {
        localTracksRef.current.audio?.close();
        localTracksRef.current.video?.close();
        localTracksRef.current = { audio: null, video: null };
        if (clientRef.current) {
            try {
                await clientRef.current.leave();
            } catch (_) { }
            clientRef.current = null;
        }
    };

    const handleLeave = async () => {
        await leaveCleanup();
        navigate('/patient/telemedicine');
    };

    const toggleMic = async () => {
        const track = localTracksRef.current.audio;
        if (!track) return;
        await track.setMuted(!micMuted);
        setMicMuted((prev) => !prev);
    };

    const toggleCam = async () => {
        const track = localTracksRef.current.video;
        if (!track) return;
        await track.setMuted(!camOff);
        setCamOff((prev) => !prev);
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h2>
                    <p className="text-slate-600 text-sm mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/patient/telemedicine')}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium"
                    >
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
                {/* <p className="text-slate-400 text-sm">Connecting to session...</p> */}
                <p className="text-slate-400 text-sm">
                    {cameraTestMode ? 'Opening camera test...' : 'Connecting to session...'}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white text-sm font-medium">{doctorName || 'Doctor'}</span>
                    {/* {remoteJoined ? (
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Connected</span>
                    ) : (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                            Waiting for doctor...
                        </span>
                    )} */}
                    {cameraTestMode ? (
                        <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                            Camera Test Mode
                        </span>
                    ) : remoteJoined ? (
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                            Connected
                        </span>
                    ) : (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                            Waiting for doctor...
                        </span>
                    )}
                                    </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                    <Wifi className="w-4 h-4 text-green-400" />
                    <span className="font-mono text-white">{formatDuration(duration)}</span>
                </div>
            </div>

            <div className="flex-1 relative bg-slate-900">
                <div ref={remoteVideoRef} className="w-full h-full absolute inset-0" style={{ background: '#0f172a' }} />

                {!remoteJoined && !cameraTestMode && (
                //{!remoteJoined && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                            <Users className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-400 text-sm">Waiting for doctor to join...</p>
                    </div>
                )}

                <div className="absolute bottom-24 right-4 w-36 h-28 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl bg-slate-800">
                    <div ref={localVideoRef} className="w-full h-full" />
                    {camOff && (
                        <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
                            <VideoOff className="w-6 h-6 text-slate-400" />
                        </div>
                    )}
                    <span className="absolute bottom-1 left-2 text-xs text-white/70">You</span>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 py-6 bg-slate-800/90 backdrop-blur">
                <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                >
                    {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                    onClick={handleLeave}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
                >
                    <PhoneOff className="w-6 h-6" />
                </button>

                <button
                    onClick={toggleCam}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                >
                    {camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
}