// models/DoctorHistoryAccess.js
import mongoose from 'mongoose';

const doctorHistoryAccessSchema = new mongoose.Schema({
    doctorId: {
        type: String, // from the Doctor JWT
        required: true,
        index: true,
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    firstAccessedAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        required: true,
    }
});

// Auto-delete the document when the 24-hour window expires
doctorHistoryAccessSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('DoctorHistoryAccess', doctorHistoryAccessSchema);