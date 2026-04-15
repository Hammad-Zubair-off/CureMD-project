import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, Plus, RefreshCw,
    CheckCircle, XCircle, AlertCircle, Clock3, AlertTriangle,
    ChevronLeft, ChevronRight, X, Loader2,
    Stethoscope, MoreVertical,
} from 'lucide-react';
import appointmentService from '../../services/appointmentService';
import doctorService from '../../services/doctorService';

// Helpers
const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const getDayLabel = (date) => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
};

const FRONTEND_PAYMENT_WINDOW_MINUTES = 25;
const FRONTEND_GRACE_BLOCK_MINUTES = 5;

const getFrontendPaymentDeadline = (appointment) => {
    // Prefer backend expiry minus 5-min safety buffer
    if (appointment?.expiresAt) {
        const expiresMs = new Date(appointment.expiresAt).getTime();
        if (!Number.isNaN(expiresMs)) {
            return new Date(expiresMs - FRONTEND_GRACE_BLOCK_MINUTES * 60 * 1000);
        }
    }

    // Fallback: createdAt + 25 min
    const createdMs = new Date(appointment?.createdAt || Date.now()).getTime();
    return new Date(createdMs + FRONTEND_PAYMENT_WINDOW_MINUTES * 60 * 1000);
};

const getRemainingMs = (deadline, nowTs) => Math.max(0, deadline.getTime() - nowTs);

