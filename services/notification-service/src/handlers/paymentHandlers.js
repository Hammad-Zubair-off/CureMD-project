import { subscribeToEvent } from '../utils/eventBus.js';
import { sendEmail } from '../utils/emailSender.js';
import { refundConfirmationTemplate } from '../templates/email/refundConfirmation.js';
import { logger } from '../utils/logger.js';

/**
 * Handles payment.refunded event
 * Sends refund confirmation email to patient
 */
const handlePaymentRefunded = async (data) => {
    const {
        paymentId,
        patientFullName,
        patientEmail,
        amount,
        refundedAt,
    } = data;

    logger.info(`[PaymentHandler] Processing payment.refunded: ${paymentId}`);

    if (!patientEmail) {
        logger.warn(`[PaymentHandler] No patientEmail in payment.refunded event — skipping email for payment: ${paymentId}`);
        return;
    }

    const { subject, html } = refundConfirmationTemplate({
        patientFullName,
        amount,
        paymentId,
        refundedAt,
    });

    await sendEmail(patientEmail, subject, html);
};

/**
 * Register all payment event subscriptions
 */
export const registerPaymentHandlers = async () => {
    await subscribeToEvent('payment.refunded', handlePaymentRefunded);
    logger.success('[PaymentHandler] Subscribed to payment events');
};