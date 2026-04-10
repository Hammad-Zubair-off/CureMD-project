import { useState } from 'react';
import { X, Star, MapPin, Briefcase, GraduationCap, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { TIME_SLOTS } from '../../data/mockDoctors';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

const isDoctorAvailable = (doctor, date) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    return doctor.availableDays.includes(dayName);
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function DoctorDetailModal({ doctor, onClose, onBook }) {
    const next7Days = getNext7Days();
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [datePageStart, setDatePageStart] = useState(0);

    const visibleDays = next7Days.slice(datePageStart, datePageStart + 4);

    const handleDateSelect = (date) => {
        if (!isDoctorAvailable(doctor, date)) return;
        setSelectedDate(date);
        setSelectedSlot(null);
    };

    const handleSlotSelect = (slot) => {
        setSelectedSlot(slot);
    };

    const handleBookNow = () => {
        if (selectedDate && selectedSlot) {
            // Pass pre-selected slot data to booking drawer
            onBook(doctor, {
                date: selectedDate,
                timeSlot: selectedSlot,
            });
        } else {
            // Book without pre-selection
            onBook(doctor, null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                    <h2 className="text-lg font-bold text-slate-900">Doctor Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* ── Doctor Info ── */}
                    <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
                            {doctor.firstName[0]}{doctor.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-slate-900">{doctor.fullName}</h3>
                            <p className="text-blue-600 font-medium">{doctor.specialty}</p>
                            <div className="flex items-center space-x-1 mt-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <p className="text-sm text-slate-400">{doctor.location}</p>
                            </div>
                            <div className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    <span className="text-sm font-semibold text-slate-700">{doctor.rating}</span>
                                    <span className="text-xs text-slate-400">({doctor.reviewCount} reviews)</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-500">{doctor.experience} yrs experience</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xs text-slate-400">Consultation</p>
                            <p className="text-lg font-bold text-slate-900">
                                LKR {doctor.consultationFee.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* ── About ── */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">About</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{doctor.about}</p>
                    </div>

                    {/* ── Qualifications ── */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-2">
                            <GraduationCap className="w-4 h-4 text-blue-600" />
                            <span>Qualifications</span>
                        </h4>
                        <ul className="space-y-1.5">
                            {doctor.qualifications.map((q, i) => (
                                <li key={i} className="flex items-start space-x-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                    <span className="text-sm text-slate-500">{q}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Available Days ── */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>Available Days</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                <span
                                    key={day}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border
                                        ${doctor.availableDays.includes(day)
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-slate-50 text-slate-300 border-slate-100'
                                        }`}
                                >
                                    {day.slice(0, 3)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* ── Select Date ── */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>Select a Date <span className="text-slate-400 font-normal">(optional)</span></span>
                        </h4>

                        <div className="flex items-center space-x-2">
                            {/* Prev */}
                            <button
                                onClick={() => setDatePageStart(p => Math.max(0, p - 1))}
                                disabled={datePageStart === 0}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Date Tiles */}
                            <div className="flex-1 grid grid-cols-4 gap-2">
                                {visibleDays.map((date) => {
                                    const available = isDoctorAvailable(doctor, date);
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    return (
                                        <button
                                            key={date.toDateString()}
                                            onClick={() => handleDateSelect(date)}
                                            disabled={!available}
                                            className={`flex flex-col items-center py-3 px-2 rounded-xl border text-sm font-medium transition-all
                                                ${isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : available
                                                        ? 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                                        : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                                }`}
                                        >
                                            <span className="text-xs mb-1 opacity-70">{getDayLabel(date)}</span>
                                            <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Next */}
                            <button
                                onClick={() => setDatePageStart(p => Math.min(3, p + 1))}
                                disabled={datePageStart >= 3}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Select Time Slot ── */}
                    {selectedDate && (
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>Select a Time Slot <span className="text-slate-400 font-normal">(optional)</span></span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {TIME_SLOTS.map((slot) => (
                                    <button
                                        key={slot}
                                        onClick={() => handleSlotSelect(slot)}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all
                                            ${selectedSlot === slot
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Actions ── */}
                    <div className="flex items-center space-x-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBookNow}
                            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-600/20"
                        >
                            {selectedDate && selectedSlot
                                ? 'Book This Slot →'
                                : 'Book Now →'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}