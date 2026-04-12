import { Router } from 'express';
import { protect, authorize, verifyHistoryToken } from '../middleware/auth.js';
import {
    getMyProfile,
    saveBookingProfile,
    updateProfile,
    getPatientByUserId,
    generateHistoryToken,
} from '../controllers/patientController.js';
import {
    createSnapshot,
    confirmSnapshot,
    getMySnapshots,
    getSnapshot,
    getHistoryForAI,
    getHistoryForDoctor,
} from '../controllers/snapshotController.js';

const router = Router();

// All routes require a valid JWT
router.use(protect);

// History Token

router.post('/history-token', authorize('patient'), generateHistoryToken);
router.get('/history/ai', verifyHistoryToken, getHistoryForAI);
router.get('/history/doctor/:patientId', authorize('doctor'), getHistoryForDoctor);

// Profile

router.get('/me', authorize('patient'), getMyProfile);
router.post('/profile', authorize('patient'), saveBookingProfile);
router.put('/me', authorize('patient'), updateProfile);

// Snapshots

// Patient views all their confirmed snapshots
// Frontend uses this to decide whether to enable sharing options in booking form
router.get('/snapshots/my', authorize('patient'), getMySnapshots);

// Create snapshot — called by appointment-service (Method 3) after booking
router.post('/snapshot', authorize('patient'), createSnapshot);

// Confirm snapshot — called by appointment-service (Method 3) after payment confirmed
// Clears snapshotExpiresAt so the snapshot is never auto-deleted
// No JWT middleware — secured by x-internal-secret header
router.patch('/snapshot/:snapshotId/confirm', confirmSnapshot);

// Fetch a single snapshot by ID
// Patient: own snapshots only
// Doctor: only if they are the doctor on the linked appointment (verified internally)
// Admin: unrestricted
router.get('/snapshot/:snapshotId', authorize('patient', 'doctor', 'admin'), getSnapshot);

// Internal

// Must be LAST — dynamic segment catches anything not matched above
router.get('/:userId', getPatientByUserId);

export default router;