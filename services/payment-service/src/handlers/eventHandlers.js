import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import { publishEvent } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

/**
 * Dispatch table for inbound async events (see routes/eventRoutes.js).
 * Each handler is `async (data) => void`; throwing triggers a QStash retry.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const processAutoRefund = async (event, reason) => {
    const payment = event.paymentId
        ? await Payment.findById(event.paymentId)
        : await Payment.findOne({ appointmentId: event.appointmentId });

    if (!payment) {
        logger.warn(`[RefundConsumer] No payment found for appointment ${event.appointmentId}`);
        return;
    }
    if (payment.status === 'refunded') {
        logger.info(`[RefundConsumer] Already refunded payment ${payment._id}`);
        return;
    }
    if (payment.status !== 'succeeded') {
        logger.warn(`[RefundConsumer] Skip refund. Payment status is ${payment.status} for ${payment._id}`);
        return;
    }

    const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
    });

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundedAt = new Date();
    await payment.save();

    await publishEvent('payment.refunded', {
        paymentId: payment._id.toString(),
        appointmentId: payment.appointmentId,
        patientId: payment.patientId,
        doctorId: payment.doctorId,
        amount: payment.amount,
        refundedAt: payment.refundedAt,
        reason,
        patientEmail: event.patientEmail || null,
        patientFullName: event.patientFullName || null,
    });

    logger.success(`[RefundConsumer] Auto refund completed for payment ${payment._id}`);
};

export const EVENT_HANDLERS = {
    'appointment.rejected_by_doctor': async (data) => {
        await processAutoRefund(data, 'doctor_rejected_appointment');
    },
    'appointment.cancelled': async (data) => {
        if (!data?.refundRequired) {
            logger.info(
                `[RefundConsumer] Cancellation without paid status. No refund required for appointment ${data?.appointmentId}`,
            );
            return;
        }
        await processAutoRefund(data, 'patient_cancelled_appointment');
    },
};
