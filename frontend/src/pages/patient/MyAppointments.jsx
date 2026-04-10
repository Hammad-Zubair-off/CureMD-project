import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, User, Plus, RefreshCw,
    CheckCircle, XCircle, AlertCircle, Clock3,
    ChevronLeft, ChevronRight, X, Loader2,
    Stethoscope, Ban, RotateCcw
} from 'lucide-react';
import api from '../../services/api';
import { TIME_SLOTS } from '../../data/mockDoctors';

// Helpers

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatTime = (timeSlot) => timeSlot;

// Status Badge
const StatusBadge = ({ status }) => {
    const config = {
        pending: {
            label: 'Pending Payment',
            classes: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: <Clock3 className="w-3 h-3" />,
        },
        confirmed: {
            label: 'Confirmed',
            classes: 'bg-green-50 text-green-700 border-green-200',
            icon: <CheckCircle className="w-3 h-3" />,
        },
        cancelled: {
            label: 'Cancelled',
            classes: 'bg-red-50 text-red-700 border-red-200',
            icon: <XCircle className="w-3 h-3" />,
        },
        completed: {
            label: 'Completed',
            classes: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: <CheckCircle className="w-3 h-3" />,
        },
        expired: {
            label: 'Expired',
            classes: 'bg-slate-50 text-slate-500 border-slate-200',
            icon: <AlertCircle className="w-3 h-3" />,
        },
    };

    const c = config[status] || config.expired;

    return (
        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.classes}`}>
            {c.icon}
            <span>{c.label}</span>
        </span>
    );
};

// Reschedule Modal
const RescheduleModal = ({ appointment, onConfirm, onClose, loading }) => {
    const getNext7Days = () => {
        const days = [];
        for (let i = 1; i <= 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            d.setHours(0, 0, 0, 0);
            days.push(d);
        }
        return days;
    };

    const next7Days = getNext7Days();
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [datePageStart, setDatePageStart] = useState(0);
    const visibleDays = next7Days.slice(datePageStart, datePageStart + 4);

    const getDayLabel = (date) => {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    };

    const isValid = selectedDate && selectedSlot;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Reschedule Appointment</h3>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* Current appointment info */}
                    <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                        <p className="font-medium text-slate-700">{appointment.doctorFullName}</p>
                        <div className="flex items-center space-x-3 text-slate-500">
                            <span className="flex items-center space-x-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDate(appointment.appointmentDate)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{appointment.timeSlot}</span>
                            </span>
                        </div>
                    </div>

                    {/* Select new date */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            New Date
                        </p>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setDatePageStart(p => Math.max(0, p - 1))}
                                disabled={datePageStart === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex-1 grid grid-cols-4 gap-1.5">
                                {visibleDays.map((date) => {
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    return (
                                        <button
                                            key={date.toDateString()}
                                            onClick={() => { setSelectedDate(date); setSelectedSlot(''); }}
                                            className={`flex flex-col items-center py-2.5 rounded-xl border text-sm font-medium transition-all
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                        >
                                            <span className="text-xs mb-0.5 opacity-70">{getDayLabel(date)}</span>
                                            <span className="font-bold">{date.getDate()}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setDatePageStart(p => Math.min(3, p + 1))}
                                disabled={datePageStart >= 3}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Select new time slot */}
                    {selectedDate && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                New Time Slot
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {TIME_SLOTS.map((slot) => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all
                                            ${selectedSlot === slot
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(selectedDate, selectedSlot)}
                            disabled={!isValid || loading}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                        >
                            {loading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                                : <span>Confirm Reschedule</span>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Cancel Confirm Modal
const CancelModal = ({ appointment, onConfirm, onClose, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start space-x-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Cancel Appointment?</h3>
                    <p className="text-sm text-slate-500">
                        Are you sure you want to cancel your appointment with{' '}
                        <span className="font-medium text-slate-700">{appointment.doctorFullName}</span>{' '}
                        on {formatDate(appointment.appointmentDate)}?
                    </p>
                </div>
            </div>
            <div className="flex space-x-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                    Keep It
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                >
                    {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Cancelling...</span></>
                        : <span>Yes, Cancel</span>
                    }
                </button>
            </div>
        </div>
    </div>
);

// Appointment Card
const AppointmentCard = ({ appointment, onCancel, onReschedule }) => {
    const { status } = appointment;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-all">

            {/* Top Row */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                        <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900">{appointment.doctorFullName}</p>
                        <p className="text-sm text-blue-600">{appointment.specialty}</p>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Date & Time */}
            <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-xl mb-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{formatDate(appointment.appointmentDate)}</span>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{formatTime(appointment.timeSlot)}</span>
                </div>
            </div>

            {/* Fee */}
            <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-slate-400">Consultation Fee</span>
                <span className="font-semibold text-slate-900">
                    LKR {appointment.consultationFee?.toLocaleString()}
                </span>
            </div>

            {/* Reason */}
            {appointment.reason && (
                <div className="mb-4 text-sm">
                    <span className="text-slate-400">Reason: </span>
                    <span className="text-slate-600">{appointment.reason}</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-4 border-t border-slate-100">
                {/* Pending — can only cancel */}
                {status === 'pending' && (
                    <button
                        onClick={() => onCancel(appointment)}
                        className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
                    >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                    </button>
                )}

                {/* Confirmed — can reschedule or cancel */}
                {status === 'confirmed' && (
                    <>
                        <button
                            onClick={() => onReschedule(appointment)}
                            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-all"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                        </button>
                        <button
                            onClick={() => onCancel(appointment)}
                            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"
                        >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                        </button>
                    </>
                )}

                {/* Completed — no actions */}
                {status === 'completed' && (
                    <span className="text-xs text-slate-400 italic">Consultation completed</span>
                )}

                {/* Cancelled / Expired — no actions */}
                {(status === 'cancelled' || status === 'expired') && (
                    <span className="text-xs text-slate-400 italic">
                        {status === 'expired' ? 'Payment window expired' : 'Appointment cancelled'}
                    </span>
                )}
            </div>
        </div>
    );
};

// Main Page
export default function MyAppointments() {
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('upcoming');

    // Modal state
    const [cancelTarget, setCancelTarget] = useState(null);
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Fetch appointments
    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/appointments/my?page=${page}&limit=${LIMIT}`);
            setAppointments(res.data.appointments || []);
            setTotalPages(res.data.pages || 1);
        } catch (err) {
            setError('Failed to load appointments. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    // Filter by tab
    const filteredAppointments = appointments.filter((a) => {
        if (activeTab === 'upcoming') return ['pending', 'confirmed'].includes(a.status);
        if (activeTab === 'past') return a.status === 'completed';
        if (activeTab === 'cancelled') return ['cancelled', 'expired'].includes(a.status);
        return true;
    });

    // Cancel
    const handleCancelConfirm = async () => {
        setActionLoading(true);
        try {
            await api.patch(`/appointments/${cancelTarget._id}/cancel`);
            showToast('Appointment cancelled successfully');
            setCancelTarget(null);
            fetchAppointments();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to cancel appointment', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Reschedule
    const handleRescheduleConfirm = async (newDate, newSlot) => {
        setActionLoading(true);
        try {
            await api.patch(`/appointments/${rescheduleTarget._id}/reschedule`, {
                appointmentDate: newDate.toISOString(),
                timeSlot: newSlot,
            });
            showToast('Appointment rescheduled successfully');
            setRescheduleTarget(null);
            fetchAppointments();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to reschedule appointment', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const tabs = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'past', label: 'Past' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
                    ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                >
                    {toast.type === 'error'
                        ? <XCircle className="w-4 h-4" />
                        : <CheckCircle className="w-4 h-4" />
                    }
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)}>
                        <X className="w-4 h-4 opacity-70 hover:opacity-100" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your upcoming and past consultations.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={fetchAppointments}
                        className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/patient/book-appointment', { state: { fromMyAppointments: true } })}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:block">New Appointment</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                {tabs.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium transition-all
                            ${activeTab === key
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
                    <p className="font-medium text-slate-500">{error}</p>
                    <button
                        onClick={fetchAppointments}
                        className="mt-4 text-sm text-blue-600 font-medium hover:underline"
                    >
                        Try again
                    </button>
                </div>
            ) : filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Calendar className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-medium text-slate-500">
                        No {activeTab} appointments
                    </p>
                    {activeTab === 'upcoming' && (
                        <button
                            onClick={() => navigate('/patient/book-appointment', { state: { fromMyAppointments: true } })}
                            className="mt-4 text-sm text-blue-600 font-medium hover:underline"
                        >
                            Book an appointment
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAppointments.map((appointment) => (
                        <AppointmentCard
                            key={appointment._id}
                            appointment={appointment}
                            onCancel={setCancelTarget}
                            onReschedule={setRescheduleTarget}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {cancelTarget && (
                <CancelModal
                    appointment={cancelTarget}
                    onConfirm={handleCancelConfirm}
                    onClose={() => setCancelTarget(null)}
                    loading={actionLoading}
                />
            )}

            {rescheduleTarget && (
                <RescheduleModal
                    appointment={rescheduleTarget}
                    onConfirm={handleRescheduleConfirm}
                    onClose={() => setRescheduleTarget(null)}
                    loading={actionLoading}
                />
            )}
        </div>
    );
}