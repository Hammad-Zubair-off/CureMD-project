import mongoose, { mongo } from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: String,
            required: [true, 'Appointment ID is required'],
            index: true,
        },
        patientId: {
            type: String,
            required: [true, 'Patient ID is required'],
        },
        doctorId: {
            type: String,
            required: [true, 'Doctor ID is required'],
        },
        stripePaymentIntentId: {
            type: String,
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Amount cannot be negative'],
        },
        currency: {
            type: String,
            default: 'usd',
        },
        status: {
            type: String,
            enum: ['pending', 'succeeded', 'failed', 'refunded', 'cancelled'],
            default: 'pending',
        },
        refundId: { type: String, default: null },
        refundedAt: { type: Date, default: null },
 
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        expiresAt: {
            type: Date,
             default: () => new Date(Date.now() + 30 * 60 * 1000),
        },
    },
    { timestamps: true }
);

paymentSchema.index(
    { expiresAt: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: { expiresAt: { $type: 'date' } },
    }
);

paymentSchema.index({ patientId: 1 });
// paymentSchema.index({ stripePaymentIntentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;