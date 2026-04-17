import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import telemedicineService from '../../services/telemedicineService';
import appointmentService from '../../services/appointmentService';
import {
    Video, Calendar, Clock, Phone, Mail,
    CheckCircle, XCircle, Loader2,
    RefreshCw, Monitor, Wifi, Mic, Camera,
    ChevronRight, Users, Activity,
} from 'lucide-react';

// line 13-19 for testing only
const ALLOW_UPCOMING_TEST_START =
  import.meta.env.VITE_TELEMEDICINE_ALLOW_UPCOMING_START === 'true';

const canStartByDate = (dateStr) => {
  if (ALLOW_UPCOMING_TEST_START) return true;
  return new Date(dateStr).toDateString() === new Date().toDateString();
};

// Avatar component
const Avatar = ({ firstName, lastName, size = 'md' }) => {
    const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-lg' };
    return (
        <div className={`${sizes[size]} rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
            {firstName?.[0]}{lastName?.[0]}
        </div>
    );
};

// Appointment Card component
const TelemedicineCard = ({ appt, onClick }) => {
    const isToday = new Date(appt.appointmentDate).toDateString() === new Date().toDateString();
    const isUpcoming = ['confirmed', 'pending'].includes(appt.status) && new Date(appt.appointmentDate) >= new Date();

    return (
        <div
            onClick={() => onClick(appt)}
            className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 cursor-pointer overflow-hidden"
        >
            {/* Color accent bar */}
            <div className={`h-1 w-full ${isToday ? 'bg-linear-to-r from-blue-500 to-indigo-500' : isUpcoming ? 'bg-linear-to-r from-slate-300 to-slate-400' : 'bg-slate-100'}`} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar firstName={appt.patientFirstName} lastName={appt.patientLastName} size="md" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{appt.patientFullName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{appt.specialty || 'General Consultation'}</p>
                        </div>
                    </div>
                </div>

                {/* Date / Time chips */}
                <div className="flex items-center gap-2 mb-3">
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${isToday ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'}`}>
                        <Calendar className="w-3 h-3" />
                        {isToday ? 'Today' : new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 font-medium">
                        <Clock className="w-3 h-3" />
                        {appt.timeSlot}
                    </span>
                </div>

                {/* Reason */}
                {appt.reason && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
                        {appt.reason}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Video className="w-3.5 h-3.5" />
                        <span>Telemedicine</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:gap-2 transition-all">
                        Open <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>
        </div>
    );
};

// Session Modal component
const SessionModal = ({ appt, onClose, onStartSession, sessionLoading }) => {
    if (!appt) return null;

    const isConfirmed = appt.status === 'confirmed';
    //const isToday = new Date(appt.appointmentDate).toDateString() === new Date().toDateString(); // production
    //const canStart = isConfirmed && isToday; // production

    const isToday = new Date(appt.appointmentDate).toDateString() === new Date().toDateString(); // for testing
    const canStart = isConfirmed && canStartByDate(appt.appointmentDate); // for testing


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop — disabled while loading to prevent accidental close */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={sessionLoading ? undefined : onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Top gradient banner */}
                <div className="bg-linear-to-br from-blue-600 to-indigo-700 px-6 pt-6 pb-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-blue-100 text-xs font-medium">
                            <Video className="w-3.5 h-3.5" />
                            Telemedicine Session
                        </div>
                        <button
                            onClick={onClose}
                            disabled={sessionLoading}
                            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                            {appt.patientFirstName?.[0]}{appt.patientLastName?.[0]}
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">{appt.patientFullName}</h2>
                            <p className="text-blue-200 text-sm mt-0.5">{appt.specialty || 'General Consultation'}</p>
                        </div>
                    </div>
                </div>

                {/* Info card */}
                <div className="-mt-6 mx-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{new Date(appt.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{appt.timeSlot}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">{appt.patientEmail}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{appt.patientPhone}</span>
                        </div>
                    </div>
                </div>

                {/* Reason */}
                {appt.reason && (
                    <div className="mx-4 mb-4 bg-slate-50 rounded-2xl px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Reason for visit</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{appt.reason}</p>
                    </div>
                )}

                {/* Pre-session checklist */}
                <div className="mx-4 mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Session requirements</p>
                    <div className="space-y-2">
                        {[
                            { icon: <Wifi className="w-3.5 h-3.5" />, label: 'Stable internet connection' },
                            { icon: <Camera className="w-3.5 h-3.5" />, label: 'Camera access' },
                            { icon: <Mic className="w-3.5 h-3.5" />, label: 'Microphone access' },
                        ].map(({ icon, label }) => (
                            <div key={label} className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="text-green-500">{icon}</span>
                                {label}
                                <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA buttons */}
                <div className="px-4 pb-5 flex flex-col gap-2.5">
                    {/* Warning when session cannot be started */}
                    {!canStart && (
                        <p className="text-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl py-2">
                            {!isConfirmed
                                ? 'Session can only start when appointment is confirmed.'
                                : 'Session can only be started on the appointment day.'}
                        </p>
                    )}

                    {/* Start Session button — shows spinner while API call is in progress */}
                    <button
                        onClick={() => onStartSession(appt)}
                        disabled={!canStart || sessionLoading}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
                            canStart && !sessionLoading
                                ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {sessionLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Video className="w-4 h-4" />
                                Start Session
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        disabled={sessionLoading}
                        className="w-full py-3 rounded-2xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Main page component
export default function DoctorTelemedicine() {
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAppt, setSelectedAppt] = useState(null);
    const [filter, setFilter] = useState('all');
    const [sessionLoading, setSessionLoading] = useState(false);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await appointmentService.getDoctorAppointments(1, 50);
            const confirmedOnly = (data.appointments || []).filter(
                a => a.status === 'confirmed'
            );
            setAppointments(confirmedOnly);
        } catch (err) {
            console.error('fetchAppointments error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    // Session startup logic
    // 1. Calls telemedicine-service to create/retrieve an Agora session
    // 2. Receives { channelName, token, agoraAppId, uid, sessionId, patientJoinUrl }
    // 3. Navigates to DoctorVideoRoom, passing the session data via router state
    const handleStartSession = async (appt) => {
        setSessionLoading(true);
        try {
            const sessionData = await telemedicineService.createSession(
                appt._id,
                appt.patientId
            );
            navigate('/doctor/video-room', {
                state: {
                    sessionData,
                    patientName: appt.patientFullName,
                    appointmentId: appt._id,       // ← added
                    patientId: appt.patientId,     // ← added
                },
            });
        } catch (err) {
            console.error('Failed to create session:', err);
            alert('Failed to start session. Please try again.');
        } finally {
            setSessionLoading(false);
            setSelectedAppt(null);
        }
    };

    const FILTERS = [
        { key: 'all',      label: 'All' },
        { key: 'today',    label: 'Today' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'past',     label: 'Past' },
    ];

    const filtered = appointments.filter(a => {
        const apptDate = new Date(a.appointmentDate);
        const now = new Date();
        const isToday = apptDate.toDateString() === now.toDateString();
        if (filter === 'today')    return isToday;
        if (filter === 'upcoming') return apptDate > now && !isToday;
        if (filter === 'past')     return apptDate < now && !isToday;
        return true;
    });

    const todayCount = appointments.filter(a =>
        new Date(a.appointmentDate).toDateString() === new Date().toDateString()
    ).length;

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Video className="w-6 h-6 text-blue-600" />
                            Telemedicine
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Manage and start your virtual consultation sessions.
                        </p>
                    </div>
                    <button
                        onClick={fetchAppointments}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-all disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stat strip */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "Today's Sessions", value: todayCount,                                                icon: <Monitor className="w-4 h-4" />, color: 'text-blue-600'   },
                        { label: 'Total Appointments', value: appointments.length,                                      icon: <Users   className="w-4 h-4" />, color: 'text-indigo-600' },
                        { label: 'Confirmed',          value: appointments.filter(a => a.status === 'confirmed').length, icon: <Activity className="w-4 h-4" />, color: 'text-green-600'  },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                            <span className={color}>{icon}</span>
                            <div>
                                <p className={`text-xl font-bold ${color}`}>{value}</p>
                                <p className="text-xs text-slate-400">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 mb-6">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                                filter === f.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Card grid */}
                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Video className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">No appointments found</p>
                        <p className="text-sm mt-1">Try a different filter</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(appt => (
                            <TelemedicineCard
                                key={appt._id}
                                appt={appt}
                                onClick={setSelectedAppt}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Session modal */}
            {selectedAppt && (
                <SessionModal
                    appt={selectedAppt}
                    onClose={() => !sessionLoading && setSelectedAppt(null)}
                    onStartSession={handleStartSession}
                    sessionLoading={sessionLoading}
                />
            )}
        </div>
    );
}