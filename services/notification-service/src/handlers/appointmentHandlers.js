import { subscribeToEvent } from '../utils/eventBus.js';
import { sendEmail } from '../utils/emailSender.js';
import { paymentReceiptTemplate } from '../templates/email/paymentReceipt.js';
import { logger } from '../utils/logger.js';

/**
 * Handles appointment.confirmed event
 * Sends payment receipt email to patient
 */
const handleAppointmentConfirmed = async (data) => {
    const {
        appointmentId,
        patientFullName,
        patientEmail,
        doctorFullName,
        specialty,
        consultationFee,
        appointmentDate,
        timeSlot,
    } = data;

    logger.info(`[AppointmentHandler] Processing appointment.confirmed: ${appointmentId}`);

    const { subject, html } = paymentReceiptTemplate({
        patientFullName,
        doctorFullName,
        specialty,
        appointmentDate,
        timeSlot,
        consultationFee,
        appointmentId,
    });

    await sendEmail(patientEmail, subject, html);
};

/**
 * Register all appointment event subscriptions
 */
export const registerAppointmentHandlers = async () => {
    await subscribeToEvent('appointment.confirmed', handleAppointmentConfirmed);
    logger.success('[AppointmentHandler] Subscribed to appointment events');
};