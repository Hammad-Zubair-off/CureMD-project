import { EventEmitter } from 'events';
import Appointment from '../models/Appointment.js';
import { logger } from '../utils/logger.js';
import { publishEvent } from '../utils/eventBus.js';

// ─ Shared SSE EventEmitter ─
// One instance shared across all controller functions
// Used to push real-time status updates to connected SSE clients
export const appointmentEvents = new EventEmitter();
appointmentEvents.setMaxListeners(100); // Allow up to 100 concurrent SSE connections

// ─ Constants ─
const APPOINTMENT_EXPIRY_MINUTES = 30; // 30 min buffer — prevents TTL vs payment race

// ─ Helpers ─

// Normalize incoming date strings to UTC — prevents timezone issues (e.g. IST +5:30)
const toUTC = (dateStr) => new Date(new Date(dateStr).toISOString());

// ─ Controllers ─

/**
 * @desc    Book a new appointment
 * @route   POST /api/appointments
 * @access  Private — patient only
 *
 * Method 1: Doctor data (doctorFullName, specialty, consultationFee) comes
 * from the frontend — patient already saw this on the doctor listing page.
 * No inter-service call to doctor-service needed.
 */
export const bookAppointment = async (req, res, next) => {
    try {
        const {
            doctorId,
            doctorFullName,
            specialty,
            consultationFee,
            appointmentDate,
            timeSlot,
            reason,
            patientPhone,
        } = req.body;

        // Validate required fields
        if (!doctorId || !doctorFullName || !specialty || !consultationFee ||
            !appointmentDate || !timeSlot || !reason || !patientPhone) {
            return res.status(400).json({
                success: false,
                error: 'doctorId, doctorFullName, specialty, consultationFee, appointmentDate, timeSlot, reason and patientPhone are all required.',
            });
        }

        // Validate consultationFee is a positive number
        if (typeof consultationFee !== 'number' || consultationFee <= 0) {
            return res.status(400).json({
                success: false,
                error: 'consultationFee must be a positive number.',
            });
        }

        // Validate appointmentDate is in the future
        if (toUTC(appointmentDate) <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Appointment date must be in the future.',
            });
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

        // Create appointment
        // expiresAt: 30 minutes from now — patient must complete payment
        // MongoDB TTL index auto-deletes if payment not completed in time
        const expiresAt = new Date(Date.now() + APPOINTMENT_EXPIRY_MINUTES * 60 * 1000);

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
            consultationFee,

            // Appointment details
            appointmentDate: toUTC(appointmentDate),
            timeSlot,
            reason,

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

        logger.info(`Appointment created: ${appointment._id} by patient ${req.user.fullName}`);

        // Publish event (Method 2 — fire and forget)
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
 * No JWT middleware on this route — secured by internal secret header only.
 * payment-service calls this directly after Stripe confirms payment.
 * Idempotent — returns 200 if already confirmed (safe for payment retries).
 */
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
            appointmentId: appointment._id,
            patientFullName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            patientPhone: appointment.patientPhone,
            doctorFullName: appointment.doctorFullName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            consultationFee: appointment.consultationFee,
            paymentId: appointment.paymentId,
            reason: reason || null,
        });

        res.status(200).json({
            success: true,
            message: 'Appointment rejected successfully.',
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
 * @desc    Reschedule an appointment
 * @route   PATCH /api/appointments/:id/reschedule
 * @access  Private — patient only
 */
export const rescheduleAppointment = async (req, res, next) => {
    try {
        const { appointmentDate, timeSlot } = req.body;

        if (!appointmentDate || !timeSlot) {
            return res.status(400).json({
                success: false,
                error: 'New appointmentDate and timeSlot are required.',
            });
        }

        // Validate new date is in the future
        if (toUTC(appointmentDate) <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Appointment date must be in the future.',
            });
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

        // Clean up on client disconnect
        req.on('close', () => {
            appointmentEvents.off(appointmentId, onStatusChange);
            clearInterval(heartbeat);
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
        const appointments = await Appointment.find({ patientId: req.user.id })
            .sort({ appointmentDate: -1 });

        res.status(200).json({
            success: true,
            total: appointments.length,
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
        const appointments = await Appointment.find({ doctorId: req.user.id })
            .sort({ appointmentDate: -1 });

        res.status(200).json({
            success: true,
            total: appointments.length,
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

        const appointments = await Appointment.find(filter)
            .sort({ appointmentDate: -1 });

        res.status(200).json({
            success: true,
            total: appointments.length,
            appointments,
        });
    } catch (err) {
        next(err);
    }
};