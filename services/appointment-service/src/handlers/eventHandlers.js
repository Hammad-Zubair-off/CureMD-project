import Appointment from '../models/Appointment.js';
import { publishEvent } from '../utils/eventBus.js';
import { patientClient } from '../config/services.js';
import SERVICES from '../config/services.js';
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

    // Best-effort: purge the frozen medical-history snapshot + doctor
    // history-access grants so a doctor cannot retain access to a reversed visit.
    try {
        await patientClient.delete(
            SERVICES.patient.endpoints.purgeHistory(deletedSnapshot.appointmentId),
            { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET } }
        );
    } catch (err) {
        logger.warn(`[events] history purge failed for ${deletedSnapshot.appointmentId}: ${err.message}`);
    }
};

export const EVENT_HANDLERS = {
    'payment.refunded': handlePaymentRefunded,
};
