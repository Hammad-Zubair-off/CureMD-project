import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import telemedicineService from '../../services/telemedicineService';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Users, Loader2, Wifi, AlertCircle,
} from 'lucide-react';

export default function DoctorVideoRoom() {
  const location = useLocation();
  const navigate = useNavigate();

  const { sessionData, patientName } = location.state || {};

  const clientRef      = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  const [joined, setJoined]             = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [micMuted, setMicMuted]         = useState(false);
  const [camOff, setCamOff]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [duration, setDuration]         = useState(0);

  // ── DURATION COUNTER ─────────────────────────────────────────────────────
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

  // ── PLAY LOCAL VIDEO after joined=true renders the video divs ────────────
  useEffect(() => {
    if (!joined) return;
    const videoTrack = localTracksRef.current.video;
    if (videoTrack && localVideoRef.current) {
      videoTrack.play(localVideoRef.current);
    }
  }, [joined]);

  // ── JOIN AGORA CHANNEL ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionData) {
      setError('No session data. Please start session from the telemedicine page.');
      setLoading(false);
      return;
    }

    const { agoraAppId, channelName, token, uid, sessionId } = sessionData;

    // This flag tells the cleanup whether to actually destroy things.
    // In React StrictMode the cleanup fires on the FIRST mount before
    // the second mount runs — isCancelled lets the async join bail out
    // before touching Agora if cleanup already fired.
    let isCancelled = false;

    const join = async () => {
      try {
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Remote user events
        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            setRemoteJoined(true);
            setTimeout(() => {
              if (remoteVideoRef.current) {
                user.videoTrack?.play(remoteVideoRef.current);
              }
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

        // ── KEY FIX: check isCancelled before every async step ──
        // If StrictMode cleanup already fired, stop here — don't join at all
        if (isCancelled) return;

        await client.join(agoraAppId, channelName, token, uid);

        if (isCancelled) {
          // Cleanup fired mid-join — leave immediately and close tracks
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

        // All good — flip state to render video room
        setJoined(true);
        setLoading(false);

        await telemedicineService.markActive(sessionId);

      } catch (err) {
        if (isCancelled) return; // ignore errors from a cancelled join
        console.error('Agora join error:', err);
        setError(err.message || 'Failed to join video session');
        setLoading(false);
      }
    };

    join();

    // Cleanup — sets isCancelled so the async join bails out
    // instead of letting Agora get into a half-joined state
    return () => {
      isCancelled = true;
      // Only do real cleanup if client was actually created
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

  // ── LEAVE & CLEANUP ──────────────────────────────────────────────────────
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
    try {
      await telemedicineService.endSession(sessionData.sessionId);
    } catch (e) {
      console.error('Error ending session:', e);
    }
    navigate('/doctor/telemedicine');
  };

  // ── CONTROLS ─────────────────────────────────────────────────────────────
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

  // ── ERROR STATE ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/doctor/telemedicine')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium"
          >
            Back to Telemedicine
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        <p className="text-slate-400 text-sm">Connecting to session...</p>
      </div>
    );
  }

  // ── VIDEO ROOM ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-sm font-medium">
            {patientName || 'Patient'}
          </span>
          {remoteJoined ? (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
              Connected
            </span>
          ) : (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
              Waiting for patient...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="font-mono text-white">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-slate-900">

        {/* Remote video (patient) */}
        <div
          ref={remoteVideoRef}
          className="w-full h-full absolute inset-0"
          style={{ background: '#0f172a' }}
        />

        {!remoteJoined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">
              Waiting for {patientName || 'patient'} to join...
            </p>
          </div>
        )}

        {/* Local video (doctor) — PiP */}
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

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-6 bg-slate-800/90 backdrop-blur">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            micMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
        >
          {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            camOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
        >
          {camOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}