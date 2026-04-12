import Patient from '../models/Patient.js';
import MedicalHistorySnapshot from '../models/MedicalHistorySnapshot.js';
import DoctorHistoryAccess from '../models/DoctorHistoryAccess.js';
import { logger } from '../utils/logger.js';
import { validateSnapshotRequest } from '../validators/patientValidator.js';
import { appointmentClient } from '../config/services.js';
import SERVICES from '../config/services.js';
import { callService } from '../utils/callService.js';

/**
 * @desc    Create a frozen medical history snapshot.
 *
 *          Called by appointment-service (Method 3) after the appointment
 *          is saved. Receives { sharingMode, appointmentId, snapshotExpiresAt }
 *          plus the patient's JWT forwarded from appointment-service.
 *
 *          snapshotExpiresAt mirrors the appointment's expiresAt (30 min).
 *          Once payment is confirmed, appointment-service calls
 *          PATCH /api/patients/snapshot/:id/confirm to clear snapshotExpiresAt.
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

        const snapshot = await MedicalHistorySnapshot.create({
            userId:        req.user.id,
            appointmentId,
            dateOfBirth:   profile.dateOfBirth,
            gender:        profile.gender,
            bloodType:     profile.bloodType,
            emergencyContact: {
                name:         profile.emergencyContact?.name,
                phone:        profile.emergencyContact?.phone,
                relationship: profile.emergencyContact?.relationship,
            },
            sharingMode,
            allergies:          profile.allergies          ?? [],
            currentMedications: profile.currentMedications ?? [],
            chronicConditions:  profile.chronicConditions  ?? [],
            // Mirror the appointment TTL — cleared on payment confirmation
            snapshotExpiresAt: snapshotExpiresAt || null,
        });

        logger.info(`[patient-service] Snapshot created: ${req.user.email} | mode: ${sharingMode} | appointment: ${appointmentId}`);

        res.status(201).json({
            success:    true,
            message:    'Medical history snapshot created.',
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
 * @desc    Confirm a snapshot — clears the TTL so it is never auto-deleted.
 *
 *          Called by appointment-service (Method 3) after payment is confirmed.
 *          Mirrors the same pattern as appointment confirmAppointment:
 *          once paid, the snapshot becomes a permanent medical record.
 *
 *          Secured by x-internal-secret header — same secret used by
 *          payment-service to confirm appointments.
 *
 * @route   PATCH /api/patients/snapshot/:snapshotId/confirm
 * @access  Internal — appointment-service only
 */
