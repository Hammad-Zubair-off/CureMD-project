import { EventEmitter } from 'events';
import axios from 'axios';
import Appointment from '../models/Appointment.js';
import { logger } from '../utils/logger.js';

// ─── Shared SSE EventEmitter ──────────────────────────────────────────────────
// One instance shared across all controller functions
// Used to push real-time status updates to connected SSE clients
export const appointmentEvents = new EventEmitter();
appointmentEvents.setMaxListeners(100); // Allow up to 100 concurrent SSE connections

// ─── Constants ────────────────────────────────────────────────────────────────
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006';
const APPOINTMENT_EXPIRY_MINUTES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches doctor details from doctor-service
 * BLOCKING — appointment cannot proceed without this
 */
const fetchDoctor = async (doctorId) => {
    const response = await axios.get(
        `${DOCTOR_SERVICE_URL}/api/doctors/${doctorId}`,
        { timeout: 5000 }
    );
    return response.data;
};

/**
 * Sends notification to notification-service
 * NON-BLOCKING — appointment is never affected if this fails
 */
const sendNotification = async (payload) => {
    try {
        await axios.post(
            `${NOTIFICATION_SERVICE_URL}/api/notify/appointment`,
            payload,
            { timeout: 5000 }
        );
    } catch (error) {
        logger.warn('Notification service unavailable:', error.message);
    }
};

/**
 * Handles doctor-service call errors consistently
 */
