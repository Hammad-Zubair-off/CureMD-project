import Patient from '../models/Patient.js';
import MedicalReport from '../models/MedicalReport.js';
import MedicalHistorySnapshot from '../models/MedicalHistorySnapshot.js';
import DoctorHistoryAccess from '../models/DoctorHistoryAccess.js';
import { logger } from '../utils/logger.js';
import { validateSnapshotRequest } from '../validators/patientValidator.js';
import { appointmentClient } from '../config/services.js';
import SERVICES from '../config/services.js';
import { callService } from '../utils/callService.js';

// Controllers

/**
 * @desc    Create a frozen medical history snapshot.
 *
 *          Called by appointment-service (Method 3) after the appointment
 *          is saved. Receives { sharingMode, appointmentId, snapshotExpiresAt }.
 *
 *          sharingMode:
 *            'MINIMAL' → copies basic stats only. medicalReports: []
 *            'FULL'    → copies basic stats + all MedicalReport ObjectIds
 *                        from the patient's profile at this moment in time.
 *                        Also grants 24h longitudinal history access.
 *
 * @route   POST /api/patients/snapshot
 * @access  Private — patient (JWT forwarded from appointment-service)
 */
export const createSnapshot = async (req, res, next) => {
    try {
        const { valid, errors } = validateSnapshotRequest(req.body);
        if (!valid) {
            return res.status(400).json({ success: false, errors });
        }

        const { sharingMode, appointmentId, snapshotExpiresAt } = req.body;

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

        // For FULL mode — fetch all MedicalReport IDs for this patient
        // These are the reports uploaded to Cloudinary at this point in time
        let reportIds = [];
        if (sharingMode === 'FULL') {
            const reports = await MedicalReport.find(
                { userId: req.user.id },
                { _id: 1 } // only need IDs — snapshot stores references not copies
            ).lean();
            reportIds = reports.map((r) => r._id);
        }

        const snapshot = await MedicalHistorySnapshot.create({
            userId: req.user.id,
            appointmentId,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            bloodType: profile.bloodType,
            emergencyContact: {
                name: profile.emergencyContact?.name,
                phone: profile.emergencyContact?.phone,
                relationship: profile.emergencyContact?.relationship,
            },
            sharingMode,
            allergies: profile.allergies ?? [],
            currentMedications: profile.currentMedications ?? [],
            chronicConditions: profile.chronicConditions ?? [],
            medicalReports: reportIds,       // [] for MINIMAL, [ObjectId...] for FULL
            snapshotExpiresAt: snapshotExpiresAt || null,
        });

        logger.info(
            `[patient-service] Snapshot created: ${req.user.email} | mode: ${sharingMode} | reports: ${reportIds.length} | appointment: ${appointmentId}`
        );

        res.status(201).json({
            success: true,
            message: 'Medical history snapshot created.',
            snapshotId: snapshot._id,
            sharingMode,
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'A snapshot already exists for this appointment.',
            });
        }
        next(err);
    }
};

/**
 * @desc    Confirm a snapshot — clears snapshotExpiresAt making it permanent.
 *          Called by appointment-service after payment is confirmed.
 *          Secured by x-internal-secret header.
 *
 * @route   PATCH /api/patients/snapshot/:snapshotId/confirm
 * @access  Internal — appointment-service only
 */
