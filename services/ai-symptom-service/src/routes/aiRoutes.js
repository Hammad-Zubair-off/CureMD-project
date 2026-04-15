import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { aiChatLimiter } from '../middleware/rateLimiter.js';
import {
    getAllSessions,
    getSessionById,
    createSession,
    sendMessage,
    deleteSession,
} from '../controllers/aiController.js';

const router = Router();

// All AI routes require authentication and are restricted to patients
router.use(protect);
router.use(authorize('patient'));

/**
 * GET /api/ai/sessions
 * Returns all sessions for the logged-in patient, sorted newest first.
 * Returns summary view only (excludes full messages array) for list rendering.
 */
router.get('/sessions', getAllSessions);

/**
 * GET /api/ai/sessions/:sessionId
 * Returns a single session with full message history.
 * Called when patient opens a specific chat to continue it.
 */
router.get('/sessions/:sessionId', getSessionById);

/**
 * POST /api/ai/sessions
 * Creates a new chat session.
 * Patient can create as many sessions as they want.
 * Optional body: { title, vitals }
 */
router.post('/sessions', createSession);

/**
 * POST /api/ai/sessions/:sessionId/message
 * Sends a message to a specific session.
 * Patient can continue any session at any time.
 * Rate limited to 10 messages per 15 minutes per user.
 * Body: { message, selectedReports[] (max 3) }
 */
router.post('/sessions/:sessionId/message', aiChatLimiter, sendMessage);

/**
 * DELETE /api/ai/sessions/:sessionId
 * Deletes a specific chat session.
 * Patient can only delete their own sessions.
 */
router.delete('/sessions/:sessionId', deleteSession);

export default router;