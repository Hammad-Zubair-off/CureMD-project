import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createSession,
  markSessionActive,
  endSession,
  getSessionByAppointment,
} from '../controllers/telemedicineController.js';

const router = Router();

// Doctor creates/retrieves a session
router.post('/session/create', protect, authorize('doctor'), createSession);

// Doctor marks active
router.patch('/session/:sessionId/start', protect, authorize('doctor'), markSessionActive);

// Doctor ends session
router.patch('/session/:sessionId/end', protect, authorize('doctor'), endSession);

// Doctor or patient can fetch own session-by-appointment join data
router.get('/session/appointment/:appointmentId', protect, authorize('doctor', 'patient'), getSessionByAppointment);

export default router;