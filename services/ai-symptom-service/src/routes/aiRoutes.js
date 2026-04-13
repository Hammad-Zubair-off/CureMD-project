import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { aiChatLimiter } from '../middleware/rateLimiter.js';
import { askMedicalAssistant } from '../controllers/aiController.js';

const router = Router();

/**
 * POST /api/ai/ask
 *
 * Headers required:
 *   Authorization: Bearer <standard JWT>   — identifies the user, used for rate limiting
 *   x-ai-token:   Bearer <ai history token> — 1-hour token from POST /api/patients/history-token
 *                                             forwarded to patient-service for history fetch
 *
 * Body:
 *   {
 *     question: string            — required
 *     reports:  MedicalReport[]   — optional, max 3
 *       [{ title, category, fileUrl, mimeType }]
 *   }
 */
router.post(
    '/ask',
    protect,                    // verify standard JWT — sets req.user for rate limiter
    authorize('patient'),       // only patients can use the AI assistant
    aiChatLimiter,              // 10 requests per 15 minutes per userId
    askMedicalAssistant
);

export default router;
