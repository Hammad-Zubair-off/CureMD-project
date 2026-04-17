import { useState, useEffect } from 'react';
import { X, Star, MapPin, Briefcase, GraduationCap, Calendar, Clock, ChevronLeft, ChevronRight, Banknote, CalendarCheck, ArrowRight } from 'lucide-react';
import appointmentService from '../../services/appointmentService';

const getDayLabel = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
};

const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        days.push(d);
    }
    return days;
};

const isDoctorAvailable = (doctor, date) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    return doctor.availability?.some(a => a.day === dayName && a.slots?.length > 0);
};

const getSlotsForDate = (doctor, date) => {
    if (!date) return [];
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    const dayEntry = doctor.availability?.find(a => a.day === dayName);
    if (!dayEntry) return [];
    return dayEntry.slots.map(s => `${s.startTime} - ${s.endTime}`);
};

// Component
export default function DoctorDetailModal({ doctor, onClose, onBook }) {
    const next7Days = getNext7Days();
    const [selectedDate, setSelectedDate] = useState(null);
    const [takenSlots, setTakenSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [datePageStart, setDatePageStart] = useState(0);

    const visibleDays = next7Days.slice(datePageStart, datePageStart + 4);

    const handleDateSelect = (date) => {
        if (!isDoctorAvailable(doctor, date)) return;
        setSelectedDate(date);
        setSelectedSlot(null);
    };

    const handleSlotSelect = (slot) => {
        if (takenSlots.includes(slot)) return;
        setSelectedSlot(slot);
    };

    useEffect(() => {
        if (!doctor?.userId || !selectedDate) {
            setTakenSlots([]);
            return;
        }

        let cancelled = false;

        const fetchTakenSlots = async () => {
            try {
                setSlotsLoading(true);
                const data = await appointmentService.getTakenSlots(
                    doctor.userId,
                    selectedDate.toISOString()
                );
                if (!cancelled) setTakenSlots(data.takenSlots || []);
            } catch {
                if (!cancelled) setTakenSlots([]);
            } finally {
                if (!cancelled) setSlotsLoading(false);
            }
        };

        fetchTakenSlots();

        return () => {
            cancelled = true;
        };
    }, [doctor?.userId, selectedDate]);

    const handleBookNow = () => {
        if (selectedDate && selectedSlot) {
            onBook(doctor, {
                date: selectedDate,
                timeSlot: selectedSlot,
            });
        } else {
            onBook(doctor, null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-md shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden pb-4 pl-3">

                {/* Header */}
                <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-slate-900">Doctor Details & Booking</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* ================= LEFT SIDE (Details) ================= */}
                        <div className="lg:col-span-6 space-y-8">

                            {/* Header Info */}
                            <div className="flex items-center space-x-4">
                                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl shrink-0">
                                    {doctor.firstName[0]}{doctor.lastName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-2xl font-bold text-slate-900">{doctor.fullName}</h3>
                                    <p className="text-blue-600 font-medium text-lg">{doctor.specialty}</p>
                                </div>
                            </div>

                            {/* Details Grid View (Simplified Styles) */}
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <div className="flex items-center space-x-2 text-slate-500 mb-1">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">Location</span>
                                    </div>
                                    <p className="text-slate-900 font-medium truncate" title={doctor.location}>{doctor.location}</p>
                                </div>

                                <div>
                                    <div className="flex items-center space-x-2 text-slate-500 mb-1">
                                        <Briefcase className="w-4 h-4" />
                                        <span className="text-sm">Experience</span>
                                    </div>
                                    <p className="text-slate-900 font-medium">{doctor.experience} Years</p>
                                </div>

                                <div>
                                    <div className="flex items-center space-x-2 text-slate-500 mb-1">
                                        <Banknote className="w-4 h-4" />
                                        <span className="text-sm">Consultation Fee</span>
                                    </div>
                                    <p className="text-slate-900 font-medium">LKR {doctor.consultationFee.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* About */}
                            <div>
                                <h4 className="text-base font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">About</h4>
                                <p className="text-sm text-slate-600 leading-relaxed">{doctor.about}</p>
                            </div>

                            {/* Qualifications (Vertical Bullet Points) */}
                            <div>
                                <h4 className="text-base font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2 flex items-center space-x-2">
                                    <GraduationCap className="w-5 h-5 text-slate-500" />
                                    <span>Qualifications</span>
                                </h4>
                                <ul className="list-disc list-outside ml-5 space-y-2 text-slate-600 text-sm">
                                    {doctor.qualifications.map((q, i) => (
                                        <li key={i} className="pl-1 leading-snug">
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* ================= RIGHT SIDE (Scheduling Panel) ================= */}
                        <div className="lg:col-span-6 flex flex-col  bg-white border-l-2 border-slate-200 p-6">

                            <div className="space-y-6 flex-1">
                                {/* Available Days */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>Available Weekly Schedule</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                            const isAvailable = doctor.availability?.some(a => a.day === day && a.slots?.length > 0);
                                            if (!isAvailable) return null;
                                            return (
                                                <span
                                                    key={day}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                                >
                                                    {day.slice(0, 3)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                {/* Select Date */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>Select Appointment Date <span className="text-slate-400 font-normal">(optional)</span></span>
                                    </h4>

                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setDatePageStart(p => Math.max(0, p - 1))}
                                            disabled={datePageStart === 0}
                                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>

                                        <div className="flex-1 grid grid-cols-4 gap-2">
                                            {visibleDays.map((date) => {
                                                const available = isDoctorAvailable(doctor, date);
                                                const isSelected = selectedDate?.toDateString() === date.toDateString();
                                                return (
                                                    <button
                                                        key={date.toDateString()}
                                                        onClick={() => handleDateSelect(date)}
                                                        disabled={!available}
                                                        className={`flex flex-col items-center py-3 px-1 rounded-xl border text-sm font-medium transition-all
                                                            ${isSelected
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]'
                                                                : available
                                                                    ? 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                                                    : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <span className="text-xs mb-1 opacity-80">{getDayLabel(date)}</span>
                                                        <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <button
                                            onClick={() => setDatePageStart(p => Math.min(3, p + 1))}
                                            disabled={datePageStart >= 3}
                                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Select Time Slot */}
                                {selectedDate && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 pb-3">
                                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <span>Select a Time Slot</span>
                                        </h4>
                                        {(() => {
                                            const availableSlots = getSlotsForDate(doctor, selectedDate);

                                            if (slotsLoading) {
                                                return (
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                                                        <p className="text-sm text-slate-500 font-medium">Loading slot availability...</p>
                                                    </div>
                                                );
                                            }

                                            return availableSlots.length === 0 ? (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                                                    <p className="text-sm text-slate-500 font-medium">No slots available for this day.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {availableSlots.map((slot) => {
                                                        const isTaken = takenSlots.includes(slot);

                                                        return (
                                                            <button
                                                                key={slot}
                                                                onClick={() => handleSlotSelect(slot)}
                                                                disabled={isTaken}
                                                                className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all
                                                                    ${isTaken
                                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                        : selectedSlot === slot
                                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:border-blue-400'
                                                                    }`}
                                                            >
                                                                {slot}{isTaken ? ' (Booked)' : ''}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Actions Buttons Fixed at Bottom of Right Column */}
                            <div className="p-5 mt-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBookNow}
                                    className="group flex-2 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center space-x-2"
                                >
                                    {selectedDate && selectedSlot ? (
                                        <>
                                            <span>Confirm Booking</span>
                                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                        </>
                                    ) : (
                                        <>
                                            <CalendarCheck className="w-4 h-4" />
                                            <span>Book Now</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}