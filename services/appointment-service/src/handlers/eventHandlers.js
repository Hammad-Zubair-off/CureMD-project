import Appointment from '../models/Appointment.js';
import { publishEvent } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

/**
 * Dispatch table for inbound async events (see routes/eventRoutes.js).
 * Each handler is `async (data) => void`; throwing triggers a QStash retry.
 */

// payment.refunded -> the appointment tied to that payment is deleted, and a
// follow-up `appointment.deleted_after_refund` event is emitted.
const handlePaymentRefunded = async (data) => {
    if (!data?.appointmentId) return;

    const appointment = await Appointment.findById(data.appointmentId);
    if (!appointment) return;

    const deletedSnapshot = {
        appointmentId: appointment._id.toString(),
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        patientFullName: appointment.patientFullName,
        doctorFullName: appointment.doctorFullName,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        rejectionReason: appointment.rejectionReason || null,
        refundedAt: data.refundedAt || new Date().toISOString(),
    };

    await Appointment.findByIdAndDelete(appointment._id);
    await publishEvent('appointment.deleted_after_refund', deletedSnapshot);
    logger.info(`[events] deleted appointment after refund: ${deletedSnapshot.appointmentId}`);
};

export const EVENT_HANDLERS = {
    'payment.refunded': handlePaymentRefunded,
};
