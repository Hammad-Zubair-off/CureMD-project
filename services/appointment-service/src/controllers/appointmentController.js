import { EventEmitter } from 'events';
import Appointment from '../models/Appointment.js';
import { logger } from '../utils/logger.js';
import { publishEvent, subscribeToEvent } from '../utils/eventBus.js';
import {
    validateBookAppointment,
    validateRescheduleAppointment,
    validateStatusQuery,
} from '../validators/appointmentValidator.js';
import { patientClient } from '../config/services.js';
import SERVICES from '../config/services.js';
import { callService } from '../utils/callService.js';

// ─ Shared SSE EventEmitter ─
// One instance shared across all controller functions
// Used to push real-time status updates to connected SSE clients
export const appointmentEvents = new EventEmitter();
appointmentEvents.setMaxListeners(100); // Allow up to 100 concurrent SSE connections

// ─ Constants ─
const APPOINTMENT_EXPIRY_MINUTES = 30; // 30 min buffer — prevents TTL vs payment race
const SKIP_PAYMENT = process.env.SKIP_PAYMENT === 'true';

// ─ Helpers ─

// Normalize incoming date strings to UTC — prevents timezone issues (e.g. IST +5:30)
const toUTC = (dateStr) => new Date(new Date(dateStr).toISOString());

const finalizeAppointmentConfirmation = async (appointment, { paymentId = null, changedBy = 'payment-service' } = {}) => {
    if (appointment.status === 'confirmed') {
        return appointment;
    }

    appointment.status = 'confirmed';
    appointment.paymentStatus = 'paid';
    appointment.paymentId = paymentId;
    appointment.expiresAt = null;
    appointment.statusHistory.push({
        status: 'confirmed',
        changedBy,
        changedAt: new Date(),
    });

    await appointment.save();

    appointmentEvents.emit(appointment._id.toString(), {
        status: 'confirmed',
        changedAt: new Date(),
        changedBy,
    });

    logger.success(`Appointment confirmed: ${appointment._id}`);

    if (appointment.patientMedicalHistoryId) {
        patientClient.patch(
            SERVICES.patient.endpoints.confirmSnapshot(
                appointment.patientMedicalHistoryId.toString()
            ),
            {},
            {
                headers: {
                    'x-internal-secret': process.env.INTERNAL_SECRET,
                },
            }
        ).then(() => {
            logger.info(`Snapshot confirmed: ${appointment.patientMedicalHistoryId}`);
        }).catch((err) => {
            logger.warn(`[appointment-service] Could not confirm snapshot ${appointment.patientMedicalHistoryId}: ${err.message}`);
        });
    }

    publishEvent('appointment.confirmed', {
        appointmentId: appointment._id,
        patientFullName: appointment.patientFullName,
        patientEmail: appointment.patientEmail,
        patientPhone: appointment.patientPhone,
        doctorId: appointment.doctorId,
        doctorFullName: appointment.doctorFullName,
        specialty: appointment.specialty,
        consultationFee: appointment.consultationFee,
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        paymentId: appointment.paymentId,
    });

    return appointment;
};

// ─ Controllers ─

/**
 * @desc    Book a new appointment
 * @route   POST /api/appointments
 * @access  Private — patient only
 *
 * COMMUNICATION:
 * Method 1 — doctor data + sharingMode from frontend
 * Method 3 — calls patient-service to create snapshot after appointment saved, passes snapshotExpiresAt so snapshot has same TTL as appointment
 * Method 2 — publishEvent after everything saved (fire and forget)
 */
