import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
    createSession,
    markSessionActive,
    endSession,
    getSessionByAppointment,
} from '../controllers/telemedicineController.js';

const router = Router();

// =============================================================================
// TELEMEDICINE SESSIONS  (role: doctor)
// All routes require authentication
// =============================================================================

// POST /api/telemedicine/session/create          Create/retrieve session → returns Agora token + channel name
router.post('/session/create', protect, authorize('doctor'), createSession);

// PATCH /api/telemedicine/session/:sessionId/start   Mark session as active (doctor joined)
router.patch('/session/:sessionId/start', protect, markSessionActive);

// PATCH /api/telemedicine/session/:sessionId/end     End session
router.patch('/session/:sessionId/end', protect,authorize('doctor'), endSession);

// GET /api/telemedicine/session/appointment/:appointmentId   Get session by appointment ID
router.get('/session/appointment/:appointmentId', protect, getSessionByAppointment);

export default router;