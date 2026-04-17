import { Router } from 'express';
import { protect, authorize, requireApproved } from '../middleware/auth.js';
import {
    bookAppointment,
    confirmAppointment,
    rejectAppointment,
    rescheduleAppointment,
    cancelAppointment,
    updateAppointmentStatus,
    trackAppointment,
    getMyAppointments,
    getDoctorAppointments,
    getAppointmentById,
    getAllAppointments,
    getDoctorRejectionRequests,
} from '../controllers/appointmentController.js';

const router = Router();

// Static routes first (must come before /:id)

// Patient — view own appointments
router.get('/my', protect, authorize('patient'), getMyAppointments);

// Doctor — view own appointments
router.get('/doctor', protect, authorize('doctor'), requireApproved, getDoctorAppointments);

// Admin — view all appointments with optional filters
// GET /api/appointments/all?status=pending&doctorId=xxx&date=2026-03-25
router.get('/all', protect, authorize('admin'), getAllAppointments);

// Booking

// Patient books a new appointment (Method 1 — doctor data from frontend)
router.post('/', protect, authorize('patient'), bookAppointment);

// Dynamic routes (/:id)

// Real-time status tracking via SSE
router.get('/:id/track', protect, trackAppointment);

// Payment-service confirms appointment after successful payment
// No JWT middleware — secured by internal secret header only
router.patch('/:id/confirm', confirmAppointment);

router.get('/admin/rejection-requests', protect, authorize('admin', 'superadmin'), getDoctorRejectionRequests);

// Doctor rejects a confirmed appointment
router.patch('/:id/reject', protect, authorize('doctor'), requireApproved, rejectAppointment);

// Patient reschedules appointment
router.patch('/:id/reschedule', protect, authorize('patient'), rescheduleAppointment);

// Patient cancels appointment
router.patch('/:id/cancel', protect, authorize('patient'), cancelAppointment);

// Doctor marks appointment as completed after consultation
router.patch('/:id/status', protect, authorize('doctor'), requireApproved, updateAppointmentStatus);

// Patient, doctor, or admin views a single appointment
router.get('/:id', protect, getAppointmentById);

export default router;