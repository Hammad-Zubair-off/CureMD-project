import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed', 'expired'],
            required: true,
        },
        changedAt: {
            type: Date,
            default: Date.now,
        },
        changedBy: {
            type: String,
            required: true,
            enum: ['patient', 'doctor', 'payment-service', 'system'],
        },
    },
    { _id: false }
);

const appointmentSchema = new mongoose.Schema(
    {
        // Patient Info (from JWT)
        patientId: {
            type: String,
            required: [true, 'Patient ID is required'],
        },
        patientFirstName: {
            type: String,
            required: [true, 'Patient first name is required'],
        },
        patientLastName: {
            type: String,
            required: [true, 'Patient last name is required'],
        },
        patientFullName: {
            type: String,
            required: [true, 'Patient full name is required'],
        },
        patientEmail: {
            type: String,
            required: [true, 'Patient email is required'],
        },
        patientPhone: {
            type: String,
            required: [true, 'Patient phone is required'],
        },

        // Doctor Info (from frontend — Method 1, no inter-service call)
        doctorId: {
            type: String,
            required: [true, 'Doctor ID is required'],
        },
        doctorFullName: {
            type: String,
            required: [true, 'Doctor full name is required'],
        },
        specialty: {
            type: String,
            required: [true, 'Specialty is required'],
        },
        consultationFee: {
            type: Number,
            required: [true, 'Consultation fee is required'],
            min: [0, 'Consultation fee cannot be negative'],
        },

        // Appointment Details
        appointmentDate: {
            type: Date,
            required: [true, 'Appointment date is required'],
        },
        timeSlot: {
            type: String,
            required: [true, 'Time slot is required'], // e.g. "09:00 - 09:30"
        },
        reason: {
            type: String,
            required: [true, 'Reason for visit is required'],
            trim: true,
            maxlength: [500, 'Reason must not exceed 500 characters'],
        },

        // Status
        status: {
            type: String,
            enum: {
                values: ['pending', 'confirmed', 'cancelled', 'completed', 'expired'],
                message: 'Invalid appointment status',
            },
            default: 'pending',
        },
        statusHistory: {
            type: [statusHistorySchema],
            default: [],
        },

        // Payment
        paymentId: {
            type: String,
            default: null,
        },
        paymentStatus: {
            type: String,
            enum: {
                values: ['unpaid', 'paid', 'refunded'],
                message: 'Invalid payment status',
            },
            default: 'unpaid',
        },

        // Post-consultation
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes must not exceed 1000 characters'],
            default: null,
        },

        // Rejection reason — set by doctor when rejecting a confirmed appointment
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: [500, 'Rejection reason must not exceed 500 characters'],
            default: null,
        },

        // ─ TTL — auto-expire unpaid appointments ─
        // Set to 30 minutes from creation, cleared when payment is confirmed
        // MongoDB TTL index deletes the document when expiresAt is reached
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true, optimisticConcurrency: true }
);

// ─ Indexes ─

// TTL index — MongoDB auto-deletes document when expiresAt is reached
// Only applies when expiresAt is set (non-null) — confirmed appointments
// have expiresAt cleared so they are never deleted
appointmentSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $type: 'date' } } }
);

// Common query indexes
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });

// Prevent double booking — same doctor, same date, same time slot
// Only enforced for non-cancelled, non-expired appointments
appointmentSchema.index(
    { doctorId: 1, appointmentDate: 1, timeSlot: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ['pending', 'confirmed'] },
        },
    }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;