export const confirmSnapshot = async (req, res, next) => {
    try {
        const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
        const internalSecret = req.headers['x-internal-secret'];

        if (!INTERNAL_SECRET || internalSecret !== INTERNAL_SECRET) {
            return res.status(403).json({ success: false, error: 'Unauthorized.' });
        }

        const snapshot = await MedicalHistorySnapshot.findByIdAndUpdate(
            req.params.snapshotId,
            { snapshotExpiresAt: null },
            { new: true }
        );

        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found.' });
        }

        logger.success(`[patient-service] Snapshot confirmed (TTL cleared): ${snapshot._id}`);

        res.status(200).json({ success: true, message: 'Snapshot confirmed.', snapshot });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all confirmed snapshots for the logged-in patient.
 *          Excludes pending-payment snapshots (snapshotExpiresAt is set).
 *          Returns populated medicalReports so patient sees full report objects.
 *          Used by frontend before booking to enable/disable sharing options.
 *
 * @route   GET /api/patients/snapshots/my
 * @access  Private — patient
 */
export const getMySnapshots = async (req, res, next) => {
    try {
        const snapshots = await MedicalHistorySnapshot.find({
            userId: req.user.id,
            snapshotExpiresAt: null,
        })
            .populate('medicalReports', 'title category fileUrl originalName mimeType createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            total: snapshots.length,
            snapshots,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single snapshot by ID — with medicalReports populated.
 *
 *          Access rules:
 *          - Patient: own snapshots only
 *          - Doctor:  must be the doctor on the linked appointment (Method 3 check)
 *          - Admin:   unrestricted
 *
 *          medicalReports are populated so doctor gets full report objects
 *          (title, category, fileUrl) in a single call — no extra round trips.
 *
 * @route   GET /api/patients/snapshot/:snapshotId
 * @access  Private — patient, doctor, admin
 */
export const getSnapshot = async (req, res, next) => {
    try {
        const snapshot = await MedicalHistorySnapshot.findById(req.params.snapshotId)
            .populate('medicalReports', 'title category fileUrl originalName mimeType createdAt');

        if (!snapshot) {
            return res.status(404).json({ success: false, error: 'Snapshot not found.' });
        }

        const role = req.user.role;

        // Admin — unrestricted
        if (role === 'admin' || role === 'superadmin') {
            return res.status(200).json({ success: true, snapshot });
        }

        // Patient — own snapshots only
        if (role === 'patient') {
            if (snapshot.userId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not authorized to view this snapshot.',
                });
            }
            return res.status(200).json({ success: true, snapshot });
        }

        // Doctor — verify they are the doctor on the linked appointment (Method 3)
        if (role === 'doctor') {
            const appointmentData = await callService(
                () => appointmentClient.get(
                    SERVICES.appointment.endpoints.getById(snapshot.appointmentId.toString()),
                    { headers: { Authorization: req.headers.authorization } }
                ),
                'appointment-service',
                res
            );

            if (!appointmentData) return;

            if (appointmentData.appointment.doctorId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not the doctor on the appointment linked to this snapshot.',
                });
            }

            return res.status(200).json({ success: true, snapshot });
        }

        return res.status(403).json({ success: false, error: 'Access denied.' });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get full history for a doctor (24-hour access window).
 *          Only for FULL mode appointments.
 *          24h clock starts on FIRST call.
 *          Returns populated medicalReports in each snapshot.
 *
 * @route   GET /api/patients/history/doctor/:patientId?appointmentId=xxx
 * @access  Private — doctor
 */
export const getHistoryForDoctor = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { patientId } = req.params;
        const { appointmentId } = req.query;

        if (!appointmentId || typeof appointmentId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'appointmentId query parameter is required and must be a single string.',
            });
        }

        let accessRecord = await DoctorHistoryAccess.findOne({
            doctorId, patientId, appointmentId,
        });

        if (!accessRecord) {
            // METHOD 3 — verify appointment grants FULL access
            const appointmentData = await callService(
                () => appointmentClient.get(
                    SERVICES.appointment.endpoints.getById(appointmentId),
                    { headers: { Authorization: req.headers.authorization } }
                ),
                'appointment-service',
                res
            );

            if (!appointmentData) return;

            const appointment = appointmentData.appointment;

            if (appointment.doctorId !== doctorId) {
                return res.status(403).json({ success: false, error: 'You are not the doctor on this appointment.' });
            }
            if (appointment.patientId !== patientId) {
                return res.status(403).json({ success: false, error: 'This appointment does not belong to the specified patient.' });
            }
            if (appointment.sharingMode !== 'FULL') {
                return res.status(403).json({
                    success: false,
                    error: `Full history access was not granted for this appointment. Sharing mode is '${appointment.sharingMode}'.`,
                });
            }

            accessRecord = await DoctorHistoryAccess.create({
                doctorId,
                patientId,
                appointmentId,
                sharingMode: 'FULL',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            logger.info(`[patient-service] 24h history access started — doctor: ${doctorId} patient: ${patientId}`);
        }

        // Only confirmed snapshots (payment completed)
        const history = await MedicalHistorySnapshot.find({
            userId: patientId,
            snapshotExpiresAt: null,
        })
            .populate('medicalReports', 'title category fileUrl originalName mimeType createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            expiresAt: accessRecord.expiresAt,
            total: history.length,
            history,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get history for AI service (1-hour token).
 *          Sanitized — no PII, no report URLs.
 *          Medical signals only.
 *
 * @route   GET /api/patients/history/ai
 * @access  Protected by verifyHistoryToken only
 */
export const getHistoryForAI = async (req, res, next) => {
    try {
        const history = await MedicalHistorySnapshot.find({
            userId: req.targetPatientId,
            snapshotExpiresAt: null,
        })
            .sort({ createdAt: -1 })
            .lean();

        // Strip PII and report URLs — AI only needs medical signals
        const sanitized = history.map((h) => ({
            date: h.createdAt,
            gender: h.gender,
            bloodType: h.bloodType,
            allergies: h.allergies,
            currentMedications: h.currentMedications,
            chronicConditions: h.chronicConditions,
        }));

        res.status(200).json({ success: true, history: sanitized });
    } catch (err) {
        next(err);
    }
};

// Helpers

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