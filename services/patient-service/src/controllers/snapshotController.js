import Patient from '../models/Patient.js';
import MedicalHistorySnapshot from '../models/MedicalHistorySnapshot.js';
import DoctorHistoryAccess from '../models/DoctorHistoryAccess.js';
import { logger } from '../utils/logger.js';
import { validateSnapshotRequest } from '../validators/patientValidator.js';

/**
 * @desc    Create a frozen medical history snapshot for a booking.
 *
 *          Called by the frontend just before submitting a booking to
 *          appointment-service. The frontend sends sharesMedicalHistory (bool).
 *
 *          patient-service freezes the current medical data into a snapshot
 *          document and returns the snapshotId. The frontend then passes
 *          that snapshotId + sharesMedicalHistory to appointment-service
 *          as part of the booking body (Method 1 — frontend passes data).
 *
 *          The snapshot is IMMUTABLE after creation. If a patient's meds
 *          change before the next booking, a new snapshot is created then.
 *          Old appointments keep their historical record intact.
 *
 *          Patient must have a complete booking profile before a snapshot
 *          can be created — enforced here.
 *
 * @route   POST /api/patients/snapshot
 * @access  Private — patient
 */
export const createSnapshot = async (req, res, next) => {
    try {
        const { valid, errors } = validateSnapshotRequest(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, errors });
        }

        const { sharesMedicalHistory } = req.body;

        // Fetch the patient's current profile
        const profile = await Patient.findOne({ userId: req.user.id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Patient profile not found. Please complete your profile first.',
            });
        }

        if (!profile.bookingProfileComplete) {
            return res.status(400).json({
                success: false,
                error: 'Please complete your profile before booking an appointment.',
                missingFields: getMissingFields(profile),
            });
        }

        // Build the snapshot — always capture required fields
        const snapshotData = {
            userId: req.user.id,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            bloodType: profile.bloodType,
            emergencyContact: {
                name: profile.emergencyContact?.name,
                phone: profile.emergencyContact?.phone,
                relationship: profile.emergencyContact?.relationship,
            },
            sharesMedicalHistory,

            // Only include sensitive data if patient explicitly consented
            allergies: sharesMedicalHistory ? profile.allergies : [],
            currentMedications: sharesMedicalHistory ? profile.currentMedications : [],
            chronicConditions: sharesMedicalHistory ? profile.chronicConditions : [],
        };

        const snapshot = await MedicalHistorySnapshot.create(snapshotData);

        logger.info(`[patient-service] Snapshot created for: ${req.user.email} | sharesMedicalHistory: ${sharesMedicalHistory}`);

        res.status(201).json({
            success: true,
            message: 'Medical history snapshot created.',
            snapshotId: snapshot._id,
            sharesMedicalHistory,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a medical history snapshot by ID.
 *
 *          Called by doctor-service when a doctor opens an appointment
 *          and sharesMedicalHistory is true (Method 3 — sync HTTP,
 *          backend-to-backend, no user in browser at that moment).
 *
 *          Returns the full snapshot. doctor-service decides what to
 *          display based on the sharesMedicalHistory flag inside the document.
 *
 * @route   GET /api/patients/snapshot/:snapshotId
 * @access  Private — doctor, admin
 */
export const getSnapshot = async (req, res, next) => {
    try {
        const snapshot = await MedicalHistorySnapshot.findById(req.params.snapshotId);

        if (!snapshot) {
            return res.status(404).json({
                success: false,
                error: 'Snapshot not found.',
            });
        }

        res.status(200).json({ success: true, snapshot });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get history for AI (Using 1-hour token)
 * @route   GET /api/patients/history/ai
 * @access  Protected by verifyHistoryToken
 */
export const getHistoryForAI = async (req, res, next) => {
    try {
        const history = await MedicalHistorySnapshot.find({ userId: req.targetPatientId })
            .sort({ snapshotTakenAt: -1 }).lean();

        // Strip PII (Personal Identifiable Information) for AI
        const sanitized = history.map(h => ({
            date: h.snapshotTakenAt,
            gender: h.gender,
            bloodType: h.bloodType,
            height: h.height,
            weight: h.weight,
            allergies: h.allergies,
            currentMedications: h.currentMedications,
            chronicConditions: h.chronicConditions
        }));

        res.status(200).json({ success: true, history: sanitized });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get history for Doctor (24-hour access window)
 * @route   GET /api/patients/history/doctor/:patientId
 * @access  Private - doctor
 */
export const getHistoryForDoctor = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { patientId } = req.params;

        // 1. Check if the doctor already has an active 24h window
        let accessRecord = await DoctorHistoryAccess.findOne({ doctorId, patientId });

        if (!accessRecord) {
            // First time accessing: Start the 24-hour clock
            accessRecord = await DoctorHistoryAccess.create({
                doctorId,
                patientId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // +24 hours
            });
        } else if (new Date() > accessRecord.expiresAt) {
            // Because of MongoDB TTL this rarely hits, but good for safety
            return res.status(403).json({ 
                success: false, 
                error: 'Your 24-hour access window for this patient has expired.' 
            });
        }

        // 2. Fetch full history
        const history = await MedicalHistorySnapshot.find({ userId: patientId })
            .sort({ snapshotTakenAt: -1 }).lean();

        res.status(200).json({ 
            success: true, 
            expiresAt: accessRecord.expiresAt,
            history 
        });
    } catch (err) {
        next(err);
    }
};

// Helpers
/**
 * Returns a list of required fields that are missing from the patient's profile.
 * Returned in the 400 response so the frontend knows exactly what to ask for.
 */
const getMissingFields = (profile) => {
    const missing = [];
    if (!profile.dateOfBirth) missing.push('dateOfBirth');
    if (!profile.gender) missing.push('gender');
    if (!profile.contactNumber) missing.push('contactNumber');
    if (!profile.bloodType) missing.push('bloodType');
    if (!profile.emergencyContact?.name) missing.push('emergencyContact.name');
    if (!profile.emergencyContact?.phone) missing.push('emergencyContact.phone');
    if (!profile.emergencyContact?.relationship) missing.push('emergencyContact.relationship');
    return missing;
};
