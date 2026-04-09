import mongoose from 'mongoose';

/**
 * MedicalHistorySnapshot
 *
 * A frozen copy of the patient's medical data at the moment they booked
 * an appointment. Created by patient-service when the frontend calls
 * POST /api/patients/snapshot before submitting the booking.
 *
 * The appointment document in appointment-service stores only the
 * snapshotId and sharesMedicalHistory flag — it never stores the data itself.
 *
 * When a doctor opens an appointment, doctor-service calls
 * GET /api/patients/snapshot/:snapshotId (Method 3) to fetch this document.
 *
 * Because this is a snapshot, it is NEVER updated after creation.
 * If a patient's medications change, a new snapshot is created at the
 * next booking — old appointments keep the historical record intact.
 */
const medicalHistorySnapshotSchema = new mongoose.Schema(
    {
        // Which patient this snapshot belongs to
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        // Always captured (required fields)
        dateOfBirth: { type: Date, default: null },
        gender: { type: String, default: null },
        bloodType: { type: String, default: null },
        height: { type: Number, default: null },
        weight: { type: Number, default: null },
        emergencyContact: {
            name: { type: String, default: null },
            phone: { type: String, default: null },
            relationship: { type: String, default: null },
        },

        // Captured only if sharesMedicalHistory is true
        // If false, these arrays are stored empty regardless of what
        // the patient has saved in their profile.
        sharesMedicalHistory: {
            type: Boolean,
            required: true,
            default: false,
        },
        allergies: { type: [String], default: [] },
        currentMedications: { type: [String], default: [] },
        chronicConditions: { type: [String], default: [] },

        // When this snapshot was taken — useful for audit trail
        snapshotTakenAt: {
            type: Date,
            default: Date.now,
            immutable: true, // never allow updating this field
        },
    },
    {
        timestamps: true,
        // Prevent any updates after creation — snapshots are immutable
        // (enforced at the controller level, this just makes intent clear)
    }
);

const MedicalHistorySnapshot = mongoose.model('MedicalHistorySnapshot', medicalHistorySnapshotSchema);
export default MedicalHistorySnapshot;
