//BookinDrawer.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
    X,
    Calendar,
    Clock,
    Phone,
    FileText,
    ChevronLeft,
    ChevronRight,
    Edit2,
    CheckCircle,
    Loader2,
    AlertCircle,
    CreditCard,
    ArrowRight,
    Shield,
} from "lucide-react";
import appointmentService from "../../services/appointmentService";
import Dropdown from "../common/Dropdown";

// Helpers

const getDayLabel = (date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ][date.getDay()];
    return doctor.availability?.some(
        (a) => a.day === dayName && a.slots?.length > 0,
    );
};

const getSlotsForDate = (doctor, date) => {
    if (!date) return [];
    const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ][date.getDay()];
    const dayEntry = doctor.availability?.find((a) => a.day === dayName);
    if (!dayEntry) return [];
    return dayEntry.slots.map((s) => `${s.startTime} - ${s.endTime}`);
};

const formatDateForAPI = (date) => {
    return date.toISOString();
};

const formatDateDisplay = (date) => {
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

// Step Indicator
const StepIndicator = ({ currentStep }) => (
    <div className="flex items-center space-x-2 mb-6">
        {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
                <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === step ? "bg-blue-600 text-white" : currentStep > step ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}
                >
                    {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                <span
                    className={`ml-2 text-xs font-medium ${currentStep === step ? "text-slate-900" : "text-slate-400"}`}
                >
                    {step === 1 ? "Appointment Details" : "Payment"}
                </span>
                {step < 2 && <div className="w-8 h-px bg-slate-200 mx-3" />}
            </div>
        ))}
    </div>
);