export const confirmSnapshot = async (req, res, next) => {
    try {
        const INTERNAL_SECRET = process.env.INTERNAL_SECRET;
        const internalSecret  = req.headers['x-internal-secret'];

        if (!INTERNAL_SECRET || internalSecret !== INTERNAL_SECRET) {
            return res.status(403).json({ success: false, error: 'Unauthorized.' });
        }

        const snapshot = await MedicalHistorySnapshot.findByIdAndUpdate(
            req.params.snapshotId,
            { snapshotExpiresAt: null }, // clear TTL — snapshot is now permanent
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
 * @desc    Get all snapshots for the logged-in patient.
 *          Used by the frontend before the booking form to determine
 *          whether the patient has medical data to enable sharing options.
 *          Returns full data — patient owns this data.
 *          Excludes snapshots still pending payment (snapshotExpiresAt is set).
 *
 * @route   GET /api/patients/snapshots/my
 * @access  Private — patient
 */
export const getMySnapshots = async (req, res, next) => {
    try {
        // Only return confirmed snapshots (payment completed, snapshotExpiresAt cleared)
        // Pending payment snapshots are excluded — they may disappear in 30 min
        const snapshots = await MedicalHistorySnapshot.find({
            userId:            req.user.id,
            snapshotExpiresAt: null,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success:   true,
            total:     snapshots.length,
            snapshots,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single snapshot by ID.
 *
 *          Access rules:
 *          - Patient: can only view their own snapshots
 *          - Doctor:  can only view snapshots where they are the doctor
 *                     on the linked appointment (verified via appointment-service)
 *          - Admin:   unrestricted access
 *
 * @route   GET /api/patients/snapshot/:snapshotId
 * @access  Private — patient, doctor, admin
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

        const role = req.user.role;

        // Admin — unrestricted
        if (role === 'admin' || role === 'superadmin') {
            return res.status(200).json({ success: true, snapshot });
        }

        // Patient — can only view their own snapshots
        if (role === 'patient') {
            if (snapshot.userId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not authorized to view this snapshot.',
                });
            }
            return res.status(200).json({ success: true, snapshot });
        }

        // Doctor — verify they are the doctor on the linked appointment
        // METHOD 3: call appointment-service to check doctorId on the appointment
        if (role === 'doctor') {
            const appointmentData = await callService(
                () => appointmentClient.get(
                    SERVICES.appointment.endpoints.getById(snapshot.appointmentId.toString()),
                    { headers: { Authorization: req.headers.authorization } }
                ),
                'appointment-service',
                res
            );

            if (!appointmentData) return; // error already sent

            if (appointmentData.appointment.doctorId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not the doctor on the appointment linked to this snapshot.',
                });
            }

            return res.status(200).json({ success: true, snapshot });
        }

        // Any other role
        return res.status(403).json({ success: false, error: 'Access denied.' });

    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get full history for a doctor (24-hour access window).
 *
 *          COMMUNICATION: Method 3 — calls appointment-service to verify
 *          the appointment has sharingMode: 'full_history_24h' and that
 *          the requesting doctor is on that appointment.
 *
 *          24h clock starts on FIRST call — not at booking time.
 *
 * @route   GET /api/patients/history/doctor/:patientId?appointmentId=xxx
 * @access  Private — doctor
 */
export const getHistoryForDoctor = async (req, res, next) => {
    try {
        const doctorId          = req.user.id;
        const { patientId }     = req.params;
        const { appointmentId } = req.query;

        if (!appointmentId || typeof appointmentId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'appointmentId query parameter is required and must be a single string.',
            });
        }

        // Check if active 24h window already exists — skip verification if so
        let accessRecord = await DoctorHistoryAccess.findOne({
            doctorId,
            patientId,
            appointmentId,
        });

        if (!accessRecord) {
            // METHOD 3 — verify appointment grants full_history_24h access
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
                return res.status(403).json({
                    success: false,
                    error: 'You are not the doctor on this appointment.',
                });
            }

            if (appointment.patientId !== patientId) {
                return res.status(403).json({
                    success: false,
                    error: 'This appointment does not belong to the specified patient.',
                });
            }

            if (appointment.sharingMode !== 'full_history_24h') {
                return res.status(403).json({
                    success: false,
                    error: `Full history access was not granted for this appointment. Sharing mode is '${appointment.sharingMode}'.`,
                });
            }

            // Start the 24h clock on first access
            accessRecord = await DoctorHistoryAccess.create({
                doctorId,
                patientId,
                appointmentId,
                sharingMode: 'full_history_24h',
                expiresAt:   new Date(Date.now() + 24 * 60 * 60 * 1000),
            });

            logger.info(
                `[patient-service] 24h history access started — doctor: ${doctorId} patient: ${patientId} appointment: ${appointmentId}`
            );
        }

        // Only return confirmed snapshots (payment completed)
        const history = await MedicalHistorySnapshot.find({
            userId:            patientId,
            snapshotExpiresAt: null,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success:   true,
            expiresAt: accessRecord.expiresAt,
            total:     history.length,
            history,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get history for AI service using 1-hour history token.
 *          Returns sanitized snapshots — confirmed only, no PII.
 *
 * @route   GET /api/patients/history/ai
 * @access  Protected by verifyHistoryToken middleware only
 */
export const getHistoryForAI = async (req, res, next) => {
    try {
        const history = await MedicalHistorySnapshot.find({
            userId:            req.targetPatientId,
            snapshotExpiresAt: null, // confirmed snapshots only
        })
            .sort({ createdAt: -1 })
            .lean();

        const sanitized = history.map((h) => ({
            date:               h.createdAt,
            gender:             h.gender,
            bloodType:          h.bloodType,
            allergies:          h.allergies,
            currentMedications: h.currentMedications,
            chronicConditions:  h.chronicConditions,
        }));

        res.status(200).json({ success: true, history: sanitized });
    } catch (err) {
        next(err);
    }
};

// Helpers

const getMissingFields = (profile) => {
    const missing = [];
    if (!profile.dateOfBirth)                    missing.push('dateOfBirth');
    if (!profile.gender)                         missing.push('gender');
    if (!profile.contactNumber)                  missing.push('contactNumber');
    if (!profile.bloodType)                      missing.push('bloodType');
    if (!profile.emergencyContact?.name)         missing.push('emergencyContact.name');
    if (!profile.emergencyContact?.phone)        missing.push('emergencyContact.phone');
    if (!profile.emergencyContact?.relationship) missing.push('emergencyContact.relationship');
    return missing;
};