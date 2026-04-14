import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import {
    Activity, LogOut, Calendar, Clock, User, Phone,
    Mail, ChevronLeft, ChevronRight, RefreshCw,
    CheckCircle, XCircle, AlertCircle, Loader2,
    Stethoscope, CreditCard, FileText, Filter,
} from 'lucide-react';

const StatusBadge = ({ status }) => {
    const config = {
        pending:   { color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: <AlertCircle className="w-3 h-3" />,  label: 'Pending'   },
        confirmed: { color: 'bg-blue-50 text-blue-700 border-blue-200',      icon: <CheckCircle className="w-3 h-3" />,  label: 'Confirmed' },
        completed: { color: 'bg-green-50 text-green-700 border-green-200',   icon: <CheckCircle className="w-3 h-3" />,  label: 'Completed' },
        cancelled: { color: 'bg-red-50 text-red-700 border-red-200',         icon: <XCircle className="w-3 h-3" />,      label: 'Cancelled' },
        expired:   { color: 'bg-slate-100 text-slate-500 border-slate-200',  icon: <XCircle className="w-3 h-3" />,      label: 'Expired'   },
    };
    const { color, icon, label } = config[status] || config.expired;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
            {icon}{label}
        </span>
    );
};

const PaymentBadge = ({ status }) => {
    const config = {
        paid:     'bg-green-50 text-green-700 border-green-200',
        unpaid:   'bg-red-50 text-red-700 border-red-200',
        refunded: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config[status] || config.unpaid}`}>
            {status}
        </span>
    );
};

// ── Upcoming Appointment Card ─────────────────────────────────────────────────
const UpcomingCard = ({ appt, isNext = false }) => (
    <div className={`relative bg-white rounded-2xl border p-5 flex flex-col gap-3 ${isNext ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
        {isNext && (
            <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                Next Up
            </span>
        )}
        {/* Patient */}
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                {appt.patientFirstName?.[0]}{appt.patientLastName?.[0]}
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{appt.patientFullName}</p>
                <p className="text-xs text-slate-400 truncate">{appt.patientEmail}</p>
            </div>
            <div className="ml-auto shrink-0">
                <StatusBadge status={appt.status} />
            </div>
        </div>
        {/* Date & time */}
        <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-800">{appt.timeSlot}</span>
            </span>
        </div>
        {/* Reason */}
        {appt.reason && (
            <p className="text-xs text-slate-500 line-clamp-1 bg-slate-50 rounded-lg px-3 py-1.5">
                {appt.reason}
            </p>
        )}
    </div>
);

const AppointmentCard = ({ appt }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                    {appt.patientFirstName?.[0]}{appt.patientLastName?.[0]}
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900">{appt.patientFullName}</p>
                    <p className="text-xs text-slate-400">{appt.specialty}</p>
                </div>
            </div>
            <StatusBadge status={appt.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {appt.timeSlot}
            </div>
            <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{appt.patientEmail}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {appt.patientPhone}
            </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                LKR {appt.consultationFee?.toLocaleString()}
            </div>
            <PaymentBadge status={appt.paymentStatus} />
        </div>
        {appt.reason && (
            <div className="bg-slate-50 rounded-xl px-3 py-2 flex gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{appt.reason}</p>
            </div>
        )}
    </div>
);

export default function DoctorAppointments() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const LIMIT = 10;

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await appointmentService.getDoctorAppointments(page, LIMIT);
            setAppointments(data.appointments || []);
            setTotal(data.total || 0);
            setPages(data.pages || 1);
        } catch (err) {
            console.error('fetchAppointments error:', err);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
    useEffect(() => { setPage(1); }, [statusFilter]);

    const filtered = statusFilter
        ? appointments.filter(a => a.status === statusFilter)
        : appointments;

    const stats = {
        total,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        pending:   appointments.filter(a => a.status === 'pending').length,
        completed: appointments.filter(a => a.status === 'completed').length,
    };

    // ── Upcoming: confirmed or pending, sorted by date ascending ─────────────
    const upcoming = appointments
        .filter(a => ['confirmed', 'pending'].includes(a.status) && new Date(a.appointmentDate) >= new Date())
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
        .slice(0, 3); // show max 3

    const handleLogout = async () => { await logout(); navigate('/'); };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* Page title */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
                    <p className="text-slate-500 text-sm mt-1">All appointments booked with you, sorted by most recent.</p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total',     value: total,           color: 'bg-blue-50 text-blue-600'     },
                        { label: 'Confirmed', value: stats.confirmed, color: 'bg-indigo-50 text-indigo-600' },
                        { label: 'Pending',   value: stats.pending,   color: 'bg-amber-50 text-amber-600'   },
                        { label: 'Completed', value: stats.completed, color: 'bg-green-50 text-green-600'   },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5">
                            <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Upcoming Appointments Section ── */}
                {!loading && upcoming.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Upcoming Appointments</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Your next scheduled patients</p>
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                                {upcoming.length} upcoming
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcoming.map((appt, i) => (
                                <UpcomingCard key={appt._id} appt={appt} isNext={i === 0} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Filter bar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="py-2 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white text-slate-700"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="expired">Expired</option>
                    </select>
                    <button
                        onClick={fetchAppointments}
                        className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* ── Desktop table ── */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Calendar className="w-10 h-10 mb-3 opacity-40" />
                            <p className="font-medium">No appointments found</p>
                            <p className="text-sm mt-1">Try changing the status filter</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        {['Patient', 'Date & Time', 'Reason', 'Fee', 'Payment', 'Status'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-6 py-3">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(appt => (
                                        <tr key={appt._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                                                        {appt.patientFirstName?.[0]}{appt.patientLastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{appt.patientFullName}</p>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                <Mail className="w-3 h-3" />{appt.patientEmail}
                                                            </span>
                                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                <Phone className="w-3 h-3" />{appt.patientPhone}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-800 font-medium">
                                                    {new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{appt.timeSlot}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm text-slate-600 line-clamp-2">{appt.reason}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-slate-800">
                                                    LKR {appt.consultationFee?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <PaymentBadge status={appt.paymentStatus} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={appt.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && pages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                Page {page} of {pages} · {total} total
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                                    disabled={page === pages}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Mobile cards ── */}
                <div className="md:hidden space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Calendar className="w-10 h-10 mb-3 opacity-40" />
                            <p className="font-medium">No appointments found</p>
                        </div>
                    ) : (
                        <>
                            {filtered.map(appt => <AppointmentCard key={appt._id} appt={appt} />)}
                            {pages > 1 && (
                                <div className="flex items-center justify-between pt-2">
                                    <p className="text-sm text-slate-500">Page {page} of {pages}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(pages, p + 1))}
                                            disabled={page === pages}
                                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}