// Step 1 — Appointment Details
const Step1 = ({
    doctor,
    formData,
    setFormData,
    preSelectedSlot,
    onNext,
    loading,
    error,
}) => {
    const next7Days = getNext7Days();
    const [datePageStart, setDatePageStart] = useState(0);
    const [editingSlot, setEditingSlot] = useState(!preSelectedSlot);

    const visibleDays = next7Days.slice(datePageStart, datePageStart + 4);

    const handleDateSelect = (date) => {
        if (!isDoctorAvailable(doctor, date)) return;
        setFormData((f) => ({ ...f, selectedDate: date, timeSlot: "" }));
    };

    const handleSlotSelect = (slot) => {
        setFormData((f) => ({ ...f, timeSlot: slot }));
        setEditingSlot(false);
    };

    const isValid =
        formData.selectedDate &&
        formData.timeSlot &&
        formData.reason.trim().length >= 10 &&
        formData.patientPhone.trim().length >= 7 &&
        formData.sharingMode;

    return (
        <div className="space-y-6">
            {/* Doctor Summary */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                    {doctor.firstName[0]}
                    {doctor.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{doctor.fullName}</p>
                    <p className="text-sm text-blue-600">{doctor.specialty}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Fee</p>
                    <p className="font-bold text-slate-900">
                        LKR {doctor.consultationFee.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-start space-x-3 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* 1. Select Date */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    1. Select Date
                </p>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setDatePageStart((p) => Math.max(0, p - 1))}
                        disabled={datePageStart === 0}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex-1 grid grid-cols-4 gap-2">
                        {visibleDays.map((date) => {
                            const available = isDoctorAvailable(doctor, date);
                            const isSelected =
                                formData.selectedDate?.toDateString() === date.toDateString();
                            return (
                                <button
                                    key={date.toDateString()}
                                    onClick={() => handleDateSelect(date)}
                                    disabled={!available}
                                    className={`flex flex-col items-center py-3 rounded-xl border text-sm font-medium transition-all
                                    ${isSelected
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                            : available
                                                ? "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                                : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                        }`}
                                >
                                    <span className="text-xs mb-1 opacity-70">
                                        {getDayLabel(date)}
                                    </span>
                                    <span className="text-lg font-bold leading-none">
                                        {date.getDate()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setDatePageStart((p) => Math.min(3, p + 1))}
                        disabled={datePageStart >= 3}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 2. Select Time */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        2. Select Time
                    </p>
                    {/* Edit button — only shown when slot was pre-selected (Scenario B) */}
                    {preSelectedSlot && !editingSlot && formData.timeSlot && (
                        <button
                            onClick={() => setEditingSlot(true)}
                            className="flex items-center space-x-1 text-xs text-blue-600 font-medium hover:underline"
                        >
                            <Edit2 className="w-3 h-3" />
                            <span>Change</span>
                        </button>
                    )}
                </div>

                {/* Show selected slot as pill when not editing */}
                {!editingSlot && formData.timeSlot ? (
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">
                            {formData.timeSlot}
                        </span>
                    </div>
                ) : (
                    <div>
                        {!formData.selectedDate ? (
                            <p className="text-sm text-slate-400 italic">
                                Please select a date first
                            </p>
                        ) : (
                            (() => {
                                const availableSlots = getSlotsForDate(
                                    doctor,
                                    formData.selectedDate,
                                );
                                return availableSlots.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">
                                        No slots available for this day
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableSlots.map((slot) => (
                                            <button
                                                key={slot}
                                                onClick={() => handleSlotSelect(slot)}
                                                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all
                                            ${formData.timeSlot === slot
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                                    }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                )}
            </div>

            {/* 3. Reason for Visit */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    3. Reason for Visit
                </p>
                <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                        rows={3}
                        placeholder="Briefly describe your symptoms or reason for the appointment..."
                        value={formData.reason}
                        onChange={(e) =>
                            setFormData((f) => ({ ...f, reason: e.target.value }))
                        }
                        className="w-full pl-9 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                    />
                </div>
                {formData.reason.trim().length > 0 &&
                    formData.reason.trim().length < 10 && (
                        <p className="text-xs text-red-500 mt-1">
                            Please provide at least 10 characters
                        </p>
                    )}
            </div>

            {/* 4. Phone Number */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    4. Contact Number
                </p>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="tel"
                        placeholder="e.g. 0771234567"
                        value={formData.patientPhone}
                        onChange={(e) =>
                            setFormData((f) => ({ ...f, patientPhone: e.target.value }))
                        }
                        className="w-full pl-9 pr-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                </div>
            </div>

            {/* 5. Share Medical History */}
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    5. Share Medical History
                </p>
                <div className="relative">
                    <Shield className="absolute left-4 top-[1.1rem] w-4.5 h-4.5 z-10 text-slate-400 pointer-events-none" />
                    <Dropdown
                        value={formData.sharingMode}
                        onChange={(val) =>
                            setFormData((f) => ({ ...f, sharingMode: val }))
                        }
                        options={[
                            { value: 'none', label: 'Do not share' },
                            { value: 'snapshot_only', label: 'Share Snapshot for this consultation' },
                            { value: 'full_history_24h', label: 'Grant Full History access for 24 hours' }
                        ]}
                        className="pl-12 pt-1"
                    />
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Allowing the doctor to securely view your medical history can result
                    in a more accurate diagnosis.
                </p>
            </div>

            {/* Next Button */}
            <button
                onClick={onNext}
                disabled={!isValid || loading}
                className="w-full py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-600/20 flex items-center justify-center space-x-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Appointment...</span>
                    </>
                ) : (
                    <>
                        <span>Continue to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>
    );
};

// Main Drawer
export default function BookingDrawer({ doctor, preSelectedSlot, onClose }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [appointmentId, setAppointmentId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        selectedDate: preSelectedSlot?.date || null,
        timeSlot: preSelectedSlot?.timeSlot || "",
        reason: "",
        patientPhone: "",
        sharingMode: "none",
    });

    // Step 1 Submit — create appointment
    const handleNext = async () => {
        setLoading(true);
        setError("");
        try {
            const payload = {
                doctorId: doctor.id,
                doctorFullName: doctor.fullName,
                specialty: doctor.specialty,
                consultationFee: doctor.consultationFee,
                appointmentDate: formatDateForAPI(formData.selectedDate),
                timeSlot: formData.timeSlot,
                reason: formData.reason.trim(),
                patientPhone: formData.patientPhone.trim(),
                sharingMode: formData.sharingMode,
            };

            const data = await appointmentService.createAppointment(payload);

            sessionStorage.setItem(
                "bookingAppointment",
                JSON.stringify(data.appointment),
            );

            navigate(`/payment?appointmentId=${data.appointment._id}`);
            onClose();
            // setAppointmentId(data.appointment._id);
            // setStep(2);
        } catch (err) {
            setError(
                err.error ||
                err.errors?.[0] ||
                "Failed to create appointment. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    // Payment success
    const handlePaymentSuccess = () => {
        setSuccess(true);
    };

    // Done — navigate to My Appointments
    const handleDone = () => {
        onClose();
        navigate("/patient/my-appointments");
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40"
                onClick={!loading ? onClose : undefined}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-120 bg-white shadow-2xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                    <h2 className="text-lg font-bold text-slate-900">Complete Booking</h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <StepIndicator currentStep={1} /> {/* Always show step 1 */}
                    <Step1
                        doctor={doctor}
                        formData={formData}
                        setFormData={setFormData}
                        preSelectedSlot={preSelectedSlot}
                        onNext={handleNext}
                        loading={loading}
                        error={error}
                    />
                </div>
            </div>
        </>
    );
}