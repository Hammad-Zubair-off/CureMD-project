import mongoose from 'mongoose';

/**
 * MedicalHistorySnapshot
 *
 * A frozen copy of the patient's medical data at the moment they booked
 * an appointment. Created by appointment-service (Method 3) during booking.
 *
 * appointmentId links this snapshot back to the appointment bidirectionally:
 *   appointment.patientMedicalHistoryId → snapshot._id
 *   snapshot.appointmentId             → appointment._id
 *
 * LIFECYCLE:
 *   Created:   when appointment is booked (sharingMode !== 'none')
 *   Expires:   30 minutes after creation if payment not completed
 *              (snapshotExpiresAt mirrors appointment.expiresAt)
 *   Confirmed: appointment-service calls PATCH /api/patients/snapshot/:id/confirm
 *              to clear snapshotExpiresAt — snapshot becomes permanent
 *   Orphan prevention: if payment never happens, MongoDB TTL auto-deletes
 *              both the appointment AND this snapshot at the same time
 *
 * sharingMode:
 *   'snapshot_only'    → doctor sees only this snapshot for this appointment
 *   'full_history_24h' → doctor gets 24h access to all snapshots
 *
 * IMMUTABLE fields: all medical data fields, appointmentId, userId, sharingMode
 * MUTABLE fields:   snapshotExpiresAt only (cleared on payment confirmation)
 */
const medicalHistorySnapshotSchema = new mongoose.Schema(
    {
        // Which patient this snapshot belongs to
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        // Which appointment triggered this snapshot
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            unique: true, // one snapshot per appointment
            index: true,
        },

        // Always captured
        dateOfBirth: { type: Date, default: null },
        gender: { type: String, default: null },
        bloodType: { type: String, default: null },
        emergencyContact: {
            name: { type: String, default: null },
            phone: { type: String, default: null },
            relationship: { type: String, default: null },
        },

        // Patient's sharing choice for this appointment
        sharingMode: {
            type: String,
            enum: {
                values: ['MINIMAL', 'FULL'],
                message: 'sharingMode must be MINIMAL or FULL',
            },
            required: true,
        },

        // Medical data — captured for both sharing modes
        allergies: { type: [String], default: [] },
        currentMedications: { type: [String], default: [] },
        chronicConditions: { type: [String], default: [] },

        // Array of MedicalReport ObjectIds copied from the patient's profile
        // at booking time. Empty array for MINIMAL.
        // Populated when fetching the snapshot so doctor gets full objects.
        medicalReports: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'MedicalReport',
            },
        ],

        // TTL - mirrors appointment.expiresAt
        // Set to 30 minutes from creation when appointment is first booked.
        // Cleared (set to null) when payment is confirmed via
        // PATCH /api/patients/snapshot/:id/confirm (called by appointment-service).
        // If payment never happens, MongoDB TTL auto-deletes this snapshot
        // at the same time as the appointment — no orphans left behind.
        snapshotExpiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // createdAt = when the snapshot was taken
    }
);

// TTL index — auto-deletes snapshot when snapshotExpiresAt is reached
// Only applies when snapshotExpiresAt is set (non-null)
// Confirmed snapshots have snapshotExpiresAt cleared so they are never deleted
medicalHistorySnapshotSchema.index(
    { snapshotExpiresAt: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: { snapshotExpiresAt: { $type: 'date' } },
    }
);

const MedicalHistorySnapshot = mongoose.model('MedicalHistorySnapshot', medicalHistorySnapshotSchema);
export default MedicalHistorySnapshot;