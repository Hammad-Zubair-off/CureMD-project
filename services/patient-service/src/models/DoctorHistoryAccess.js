import mongoose from 'mongoose';

/**
 * DoctorHistoryAccess
 *
 * Tracks which doctors have been granted 24-hour full history access
 * for a specific patient, tied to a specific appointment.
 *
 * Created the FIRST TIME a doctor calls GET /api/patients/history/doctor/:patientId
 * for an appointment where sharingMode is 'FULL'.
 * The 24h clock starts at that moment — not at booking time.
 *
 * MongoDB TTL index auto-deletes the record after expiresAt,
 * revoking access without any cron jobs.
 */
const doctorHistoryAccessSchema = new mongoose.Schema(
    {
        // The doctor who was granted access
        doctorId: {
            type: String,
            required: true,
            index: true,
        },

        // The patient whose history is being accessed
        patientId: {
            type: String,
            required: true,
        },

        // The specific appointment that granted this access
        // Verified via appointment-service (Method 3) on first access
        appointmentId: {
            type: String,
            required: true,
        },

        // Always 'FULL' — stored for audit trail
        sharingMode: {
            type: String,
            enum: ['FULL'],
            required: true,
            default: 'FULL',
        },

        // When this access window expires — 24h from first access
        // TTL index removes the document automatically at this time
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// TTL index — MongoDB auto-deletes record when expiresAt is reached
doctorHistoryAccessSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

// Compound index — fast lookup by doctor + patient + appointment
doctorHistoryAccessSchema.index({ doctorId: 1, patientId: 1, appointmentId: 1 });

const DoctorHistoryAccess = mongoose.model('DoctorHistoryAccess', doctorHistoryAccessSchema);
export default DoctorHistoryAccess;