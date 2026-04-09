import { Router } from 'express';
import { protect, authorize, verifyHistoryToken } from '../middleware/auth.js';
import {
    getMyProfile,
    saveBookingProfile,
    updateProfile,
    getPatientByUserId,
    generateHistoryToken
} from '../controllers/patientController.js';
import {
    createSnapshot,
    getSnapshot,
    getHistoryForAI,
    getHistoryForDoctor
} from '../controllers/snapshotController.js';

const router = Router();

// All routes require a valid JWT
router.use(protect);

// Patient requests 1-hour token
router.post('/history-token', protect, authorize('patient'), generateHistoryToken);

// AI microservice fetches the data (NO standard protect middleware, only verifyHistoryToken)
router.get('/history/ai', verifyHistoryToken, getHistoryForAI);

// Doctor 24-Hour Access Flow
// Doctor views timeline (starts or checks 24-hour timer)
router.get('/history/doctor/:patientId', protect, authorize('doctor'), getHistoryForDoctor);

// Profile

// Get own profile — returns bookingProfileComplete flag for frontend routing
router.get('/me', authorize('patient'), getMyProfile);

// Booking wall — save required fields for the first time (or re-save with updates)
router.post('/profile', authorize('patient'), saveBookingProfile);

// Dashboard settings — update any profile fields
router.put('/me', authorize('patient'), updateProfile);

// Snapshots

// Create a frozen snapshot just before booking — returns snapshotId to frontend
// Frontend passes snapshotId to appointment-service (Method 1)
router.post('/snapshot', authorize('patient'), createSnapshot);

// Fetch a snapshot — called by doctor-service when doctor opens an appointment
// Uses Method 3 (sync HTTP) since it's backend-to-backend with no user in browser
router.get('/snapshot/:snapshotId', authorize('doctor', 'admin'), getSnapshot);

// Internal

// Fetch patient profile by userId — appointment-service forwards patient JWT (Method 1)
// /me and /snapshot/:id must be defined BEFORE this to avoid route conflicts
router.get('/:userId', protect, getPatientByUserId);

export default router;
