import { Router } from 'express';
import { protect, authorize, verifyHistoryToken } from '../middleware/auth.js';
import upload from '../config/multer.js';
import {
    getMyProfile,
    saveBookingProfile,
    updateProfile,
    uploadProfilePicture,
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
import {
    uploadReport,
    getMyReports,
    getReportById,
    archiveReport,
} from '../controllers/reportController.js';

const router = Router();

// Confirm snapshot — called by appointment-service after payment confirmed
// No JWT — secured by x-internal-secret header
router.patch('/snapshot/:snapshotId/confirm', confirmSnapshot);


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
router.post('/me/profile-picture', authorize('patient'), upload.single('image'), uploadProfilePicture);

// Medical Reports

// Upload a file to Cloudinary — multer processes the multipart/form-data
// Fields: file (the file), title (string), category (enum)
router.post('/reports/upload', authorize('patient'), upload.single('file'), uploadReport);

// Get all reports for the logged-in patient
router.get('/reports/my', authorize('patient'), getMyReports);

// Get single report — patient (own), doctor, admin
router.get('/reports/:reportId', authorize('patient', 'doctor', 'admin'), getReportById);

// Soft delete a report — patient only (own reports)
router.patch('/reports/:reportId/archive', authorize('patient'), archiveReport);

// Snapshots

// Get all confirmed snapshots for the logged-in patient
router.get('/snapshots/my', authorize('patient'), getMySnapshots);

// Create snapshot — called by appointment-service (Method 3)
router.post('/snapshot', authorize('patient'), createSnapshot);

// Get single snapshot — patient (own), doctor (appointment-verified), admin
router.get('/snapshot/:snapshotId', authorize('patient', 'doctor', 'admin'), getSnapshot);

// Internal

// Must be LAST — catches /:userId after all static routes above
router.get('/:userId', getPatientByUserId);

export default router;