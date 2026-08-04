import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, RefreshCw, Loader2 } from 'lucide-react';
import appointmentService from '../../services/appointmentService';
import telemedicineService from '../../services/telemedicineService';

const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

const isToday = (dateStr) => {
    const d = new Date(dateStr);
    const n = new Date();
    return d.toDateString() === n.toDateString();
};

// line 22 - 28 for testing
const ALLOW_UPCOMING_TEST_JOIN =
    import.meta.env.VITE_TELEMEDICINE_ALLOW_UPCOMING_JOIN === 'true';

const canJoinByDate = (dateStr) => {
    if (ALLOW_UPCOMING_TEST_JOIN) return true;
    return isToday(dateStr);
};

const ENABLE_CAMERA_TEST_MODE =
    import.meta.env.VITE_TELEMEDICINE_CAMERA_TEST_MODE === 'true';

function SessionCard({ appt, onJoin, joining, canJoin }) {
    const today = isToday(appt.appointmentDate);
    const joinAllowed = canJoin ?? canJoinByDate(appt.appointmentDate);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h3 className="text-sm font-semibold text-slate-900">{appt.doctorFullName}</h3>
                <p className="text-xs text-slate-500">{appt.specialty}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(appt.appointmentDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {appt.timeSlot}
                    </span>
                    <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${today
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                    >
                        {today ? 'Today' : 'Upcoming'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* {!today && (
          <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
            Join available on appointment day
          </span>
        )} */}
                {!today && !ALLOW_UPCOMING_TEST_JOIN && (
                    <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                        Join available on appointment day
                    </span>
                )}
                <button
                    onClick={() => onJoin(appt)}
                    disabled={!joinAllowed || joining}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                    Join Session
                </button>
            </div>
        </div>
    );
}

export default function Telemedicine() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [joinLoadingId, setJoinLoadingId] = useState(null);
    const [error, setError] = useState('');

    const fetchAppointments = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        setError('');
        try {
            const res = await appointmentService.getMyAppointments(1, 50, 'upcoming');
            const confirmed = (res.appointments || [])
                .filter((a) => a.status === 'confirmed')
                .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
            setAppointments(confirmed);
        } catch (err) {
            setError(err?.error || 'Failed to load telemedicine appointments.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments(false);
    }, [fetchAppointments]);

    // Auto refresh so patient sees session once doctor starts
    useEffect(() => {
        const id = setInterval(() => fetchAppointments(true), 30000);
        return () => clearInterval(id);
    }, [fetchAppointments]);

    const { todayAppointments, upcomingAppointments } = useMemo(() => {
        const today = appointments.filter((a) => isToday(a.appointmentDate));
        const upcoming = appointments.filter((a) => !isToday(a.appointmentDate));
        return { todayAppointments: today, upcomingAppointments: upcoming };
    }, [appointments]);

    const handleJoin = async (appt) => {
        //if (!isToday(appt.appointmentDate)) return; // production
        if (!canJoinByDate(appt.appointmentDate)) return; // testing

        setJoinLoadingId(appt._id);
        try {
            const sessionData = await telemedicineService.getSessionJoinDataByAppointment(appt._id);

            if (!sessionData) {
                alert('Session is not available yet.');
                return;
            }

            if (sessionData.status === 'ended') {
                alert('This session has already ended.');
                return;
            }

            if (!sessionData.token || !sessionData.agoraAppId) {
                alert('Session is not ready yet. Please try again in a moment.');
                return;
            }

            navigate('/patient/video-room', {
                state: {
                    sessionData,
                    doctorName: appt.doctorFullName,
                },
            });
        } catch (err) {
            const status = err?.response?.status;
            // production code
            //   if (status === 404) {
            //     alert('Doctor has not started this session yet.');
            //   } else if (status === 403) {
            //     alert('You are not allowed to join this session.');
            //   } else {
            //     alert('Failed to join session. Please try again.');
            //   }

            if (status === 404) {
                if (ENABLE_CAMERA_TEST_MODE) {
                    navigate('/patient/video-room', {
                        state: {
                            sessionData: null,
                            doctorName: appt.doctorFullName,
                            cameraTestMode: true,
                        },
                    });
                    return;
                }
                alert('Doctor has not started this session yet.');
            } else if (status === 403) {
                alert('You are not allowed to join this session.');
            } else {
                alert('Failed to join session. Please try again.');
            }
        } finally {
            setJoinLoadingId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Telemedicine</h1>
                    <p className="text-slate-500 mt-1 text-sm">Join your confirmed video consultations.</p>
                </div>
                <button
                    onClick={() => fetchAppointments(true)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 inline-flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {ALLOW_UPCOMING_TEST_JOIN && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Dev mode: you can join upcoming appointments immediately for testing.
                </div>
            )}

            {loading ? (
                <div className="h-40 rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                </div>
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>
            ) : (
                <div className="space-y-8">
                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Today</h2>
                        {todayAppointments.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                                No telemedicine sessions scheduled for today.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {todayAppointments.map((appt) => (
                                    <SessionCard
                                        key={appt._id}
                                        appt={appt}
                                        onJoin={handleJoin}
                                        joining={joinLoadingId === appt._id}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Upcoming</h2>
                        {upcomingAppointments.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                                No upcoming confirmed telemedicine appointments.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingAppointments.map((appt) => (
                                    <SessionCard
                                        key={appt._id}
                                        appt={appt}
                                        onJoin={handleJoin}
                                        joining={joinLoadingId === appt._id}
                                        canJoin={canJoinByDate(appt.appointmentDate)} // for testing only
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}