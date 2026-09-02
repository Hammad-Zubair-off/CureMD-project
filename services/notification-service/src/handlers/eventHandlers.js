import { sendEmail } from '../utils/emailSender.js';
import { sendSMS } from '../utils/smsSender.js';
import { paymentReceiptTemplate } from '../templates/email/paymentReceipt.js';
import { refundConfirmationTemplate } from '../templates/email/refundConfirmation.js';
import {
    appointmentCreatedPatientSms,
    appointmentConfirmedPatientSms,
    consultationCompletedPatientSms,
} from '../templates/sms/patientSmsTemplates.js';
import { logger } from '../utils/logger.js';

/**
 * Dispatch table for inbound async events (see routes/eventRoutes.js).
 * Each handler is `async (data) => void`; throwing triggers a QStash retry.
 */

const sendReceiptEmail = async (data) => {
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

    if (!patientEmail) {
        logger.warn(`[events] appointment.confirmed: no patientEmail for ${appointmentId} — skipping email`);
        return;
    }

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

const sendPatientSms = async (routingKey, data, templateFn) => {
    const { appointmentId, patientPhone } = data;

    if (!patientPhone) {
        logger.warn(`[events] ${routingKey}: no patientPhone for ${appointmentId} — skipping SMS`);
        return;
    }

    await sendSMS(patientPhone, templateFn(data));
};

const handleRefundEmail = async (data) => {
    const { paymentId, patientFullName, patientEmail, amount, refundedAt } = data;

    if (!patientEmail) {
        logger.warn(`[events] payment.refunded: no patientEmail for ${paymentId} — skipping email`);
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

export const EVENT_HANDLERS = {
    'appointment.confirmed': async (data) => {
        await sendReceiptEmail(data);
        await sendPatientSms('appointment.confirmed', data, appointmentConfirmedPatientSms);
    },
    'appointment.created': async (data) => {
        await sendPatientSms('appointment.created', data, appointmentCreatedPatientSms);
    },
    'consultation.completed': async (data) => {
        await sendPatientSms('consultation.completed', data, consultationCompletedPatientSms);
    },
    'payment.refunded': handleRefundEmail,
};