const handleDoctorServiceError = (error, res) => {
    if (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT'
    ) {
        return res.status(503).json({
            success: false,
            error: 'Doctor service unavailable. Please try again later.',
        });
    }
    if (error.response?.status === 404) {
        return res.status(404).json({
            success: false,
            error: 'Doctor not found.',
        });
    }
    return res.status(500).json({
        success: false,
        error: 'Failed to verify doctor details.',
    });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Book a new appointment
 * @route   POST /api/appointments
 * @access  Private — patient only
 */
export const bookAppointment = async (req, res, next) => {
    try {
        const { doctorId, appointmentDate, timeSlot, reason, patientPhone } = req.body;

        if (!doctorId || !appointmentDate || !timeSlot || !reason || !patientPhone) {
            return res.status(400).json({
                success: false,
                error: 'doctorId, appointmentDate, timeSlot, reason and patientPhone are required.',
            });
        }

        // ── Fetch doctor details from doctor-service (BLOCKING) ────────────
        let doctor;
        try {
            const data = await fetchDoctor(doctorId);
            doctor = data.doctor || data; // handle different response shapes
        } catch (error) {
            return handleDoctorServiceError(error, res);
        }

        // ── Check slot availability ────────────────────────────────────────
        const slotTaken = await Appointment.findOne({
            doctorId,
            appointmentDate: new Date(appointmentDate),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (slotTaken) {
            return res.status(400).json({
                success: false,
                error: 'This time slot is no longer available. Please select a different slot.',
            });
        }

        // ── Create appointment ─────────────────────────────────────────────
        const expiresAt = new Date(Date.now() + APPOINTMENT_EXPIRY_MINUTES * 60 * 1000);

        const appointment = await Appointment.create({
            // Patient info from JWT
            patientId: req.user.id,
            patientFirstName: req.user.firstName,
            patientLastName: req.user.lastName,
            patientFullName: req.user.fullName,
            patientEmail: req.user.email,
            patientPhone,

            // Doctor info from doctor-service
            doctorId,
            doctorFullName: doctor.fullName || doctor.name,
            specialty: doctor.specialty,
            consultationFee: doctor.consultationFee,

            // Appointment details
            appointmentDate: new Date(appointmentDate),
            timeSlot,
            reason,

            // Initial status
            status: 'pending',
            paymentStatus: 'unpaid',
            statusHistory: [
                {
                    status: 'pending',
                    changedBy: 'patient',
                    changedAt: new Date(),
                },
            ],

            // TTL — expires in 15 minutes if payment not completed
            expiresAt,
        });

        logger.info(`Appointment created: ${appointment._id} by patient ${req.user.fullName}`);

        res.status(201).json({
            success: true,
            message: 'Appointment created. Please complete payment within 15 minutes.',
            appointment,
            expiresAt,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Confirm appointment after successful payment
 * @route   PATCH /api/appointments/:id/confirm
 * @access  Private — called by payment-service
 */
export const confirmAppointment = async (req, res, next) => {
    try {
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
                error: 'Appointment has expired. Please book again.',
            });
        }

        if (appointment.status === 'confirmed') {
            return res.status(400).json({
                success: false,
                error: 'Appointment is already confirmed.',
            });
        }

        // ── Update appointment ─────────────────────────────────────────────
        appointment.status = 'confirmed';
        appointment.paymentStatus = 'paid';
        appointment.paymentId = req.body.paymentId || null;
        appointment.expiresAt = null; // Clear TTL — confirmed appointments never expire
        appointment.statusHistory.push({
            status: 'confirmed',
            changedBy: 'payment-service',
            changedAt: new Date(),
        });

        await appointment.save();

        // ── Emit SSE event ─────────────────────────────────────────────────
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'confirmed',
            changedAt: new Date(),
            changedBy: 'payment-service',
        });

        logger.success(`Appointment confirmed: ${appointment._id}`);

        // ── Notify patient and doctor (NON-BLOCKING) ───────────────────────
        await sendNotification({
            type: 'appointment_confirmed',
            appointmentId: appointment._id,
            patientName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            doctorName: appointment.doctorFullName,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            specialty: appointment.specialty,
            consultationFee: appointment.consultationFee,
        });

        res.status(200).json({
            success: true,
            message: 'Appointment confirmed successfully.',
            appointment,
        });
    } catch (err) {
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

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found.',
            });
        }

        // ── Verify ownership ───────────────────────────────────────────────
        if (appointment.patientId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to reschedule this appointment.',
            });
        }

        // ── Verify status allows rescheduling ──────────────────────────────
        if (!['pending', 'confirmed'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot reschedule an appointment with status: ${appointment.status}.`,
            });
        }

        // ── Validate doctor is still available (BLOCKING) ─────────────────
        try {
            await fetchDoctor(appointment.doctorId);
        } catch (error) {
            return handleDoctorServiceError(error, res);
        }

        // ── Check new slot availability ────────────────────────────────────
        const slotTaken = await Appointment.findOne({
            _id: { $ne: appointment._id }, // exclude current appointment
            doctorId: appointment.doctorId,
            appointmentDate: new Date(appointmentDate),
            timeSlot,
            status: { $in: ['pending', 'confirmed'] },
        });

        if (slotTaken) {
            return res.status(400).json({
                success: false,
                error: 'This time slot is not available. Please select a different slot.',
            });
        }

        // ── Update appointment ─────────────────────────────────────────────
        appointment.appointmentDate = new Date(appointmentDate);
        appointment.timeSlot = timeSlot;
        appointment.statusHistory.push({
            status: appointment.status, // preserve current status
            changedBy: 'patient',
            changedAt: new Date(),
        });

        await appointment.save();

        // ── Emit SSE event ─────────────────────────────────────────────────
        appointmentEvents.emit(appointment._id.toString(), {
            status: appointment.status,
            changedAt: new Date(),
            changedBy: 'patient',
        });

        logger.info(`Appointment rescheduled: ${appointment._id} by patient ${req.user.fullName}`);

        res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully.',
            appointment,
        });
    } catch (err) {
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

        // ── Verify ownership ───────────────────────────────────────────────
        if (appointment.patientId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to cancel this appointment.',
            });
        }

        // ── Verify status allows cancellation ──────────────────────────────
        if (!['pending', 'confirmed'].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel an appointment with status: ${appointment.status}.`,
            });
        }

        // ── Update appointment ─────────────────────────────────────────────
        appointment.status = 'cancelled';
        appointment.expiresAt = null; // clear TTL if still pending
        appointment.statusHistory.push({
            status: 'cancelled',
            changedBy: 'patient',
            changedAt: new Date(),
        });

        await appointment.save();

        // ── Emit SSE event ─────────────────────────────────────────────────
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'cancelled',
            changedAt: new Date(),
            changedBy: 'patient',
        });

        logger.info(`Appointment cancelled: ${appointment._id} by patient ${req.user.fullName}`);

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully.',
            appointment,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Mark appointment as completed (after consultation)
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

        // ── Verify ownership ───────────────────────────────────────────────
        if (appointment.doctorId !== req.user.id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to update this appointment.',
            });
        }

        // ── Only allowed transition: confirmed → completed ─────────────────
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                error: `Only confirmed appointments can be marked as completed. Current status: ${appointment.status}.`,
            });
        }

        // ── Update appointment ─────────────────────────────────────────────
        appointment.status = 'completed';
        appointment.notes = notes || null;
        appointment.statusHistory.push({
            status: 'completed',
            changedBy: 'doctor',
            changedAt: new Date(),
        });

        await appointment.save();

        // ── Emit SSE event ─────────────────────────────────────────────────
        appointmentEvents.emit(appointment._id.toString(), {
            status: 'completed',
            changedAt: new Date(),
            changedBy: 'doctor',
        });

        logger.success(`Appointment completed: ${appointment._id} by doctor ${req.user.fullName}`);

        // ── Notify patient and doctor (NON-BLOCKING) ───────────────────────
        await sendNotification({
            type: 'consultation_completed',
            appointmentId: appointment._id,
            patientName: appointment.patientFullName,
            patientEmail: appointment.patientEmail,
            doctorName: appointment.doctorFullName,
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

        // ── Verify requester is patient or doctor on this appointment ──────
        const isPatient = appointment.patientId === req.user.id.toString();
        const isDoctor = appointment.doctorId === req.user.id.toString();
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

        if (!isPatient && !isDoctor && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to track this appointment.',
            });
        }

        // ── Set SSE headers ────────────────────────────────────────────────
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // ── Push current status immediately on connect ─────────────────────
        res.write(`data: ${JSON.stringify({
            status: appointment.status,
            statusHistory: appointment.statusHistory,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
        })}\n\n`);

        // ── Register SSE listener for this appointment ─────────────────────
        const appointmentId = appointment._id.toString();

        const onStatusChange = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        appointmentEvents.on(appointmentId, onStatusChange);

        // ── Heartbeat — keeps connection alive through proxies/load balancers
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n`');
        }, 30000);

        // ── Clean up on client disconnect ──────────────────────────────────
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

        // ── Verify requester is authorized to view this appointment ────────
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
 * @desc    Get all appointments (admin view) with optional filters
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