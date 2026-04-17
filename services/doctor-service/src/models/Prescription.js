import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema({
    name:      { type: String, required: true, trim: true },
    dosage:    { type: String, required: true, trim: true },   // e.g. "500mg"
    frequency: { type: String, required: true, trim: true },   // e.g. "Twice daily"
    duration:  { type: String, required: true, trim: true },   // e.g. "7 days"
    notes:     { type: String, trim: true, default: '' },
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
    doctorId:      { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    patientId:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    sessionId:     { type: String, required: true },           // Agora/telemedicine session ID

    medications:   { type: [medicationSchema], required: true, validate: v => v.length > 0 },

    diagnosis:     { type: String, trim: true, default: '' },
    instructions:  { type: String, trim: true, default: '' },  // General instructions

    status: {
        type: String,
        enum: ['draft', 'issued'],
        default: 'draft',
    },

    issuedAt: { type: Date },
}, {
    timestamps: true,
});

// Only one prescription per appointment (can be updated while in draft)
prescriptionSchema.index({ appointmentId: 1 }, { unique: true });

export const Prescription = mongoose.model('Prescription', prescriptionSchema);