export const bookAppointment = async (req, res, next) => {
    try {
        const {
            doctorId,
            doctorFullName,
            specialty,
            appointmentDate,
            timeSlot,
            reason,
            patientPhone,
            sharingMode,
        } = req.body;

        // Validate request body
        const { valid, errors, fee } = validateBookAppointment(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, errors });
        }

        // Check slot availability (own DB — no inter-service call)
        const slotTaken = await Appointment.findOne({
            doctorId,
            appointmentDate: toUTC(appointmentDate),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (slotTaken) {
            return res.status(409).json({
                success: false,
                error: 'This time slot is no longer available. Please select a different slot.',
            });
        }

        // Check the patient isn't already booked elsewhere at this exact slot
        // (doctor-side check above only prevents double-booking the SAME doctor)
        const patientConflict = await Appointment.findOne({
            patientId: req.user.id,
            appointmentDate: toUTC(appointmentDate),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (patientConflict) {
            return res.status(409).json({
                success: false,
                error: `You already have an appointment with ${patientConflict.doctorFullName} at this time. Please choose a different slot.`,
            });
        }

        // Create appointment
        // expiresAt: 30 minutes from now — patient must complete payment
        // MongoDB TTL index auto-deletes if payment not completed in time
        const expiresAt = new Date(Date.now() + APPOINTMENT_EXPIRY_MINUTES * 60 * 1000);

        // Step 1 — Save appointment (no snapshotId yet)
        const appointment = await Appointment.create({
            // Patient info — from JWT (verified, trusted)
            patientId: req.user.id,
            patientFirstName: req.user.firstName,
            patientLastName: req.user.lastName,
            patientFullName: req.user.fullName,
            patientEmail: req.user.email,
            patientPhone,

            // Doctor info — Method 1 (from frontend, already validated by patient seeing it)
            // Saved at booking time so old appointments keep the fee that was agreed
            doctorId,
            doctorFullName,
            specialty,
            consultationFee: fee,

            // Appointment details
            appointmentDate: toUTC(appointmentDate),
            timeSlot,
            reason,
            patientMedicalHistoryId: null,
            sharingMode,

            // Initial status
            status: 'pending',
            paymentStatus: 'unpaid',
            statusHistory: [{
                status: 'pending',
                changedBy: 'patient',
                changedAt: new Date(),
            }],

            // TTL — auto-expire if payment not completed in 30 minutes
            expiresAt,
        });

        logger.info(`Appointment created: ${appointment._id} | patient: ${req.user.fullName} | sharingMode: ${sharingMode}`);

        // Step 2 — Create snapshot if patient chose to share medical data
        if (sharingMode !== 'none') {

            // METHOD 3 — call patient-service to create the snapshot
            // Pass snapshotExpiresAt matching appointment.expiresAt so both
            // get cleaned up together if payment is never completed
            const snapshotData = await callService(
                () => patientClient.post(
                    SERVICES.patient.endpoints.createSnapshot(),
                    {
                        sharingMode,
                        appointmentId: appointment._id.toString(),
                        snapshotExpiresAt: expiresAt.toISOString(),
                    },
                    { headers: { Authorization: req.headers.authorization } }
                ),
                'patient-service',
                res
            );

            if (!snapshotData) {
                // patient-service failed — appointment was already created
                // appointment still succeeds, doctor will see no medical data
                logger.warn(`[appointment-service] Snapshot creation failed for appointment: ${appointment._id}`);
            } else {
                // Step 3 — Link snapshot to appointment
                await Appointment.findByIdAndUpdate(appointment._id, {
                    patientMedicalHistoryId: snapshotData.snapshotId,
                });
                appointment.patientMedicalHistoryId = snapshotData.snapshotId;
                logger.info(`Snapshot linked: ${snapshotData.snapshotId} → appointment: ${appointment._id}`);
            }
        }

        // Step 4 — Publish event (Method 2 — fire and forget)
        // notification-service sends booking confirmation to patient
        publishEvent('appointment.created', {
            appointmentId: appointment._id,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorId: appointment.doctorId,
            doctorFullName: appointment.doctorFullName,
            specialty: appointment.specialty,
            consultationFee: appointment.consultationFee,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            reason: appointment.reason,
        });

        if (SKIP_PAYMENT) {
            await finalizeAppointmentConfirmation(appointment, {
                paymentId: 'dev-skip',
                changedBy: 'system',
            });
            const confirmed = await Appointment.findById(appointment._id);
            return res.status(201).json({
                success: true,
                message: 'Appointment booked and confirmed (payment skipped for local dev).',
                appointment: confirmed,
                skipPayment: true,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Appointment created. Please complete payment within 30 minutes.',
            appointment,
            expiresAt,
        });
    } catch (err) {
        // E11000 — duplicate key — slot was taken by a concurrent booking
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'This time slot was just taken. Please select a different slot.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Confirm appointment after successful payment
 * @route   PATCH /api/appointments/:id/confirm
 * @access  Internal — payment-service only (Method 3)
 *
 * After confirming the appointment, calls patient-service to confirm
 * the linked snapshot — clearing its snapshotExpiresAt so it is never
 * auto-deleted by the TTL index.
 *
 * If snapshot confirmation fails, the appointment is still confirmed
 * and a warning is logged. The snapshot will expire in 30 minutes if
 * not confirmed — this is an acceptable edge case since the medical
 * record already exists in the appointment.
 * */
export const confirmAppointment = async (req, res, next) => {
    try {
        // Verify internal secret — must come from payment-service
        // Read fresh from env — ensures dotenv has loaded before this is evaluated
        const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
        const internalSecret = req.headers['x-internal-secret'];
        if (!INTERNAL_SECRET || internalSecret !== INTERNAL_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized.',
            });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        if (appointment.status === 'expired') {
            return res.status(400).json({
                success: false,
                error: 'Appointment has expired. Patient must book again.',
            });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Appointment has been cancelled.',
            });
        }

        // Idempotency — safe for payment-service retries
        // If already confirmed return 200 instead of error
        if (appointment.status === 'confirmed') {
            return res.status(200).json({
                success: true,
                message: 'Appointment is already confirmed.',
                appointment,
            });
        }

        // Update appointment
        appointment.status = 'confirmed';
        appointment.paymentStatus = 'paid';
        appointment.paymentId = req.body.paymentId || null;
        appointment.expiresAt = null; // clear TTL — confirmed appointments never expire
        appointment.statusHistory.push({
            status: 'confirmed',
            changedBy: 'payment-service',
            changedAt: new Date(),
        });

        await appointment.save();

        // Emit SSE event — frontend shows success screen
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'confirmed',
            changedAt: new Date(),
            changedBy: 'payment-service',
        });

        logger.success(`Appointment confirmed: ${appointment._id}`);

        // Confirm the linked snapshot — clears snapshotExpiresAt so it
        // is never auto-deleted. Fire and log, never block the response.
        if (appointment.patientMedicalHistoryId) {
            patientClient.patch(
                SERVICES.patient.endpoints.confirmSnapshot(
                    appointment.patientMedicalHistoryId.toString()
                ),
                {},
                {
                    headers: {
                        'x-internal-secret': process.env.INTERNAL_SECRET,
                    },
                }
            ).then(() => {
                logger.info(`Snapshot confirmed: ${appointment.patientMedicalHistoryId}`);
            }).catch((err) => {
                // Non-blocking — appointment is already confirmed
                // Snapshot will expire in ~30 min if not cleared, which is
                // an acceptable edge case. Payment confirmation still succeeds.
                logger.warn(`[appointment-service] Could not confirm snapshot ${appointment.patientMedicalHistoryId}: ${err.message}`);
            });
        }

        // Publish event (Method 2 — fire and forget)
        // notification-service sends confirmation to patient and doctor
        publishEvent('appointment.confirmed', {
            appointmentId: appointment._id,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorId: appointment.doctorId,
            doctorFullName: appointment.doctorFullName,
            specialty: appointment.specialty,
            consultationFee: appointment.consultationFee,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            paymentId: appointment.paymentId,
        });

        res.status(200).json({
            success: true,
            message: 'Appointment confirmed successfully.',
            appointment,
        });
    } catch (err) {
        // VersionError — concurrent update conflict
        if (err.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                error: 'Appointment was updated by another request. Please try again.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Confirm a pending appointment without payment (local dev only)
 * @route   PATCH /api/appointments/:id/skip-payment
 * @access  Private — patient only, when SKIP_PAYMENT=true
 */
export const skipPaymentForAppointment = async (req, res, next) => {
    try {
        if (!SKIP_PAYMENT) {
            return res.status(403).json({
                success: false,
                error: 'Payment skip is not enabled.',
            });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        if (appointment.patientId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to confirm this appointment.',
            });
        }

        if (appointment.status === 'expired') {
            return res.status(400).json({
                success: false,
                error: 'Appointment has expired. Please book again.',
            });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                error: 'Appointment has been cancelled.',
            });
        }

        if (appointment.status === 'confirmed') {
            return res.status(200).json({
                success: true,
                message: 'Appointment is already confirmed.',
                appointment,
            });
        }

        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Cannot confirm appointment with status: ${appointment.status}.`,
            });
        }

        await finalizeAppointmentConfirmation(appointment, {
            paymentId: 'dev-skip',
            changedBy: 'patient',
        });

        res.status(200).json({
            success: true,
            message: 'Appointment confirmed without payment (local dev).',
            appointment: await Appointment.findById(appointment._id),
        });
    } catch (err) {
        if (err.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                error: 'Appointment was updated by another request. Please try again.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Doctor rejects a confirmed appointment
 * @route   PATCH /api/appointments/:id/reject
 * @access  Private — doctor only
 *
 * Doctor can reject a confirmed appointment with an optional reason.
 * Status becomes 'cancelled', changedBy is 'doctor'.
 * payment-service listens for appointment.rejected_by_doctor to trigger refund.
 */
export const rejectAppointment = async (req, res, next) => {
    try {
        const { reason } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // Verify this doctor owns the appointment
        if (appointment.doctorId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to reject this appointment.',
            });
        }

        // Only confirmed appointments can be rejected
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                error: `Only confirmed appointments can be rejected. Current status: ${appointment.status}.`,
            });
        }

        // Update appointment
        appointment.status = 'cancelled';
        appointment.expiresAt = null;
        appointment.rejectionReason = reason || null;
        appointment.statusHistory.push({
            status: 'cancelled',
            changedBy: 'doctor',
            changedAt: new Date(),
        });

        await appointment.save();

        // Emit SSE event
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: 'doctor',
        });

        logger.warn(`Appointment rejected by doctor: ${appointment._id} — Dr. ${req.user.fullName}`);

        // Publish event (Method 2 — fire and forget)
        // notification-service notifies patient
        // payment-service triggers refund
        publishEvent('appointment.rejected_by_doctor', {
            appointmentId: appointment._id.toString(),
            patientId: appointment.patientId,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorId: appointment.doctorId,
            doctorFullName: appointment.doctorFullName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            consultationFee: appointment.consultationFee,
            paymentId: appointment.paymentId,
            reason: reason || null,
            rejectedAt: new Date().toISOString(),
        });

        res.status(200).json({
            success: true,
            message: 'Appointment rejected successfully.',
            appointment,
        });
    } catch (err) {
        console.error('Reject Appointment Error:', err); // 🔍 always log

        // Handle Mongoose version conflict
        if (err.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                error: 'Appointment was updated by another request. Please try again.',
            });
        }

        // Handle invalid ObjectId
        if (err.name === 'CastError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid appointment ID.',
            });
        }

        // Fallback — controlled error response
        return res.status(500).json({
            success: false,
            error: 'Something went wrong while rejecting the appointment.',
        });
    }
};

/**
 * @desc    Reschedule an appointment
 * @route   PATCH /api/appointments/:id/reschedule
 * @access  Private — patient only
 */
export const rescheduleAppointment = async (req, res, next) => {
    try {
        const { appointmentDate, timeSlot } = req.body;

        // Validate request body
        const { valid: rescheduleValid, errors: rescheduleErrors } = validateRescheduleAppointment(req.body);
        if (!rescheduleValid) {
            return res.status(400).json({ success: false, errors: rescheduleErrors });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // Verify ownership
        if (appointment.patientId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to reschedule this appointment.',
            });
        }

        // Only pending or confirmed appointments can be rescheduled
        if (!['pending', 'confirmed'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot reschedule an appointment with status: ${appointment.status}.`,
            });
        }

        // Check new slot availability (own DB — no inter-service call)
        const slotTaken = await Appointment.findOne({
            _id: { $ne: appointment._id }, // exclude current appointment
            doctorId: appointment.doctorId,
            appointmentDate: toUTC(appointmentDate),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (slotTaken) {
            return res.status(409).json({
                success: false,
                error: 'This time slot is not available. Please select a different slot.',
            });
        }

        // Check the patient isn't already booked elsewhere at the new slot
        const patientConflict = await Appointment.findOne({
            _id: { $ne: appointment._id },
            patientId: req.user.id,
            appointmentDate: toUTC(appointmentDate),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (patientConflict) {
            return res.status(409).json({
                success: false,
                error: `You already have an appointment with ${patientConflict.doctorFullName} at this time. Please choose a different slot.`,
            });
        }

        // Update appointment
        const previousDate = appointment.appointmentDate;
        const previousSlot = appointment.timeSlot;

        appointment.appointmentDate = toUTC(appointmentDate);
        appointment.timeSlot = timeSlot;

        // Reset expiresAt if still pending — patient gets a fresh 30 min window
        if (appointment.status === 'pending') {
            appointment.expiresAt = new Date(Date.now() + APPOINTMENT_EXPIRY_MINUTES * 60 * 1000);
        }

        appointment.statusHistory.push({
            status: appointment.status, // preserve current status
            changedBy: 'patient',
            changedAt: new Date(),
        });

        await appointment.save();

        // Emit SSE event
        appointmentEvents.emit(appointment._id.toString(), {
            status: appointment.status,
            changedAt: new Date(),
            changedBy: 'patient',
        });

        logger.info(`Appointment rescheduled: ${appointment._id} by patient ${req.user.fullName}`);

        // Publish event (Method 2 — fire and forget)
        // notification-service notifies both patient and doctor
        publishEvent('appointment.rescheduled', {
            appointmentId: appointment._id,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorId: appointment.doctorId,
            doctorFullName: appointment.doctorFullName,
            previousDate,
            previousSlot,
            newDate: appointment.appointmentDate,
            newTimeSlot: appointment.timeSlot,
        });

        res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully.',
            appointment,
        });
    } catch (err) {
        // VersionError — concurrent update conflict
        if (err.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                error: 'Appointment was updated by another request. Please try again.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Cancel an appointment
 * @route   PATCH /api/appointments/:id/cancel
 * @access  Private — patient only
 */
export const cancelAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // Verify ownership
        if (appointment.patientId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to cancel this appointment.',
            });
        }

        // Only pending or confirmed appointments can be cancelled
        if (!['pending', 'confirmed'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel an appointment with status: ${appointment.status}.`,
            });
        }

        // Update appointment
        const wasPaid = appointment.paymentStatus === 'paid';

        appointment.status = 'cancelled';
        appointment.expiresAt = null; // clear TTL if still pending
        appointment.statusHistory.push({
            status: 'cancelled',
            changedBy: 'patient',
            changedAt: new Date(),
        });

        await appointment.save();

        // Emit SSE event
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: 'patient',
        });

        logger.info(`Appointment cancelled: ${appointment._id} by patient ${req.user.fullName}`);

        // Publish event (Method 2 — fire and forget)
        // notification-service notifies both parties
        // payment-service handles refund if appointment was paid
        publishEvent('appointment.cancelled', {
            appointmentId: appointment._id,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorId: appointment.doctorId,
            doctorFullName: appointment.doctorFullName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            cancelledBy: 'patient',
            refundRequired: wasPaid,
            paymentId: appointment.paymentId,
        });

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully.',
            appointment,
        });
    } catch (err) {
        // VersionError — concurrent update conflict
        if (err.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                error: 'Appointment was updated by another request. Please try again.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Mark appointment as completed after consultation
 * @route   PATCH /api/appointments/:id/status
 * @access  Private — doctor only
 */
export const updateAppointmentStatus = async (req, res, next) => {
    try {
        const { notes } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // Verify this doctor owns the appointment
        if (appointment.doctorId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to update this appointment.',
            });
        }

        // Only confirmed → completed transition is allowed
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                error: `Only confirmed appointments can be marked as completed. Current status: ${appointment.status}.`,
            });
        }

        // Update appointment
        appointment.status = 'completed';
        appointment.notes = notes || null;
        appointment.statusHistory.push({
            status: 'completed',
            changedBy: 'doctor',
            changedAt: new Date(),
        });

        await appointment.save();

        // Emit SSE event
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'completed',
            changedAt: new Date(),
            changedBy: 'doctor',
        });

        logger.success(`Appointment completed: ${appointment._id} by Dr. ${req.user.fullName}`);

        // Publish event (Method 2 — fire and forget)
        // notification-service notifies both patient and doctor
        publishEvent('consultation.completed', {
            appointmentId: appointment._id,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorFullName: appointment.doctorFullName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            notes: appointment.notes,
        });

        res.status(200).json({
            success: true,
            message: 'Appointment marked as completed.',
            appointment,
        });
    } catch (err) {
        // VersionError — concurrent update conflict
        if (err.name === 'VersionError') {
            return res.status(409).json({
                success: false,
                error: 'Appointment was updated by another request. Please try again.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Track appointment status in real time via SSE
 * @route   GET /api/appointments/:id/track
 * @access  Private — patient or doctor on this appointment
 */
export const trackAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // Verify requester is patient, doctor, or admin
        const isPatient = appointment.patientId === req.user.id.toString();
        const isDoctor = appointment.doctorId === req.user.id.toString();
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

        if (!isPatient && !isDoctor && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to track this appointment.',
            });
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Push current state immediately on connect
        res.write(`data: ${JSON.stringify({
            status: appointment.status,
            statusHistory: appointment.statusHistory,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            expiresAt: appointment.expiresAt,
        })}\n\n`);

        // Register listener for this appointment's events
        const appointmentId = appointment._id.toString();

        const onStatusChange = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        appointmentEvents.on(appointmentId, onStatusChange);

        // Heartbeat — keeps connection alive through nginx
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 30000);

        // Cleanup helper — used by both timeout and client disconnect
        const cleanup = () => {
            appointmentEvents.off(appointmentId, onStatusChange);
            clearInterval(heartbeat);
            clearTimeout(maxDuration);
        };

        // Max connection duration — closes SSE after 5 minutes to prevent resource leak
        // Frontend should reconnect if tracking is still needed
        const maxDuration = setTimeout(() => {
            logger.info(`SSE max duration reached: appointment ${appointmentId}`);
            cleanup();
            res.end();
        }, 5 * 60 * 1000);

        // Clean up on client disconnect
        req.on('close', () => {
            cleanup();
            logger.info(`SSE client disconnected: appointment ${appointmentId}`);
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all appointments for the logged-in patient
 * @route   GET /api/appointments/my
 * @access  Private — patient only
 */
export const getMyAppointments = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const tab = req.query.tab || 'upcoming';
        const filter = { patientId: req.user.id };

        if (tab === 'upcoming') {
            filter.status = 'confirmed';
        }
        if (tab === 'unpaid') {
            filter.status = 'pending';
            filter.paymentStatus = 'unpaid';
        }
        if (tab === 'past') {
            // 'past'      = auto-transitioned by scheduler when appointment time elapses
            // 'completed' = manually marked done by the doctor after consultation
            filter.status = { $in: ['completed', 'past'] };
        }
        if (tab === 'cancelled') {
            filter.status = { $in: ['cancelled', 'expired'] };
        }
        if (tab === 'rejected') {
            filter.status = 'cancelled';
            filter.rejectionReason = { $nin: [null, ''] };
            filter.statusHistory = {
                $elemMatch: {
                    status: 'cancelled',
                    changedBy: 'doctor',
                },
            };
        }

        // upcoming: ascending (nearest first); everything else: descending (most recent first)
        const sortOrder = tab === 'upcoming' ? 1 : -1;

        const [appointments, total] = await Promise.all([
            Appointment.find(filter).sort({ appointmentDate: sortOrder }).skip(skip).limit(limit),
            Appointment.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            appointments,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all appointments for the logged-in doctor
 * @route   GET /api/appointments/doctor
 * @access  Private — doctor only
 */
export const getDoctorAppointments = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter = { doctorId: req.user.id };

        const [appointments, total] = await Promise.all([
            Appointment.find(filter).sort({ appointmentDate: -1 }).skip(skip).limit(limit),
            Appointment.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            appointments,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single appointment by ID
 * @route   GET /api/appointments/:id
 * @access  Private — patient, doctor, or admin
 */
export const getAppointmentById = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // Verify requester is authorized
        const isPatient = appointment.patientId === req.user.id.toString();
        const isDoctor = appointment.doctorId === req.user.id.toString();
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

        if (!isPatient && !isDoctor && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to view this appointment.',
            });
        }

        res.status(200).json({
            success: true,
            appointment,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all appointments with optional filters (admin view)
 * @route   GET /api/appointments/all
 * @access  Private — admin only
 */
export const getAllAppointments = async (req, res, next) => {
    try {
        const { status, doctorId, patientId, date } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        // Validate status query param if provided
        const { valid: statusValid, error: statusError } = validateStatusQuery(status);
        if (!statusValid) {
            return res.status(400).json({ success: false, error: statusError });
        }

        const filter = {};
        if (status) filter.status = status;
        if (doctorId) filter.doctorId = doctorId;
        if (patientId) filter.patientId = patientId;
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setDate(end.getDate() + 1);
            filter.appointmentDate = { $gte: start, $lt: end };
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(filter).sort({ appointmentDate: -1 }).skip(skip).limit(limit),
            Appointment.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            appointments,
        });
    } catch (err) {
        next(err);
    }
};

export const getDoctorRejectionRequests = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter = {
            status: 'cancelled',
            statusHistory: {
                $elemMatch: {
                    status: 'cancelled',
                    changedBy: 'doctor',
                },
            },
        };

        if (req.query.refundStatus) {
            filter.paymentStatus = req.query.refundStatus;
        }

        if (req.query.doctorId) {
            filter.doctorId = req.query.doctorId;
        }

        if (req.query.search) {
            const rx = new RegExp(req.query.search, 'i');
            filter.$or = [
                { doctorFullName: rx },
                { patientFullName: rx },
                { patientEmail: rx },
            ];
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
            Appointment.countDocuments(filter),
        ]);

        const rows = appointments.map((a) => {
            const rejectedEntry = (a.statusHistory || [])
                .slice()
                .reverse()
                .find((h) => h.status === 'cancelled' && h.changedBy === 'doctor');

            return {
                appointmentId: a._id,
                doctorId: a.doctorId,
                doctorFullName: a.doctorFullName,
                patientId: a.patientId,
                patientFullName: a.patientFullName,
                patientEmail: a.patientEmail,
                appointmentDate: a.appointmentDate,
                timeSlot: a.timeSlot,
                consultationFee: a.consultationFee,
                rejectionReason: a.rejectionReason,
                rejectedAt: rejectedEntry ? rejectedEntry.changedAt : a.updatedAt,
                refundStatus: a.paymentStatus,
                paymentId: a.paymentId,
            };
        });

        res.status(200).json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            requests: rows,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get taken slots for a doctor on a specific date
 * @route   GET /api/appointments/availability?doctorId=...&date=...
 * @access  Private — patient only
 */
export const getTakenSlotsForDoctorDate = async (req, res, next) => {
    try {
        const { doctorId, date } = req.query;

        if (!doctorId || !date) {
            return res.status(400).json({
                success: false,
                error: 'doctorId and date query params are required.',
            });
        }

        const targetDate = toUTC(date);
        if (Number.isNaN(targetDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date value.',
            });
        }

        const appointments = await Appointment.find({
            doctorId,
            appointmentDate: targetDate,
            status: { $in: ['pending', 'confirmed'] },
        })
            .select('timeSlot -_id')
            .lean();

        const takenSlots = [...new Set(appointments.map((a) => a.timeSlot).filter(Boolean))];

        return res.status(200).json({
            success: true,
            doctorId,
            date: targetDate.toISOString(),
            takenSlots,
        });
    } catch (err) {
        next(err);
    }
};

export const initAppointmentEventConsumers = async () => {
    await subscribeToEvent('payment.refunded', async (event) => {
        if (!event.appointmentId) return;

        const appointment = await Appointment.findById(event.appointmentId);
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
            refundedAt: event.refundedAt || new Date().toISOString(),
        };

        await Appointment.findByIdAndDelete(appointment._id);

        publishEvent('appointment.deleted_after_refund', deletedSnapshot);
        logger.info('[AppointmentConsumer] Deleted appointment after refund: ' + deletedSnapshot.appointmentId);
    });
};