const formatRemaining = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const splitDoctorName = (fullName = '') => {
    const cleaned = fullName.trim();
    if (!cleaned) return { firstName: 'Dr', lastName: '' };
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// Status Badge
const StatusBadge = ({ status }) => {
    const config = {
        pending: {
            label: 'Pending',
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
        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${c.classes}`}>
            {c.icon}
            <span>{c.label}</span>
        </span>
    );
};

// Reschedule Modal
const RescheduleModal = ({ appointment, doctorAvailability = [], onConfirm, onClose, loading }) => {
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
    const [availableSlots, setAvailableSlots] = useState([]);
    const [datePageStart, setDatePageStart] = useState(0);
    const visibleDays = next7Days.slice(datePageStart, datePageStart + 4);

    const getSlotsForDate = (date) => {
        if (!date) return [];
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        const dayEntry = doctorAvailability.find(a => a.day === dayName);
        if (!dayEntry) return [];
        return dayEntry.slots.map(s => `${s.startTime} - ${s.endTime}`);
    };

    const isDayAvailable = (date) => {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        return doctorAvailability.some(a => a.day === dayName && a.slots?.length > 0);
    };

    const handleDateSelect = (date) => {
        if (!isDayAvailable(date)) return;
        setSelectedDate(date);
        setSelectedSlot('');
        setAvailableSlots(getSlotsForDate(date));
    };

    const isValid = selectedDate && selectedSlot;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-md shadow-xl w-full max-w-md">

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

                    {/* Availability loading notice */}
                    {doctorAvailability.length === 0 && (
                        <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Could not load doctor availability. Dates and slots may not reflect actual schedule.</span>
                        </div>
                    )}

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
                                    const available = isDayAvailable(date);
                                    return (
                                        <button
                                            key={date.toDateString()}
                                            onClick={() => handleDateSelect(date)}
                                            disabled={!available}
                                            className={`flex flex-col items-center py-2.5 rounded-xl border text-sm font-medium transition-all
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : available
                                                        ? 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                                        : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
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
                            {availableSlots.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No slots available for this day</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {availableSlots.map((slot) => (
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
                            )}
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

// Horizontal Appointment Card
const AppointmentCard = ({ appointment, onCancel, onReschedule, onPayNow, canPayNow, paymentTimeLeftLabel }) => {
    const { status } = appointment;
    const isPaid = status === 'confirmed' || status === 'completed';
    const isPending = status === 'pending';

    const initials = appointment.doctorFullName?.split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <div className="group bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-all">
            
            {/* Left Info: Avatar & Doctor Name */}
            <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm shrink-0">
                        {initials || <Stethoscope className="w-6 h-6" />}
                    </div>
                    {status === 'confirmed' && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                </div>
                <div>
                    <h5 className="font-bold text-slate-900">{appointment.doctorFullName}</h5>
                    <p className="text-xs text-slate-500">{appointment.specialty}</p>
                </div>
            </div>

            {/* Middle Info: Schedule */}
            <div className="flex flex-col gap-1 min-w-35">
                <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span className="font-mono text-xs">{formatDate(appointment.appointmentDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <Clock className={`w-4 h-4 ${status === 'confirmed' || status === 'pending' ? 'text-blue-600' : ''}`} />
                    <span className={`font-mono text-xs ${status === 'confirmed' || status === 'pending' ? 'font-bold text-blue-600' : ''}`}>
                        {appointment.timeSlot}
                    </span>
                </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                {isPaid && (
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                        Paid
                    </span>
                )}
                {isPending && (
                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider">
                        Unpaid
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 w-full md:w-auto">
                {status === 'pending' && (
                    <>
                        {canPayNow ? (
                            <button
                                onClick={() => onPayNow(appointment)}
                                className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs rounded-lg transition-colors border border-blue-600"
                            >
                                Pay Now {paymentTimeLeftLabel ? `(${paymentTimeLeftLabel})` : ''}
                            </button>
                        ) : (
                            <span className="flex-1 md:flex-none px-3 py-2 bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider rounded-lg border border-slate-200 text-center">
                                Payment window closed
                            </span>
                        )}

                        <button
                            onClick={() => onCancel(appointment)}
                            className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-lg transition-colors border border-red-100"
                        >
                            Cancel
                        </button>
                    </>
                )}
                
                {status === 'confirmed' && (
                    <>
                        <button onClick={() => onReschedule(appointment)} className="flex-1 md:flex-none px-4 py-2 font-bold text-xs bg-white text-blue-600 border border-slate-200 hover:bg-slate-50 transition-colors rounded-lg">
                            Reschedule
                        </button>
                        <button onClick={() => onCancel(appointment)} className="px-4 py-2 text-red-600 font-bold text-xs hover:bg-red-50 rounded-lg transition-colors border border-transparent">
                            Cancel
                        </button>
                    </>
                )}

                {(status === 'completed' || status === 'cancelled' || status === 'expired') && (
                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

const RejectedAppointmentCard = ({ appointment }) => {
    const initials = appointment.doctorFullName?.split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

    return (
        <div className="bg-white border border-red-200 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold border-2 border-white shadow-sm shrink-0">
                        {initials || <Stethoscope className="w-6 h-6" />}
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900">{appointment.doctorFullName}</h5>
                        <p className="text-xs text-slate-500">{appointment.specialty}</p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
                    <AlertTriangle className="w-3 h-3" />
                    Rejected by Doctor
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(appointment.appointmentDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{appointment.timeSlot}</span>
                </div>
                <div className="text-slate-600">
                    <span className="font-semibold">Consultation Fee: </span>
                    LKR {Number(appointment.consultationFee || 0).toLocaleString('en-LK')}
                </div>
                <div className="text-slate-600">
                    <span className="font-semibold">Payment: </span>
                    <span className="uppercase">{appointment.paymentStatus || 'N/A'}</span>
                </div>
            </div>

            {appointment.reason && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Your Booking Reason</p>
                    <p className="text-sm text-slate-700">{appointment.reason}</p>
                </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">Doctor Rejection Reason</p>
                <p className="text-sm text-red-800">
                    {appointment.rejectionReason || 'No specific reason provided.'}
                </p>
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
    const [rescheduleAvailability, setRescheduleAvailability] = useState([]);
    const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [unpaidSummaryAppointments, setUnpaidSummaryAppointments] = useState([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    const [nowTs, setNowTs] = useState(Date.now());

    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Fetch appointments
    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [tabData, unpaidData] = await Promise.all([
                appointmentService.getMyAppointments(page, LIMIT, activeTab),
                appointmentService.getMyAppointments(1, 50, 'unpaid'),
            ]);

            setAppointments(tabData.appointments || []);
            setTotalPages(tabData.pages || 1);
            setUnpaidSummaryAppointments(unpaidData.appointments || []);
        } catch (err) {
            setError(err.error || 'Failed to load appointments. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [page, activeTab]);

    useEffect(() => { setPage(1); }, [activeTab]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

    // Filter by tab
    const filteredAppointments = appointments;

    const getRejectedAtMs = (appointment) => {
        const doctorRejectHistory = (appointment.statusHistory || [])
            .filter((h) => h.status === 'cancelled' && h.changedBy === 'doctor')
            .sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

        if (doctorRejectHistory.length > 0) {
            return new Date(doctorRejectHistory[0].changedAt).getTime();
        }

        return new Date(appointment.updatedAt || appointment.createdAt || 0).getTime();
    };

    const displayedAppointments =
        activeTab === 'rejected'
            ? [...filteredAppointments].sort((a, b) => getRejectedAtMs(b) - getRejectedAtMs(a))
            : filteredAppointments;

    // Cancel
    const handleCancelConfirm = async () => {
        setActionLoading(true);
        try {
            await appointmentService.cancelAppointment(cancelTarget._id);
            showToast('Appointment cancelled successfully');
            setCancelTarget(null);
            fetchAppointments();
        } catch (err) {
            showToast(err.error || 'Failed to cancel appointment', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayNow = (appointment) => {
        const deadline = getFrontendPaymentDeadline(appointment);
        const remainingMs = getRemainingMs(deadline, Date.now());

        if (remainingMs <= 0) {
            showToast('Payment window is closed for this appointment.', 'error');
            return;
        }

        const { firstName, lastName } = splitDoctorName(appointment.doctorFullName);

        navigate('/patient/book-appointment', {
            state: {
                fromMyAppointments: true,
                payExistingAppointment: {
                    appointmentId: appointment._id,
                    frontendDeadlineAt: deadline.toISOString(),
                    doctor: {
                        id: appointment.doctorId,
                        firstName,
                        lastName,
                        fullName: appointment.doctorFullName,
                        specialty: appointment.specialty,
                        consultationFee: appointment.consultationFee,
                    },
                    formData: {
                        selectedDate: appointment.appointmentDate,
                        timeSlot: appointment.timeSlot,
                    },
                },
            },
        });
    };

    // Open reschedule modal
    const handleReschedule = async (appointment) => {
        setRescheduleAvailabilityLoading(true);
        setRescheduleTarget(appointment);
        setRescheduleAvailability([]);
        try {
            const res = await doctorService.getDoctorAvailability(appointment.doctorId);
            setRescheduleAvailability(res.data?.availability || []);
        } catch (err) {
            console.error('Failed to fetch doctor availability:', err);
            setRescheduleAvailability([]);
        } finally {
            setRescheduleAvailabilityLoading(false);
        }
    };

    // Reschedule confirm
    const handleRescheduleConfirm = async (newDate, newSlot) => {
        setActionLoading(true);
        try {
            await appointmentService.rescheduleAppointment(
                rescheduleTarget._id,
                newDate.toISOString(),
                newSlot
            );
            showToast('Appointment rescheduled successfully');
            setRescheduleTarget(null);
            setRescheduleAvailability([]);
            fetchAppointments();
        } catch (err) {
            showToast(err.error || 'Failed to reschedule appointment', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const tabs = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'past', label: 'Past' },
        { key: 'cancelled', label: 'Cancelled' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'unpaid', label: 'Unpaid' },
    ];

    const upcomingSummaryAppointments = appointments
        .filter(a => ['pending', 'confirmed'].includes(a.status))
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
    
    const nextAppointment = upcomingSummaryAppointments.length > 0 ? upcomingSummaryAppointments[0] : null;

    const unpaidAppointments = unpaidSummaryAppointments.filter(
        (a) => a.status === 'pending' && a.paymentStatus === 'unpaid'
    );

    const unpaidWithDeadline = unpaidAppointments
        .map((a) => {
            const deadline = getFrontendPaymentDeadline(a);
            const remainingMs = getRemainingMs(deadline, nowTs);
            return { ...a, deadline, remainingMs };
        })
        .filter((a) => a.remainingMs > 0)
        .sort((a, b) => a.remainingMs - b.remainingMs);

    const nearestExpiring = unpaidWithDeadline[0] || null;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-100 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
                    ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
                >
                    {toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)}>
                        <X className="w-4 h-4 opacity-70 hover:opacity-100" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Appointments</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchAppointments} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/patient/book-appointment', { state: { fromMyAppointments: true } })}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:block">Book Appointment</span>
                    </button>
                </div>
            </div>

            {/* Tab Bar Navigation */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex gap-8 border-b border-slate-200 w-full overflow-x-auto no-scrollbar">
                    {tabs.map(({ key, label }) => {
                        const isActive = activeTab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`pb-4 text-sm font-medium transition-all whitespace-nowrap overflow-visible ${
                                    isActive
                                        ? 'text-blue-600 border-b-2 border-blue-600 font-semibold flex gap-2 items-center'
                                        : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
                                }`}
                            >
                                {label}
                                {isActive && key === 'upcoming' && upcomingSummaryAppointments.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[10px] text-blue-700 font-bold">
                                        {upcomingSummaryAppointments.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bento-style Grid Summary (Only displayed on Upcoming tab) */}
            {activeTab === 'upcoming' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    
                    {/* Next Appointment Card */}
                    <div className="col-span-1 md:col-span-2 bg-blue-600 text-white p-6 rounded-xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center relative overflow-hidden gap-4">
                        {nextAppointment ? (
                            <>
                                <div className="z-10">
                                    <p className="text-sm font-medium text-blue-100 mb-1">Next Appointment</p>
                                    <h3 className="text-2xl font-bold mb-4">{nextAppointment.doctorFullName}</h3>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-md">
                                            <Calendar className="w-4 h-4 text-white" />
                                            <span className="font-mono text-sm tracking-wide">{formatDate(nextAppointment.appointmentDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-md">
                                            <Clock className="w-4 h-4 text-white" />
                                            <span className="font-mono text-sm tracking-wide">{nextAppointment.timeSlot}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="z-10 flex flex-col sm:items-end gap-3 mt-2 sm:mt-0">
                                    {nextAppointment.status === 'confirmed' ? (
                                        <>
                                            <button className="bg-white text-blue-600 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-50 active:scale-95 transition-all w-fit">
                                                Join Session
                                            </button>
                                            <span className="text-[10px] uppercase tracking-widest text-blue-100 opacity-90 text-right">
                                                Status: Confirmed
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <button className="bg-amber-400 text-amber-950 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-amber-300 active:scale-95 transition-all w-fit">
                                                Payment Required
                                            </button>
                                            <span className="text-[10px] uppercase tracking-widest text-blue-100 opacity-90 text-right">
                                                Unconfirmed
                                            </span>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="z-10 w-full flex flex-col items-start justify-center">
                                <h3 className="text-xl font-bold mb-2">No upcoming appointments</h3>
                                <p className="text-blue-100 text-sm mb-4">Your schedule is clear! Book a new consultation if you need one.</p>
                                <button 
                                    onClick={() => navigate('/patient/book-appointment')}
                                    className="bg-white text-blue-600 px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-50 active:scale-95 transition-all"
                                >
                                    Find a Doctor
                                </button>
                            </div>
                        )}
                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    {/* Outstanding Balance */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <Clock3 className="w-5 h-5" />
                                </span>
                                {nearestExpiring && (
                                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded">
                                        EXPIRING SOON
                                    </span>
                                )}
                            </div>

                            <p className="text-sm font-medium text-slate-500 mb-1">Nearest Expiration</p>

                            {nearestExpiring ? (
                                <>
                                    <p className="text-base font-bold text-slate-900 truncate">
                                        {nearestExpiring.doctorFullName}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatDate(nearestExpiring.appointmentDate)} • {nearestExpiring.timeSlot}
                                    </p>
                                    <p className="text-2xl font-mono font-bold text-red-600 mt-2">
                                        {formatRemaining(nearestExpiring.remainingMs)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-slate-500">No unpaid appointments near expiry.</p>
                            )}
                        </div>

                        {nearestExpiring ? (
                            <button
                                onClick={() => handlePayNow(nearestExpiring)}
                                className="w-full text-center py-2 mt-4 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                            >
                                Pay This Appointment
                            </button>
                        ) : (
                            <div className="w-full text-center py-2 mt-4 text-sm font-semibold text-green-600 bg-green-50 rounded-lg border border-green-100 flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-4 h-4" /> All Clear
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* List Header */}
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                {activeTab === 'upcoming' && 'Upcoming Schedule'}
                {activeTab === 'past' && 'Past Appointments'}
                {activeTab === 'cancelled' && 'Cancelled Appointments'}
                {activeTab === 'rejected' && 'Rejected Appointments'}
                {activeTab === 'unpaid' && 'Unpaid Appointments'}
            </h4>

            {/* Content Lists */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
                    <p className="font-medium text-slate-600">{error}</p>
                    <button onClick={fetchAppointments} className="mt-4 text-sm text-blue-600 font-bold hover:underline">
                        Try again
                    </button>
                </div>
            ) : filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="w-40 h-40 mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-16 h-16 text-slate-300" strokeWidth={1.5} />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">No appointments here</h4>
                    <p className="text-slate-500 max-w-sm mb-6">It looks like you don't have any appointments in this category.</p>
                    {activeTab === 'upcoming' && (
                        <button 
                            onClick={() => navigate('/patient/book-appointment')}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all"
                        >
                            Book New Appointment
                        </button>
                    )}
                </div>
            ) : (
                <div className={activeTab === 'rejected' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                    {displayedAppointments.map((appointment) => {
                        const deadline = getFrontendPaymentDeadline(appointment);
                        const remainingMs = getRemainingMs(deadline, nowTs);
                        const canPayNow =
                            appointment.status === 'pending' &&
                            appointment.paymentStatus === 'unpaid' &&
                            remainingMs > 0;

                        return activeTab === 'rejected' ? (
                            <RejectedAppointmentCard
                                key={appointment._id}
                                appointment={appointment}
                            />
                        ) : (
                            <AppointmentCard
                                key={appointment._id}
                                appointment={appointment}
                                onCancel={setCancelTarget}
                                onReschedule={handleReschedule}
                                onPayNow={handlePayNow}
                                canPayNow={canPayNow}
                                paymentTimeLeftLabel={canPayNow ? formatRemaining(remainingMs) : ''}
                            />
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
                    <p className="text-sm font-medium text-slate-500">Page {page} of {totalPages}</p>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all font-medium"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all font-medium"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {cancelTarget && (
                <CancelModal
                    appointment={cancelTarget}
                    onConfirm={handleCancelConfirm}
                    onClose={() => setCancelTarget(null)}
                    loading={actionLoading}
                />
            )}

            {/* Reschedule Modal Overlay */}
            {rescheduleTarget && (
                rescheduleAvailabilityLoading ? (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="relative bg-white rounded-xl p-8 flex flex-col items-center space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm text-slate-600 font-medium">Loading doctor availability...</p>
                        </div>
                    </div>
                ) : (
                    <RescheduleModal
                        appointment={rescheduleTarget}
                        doctorAvailability={rescheduleAvailability}
                        onConfirm={handleRescheduleConfirm}
                        onClose={() => {
                            setRescheduleTarget(null);
                            setRescheduleAvailability([]);
                        }}
                        loading={actionLoading}
                    />
                )
            )}
        </div>
    );
}