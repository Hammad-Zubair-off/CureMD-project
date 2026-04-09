import Patient from '../models/Patient.js';
import { logger } from '../utils/logger.js';
import { validateBookingProfile, validateProfileUpdate } from '../validators/patientValidator.js';
import { publishEvent } from '../utils/eventBus.js';
import jwt from 'jsonwebtoken';

// Fields the client must never be able to set directly
const BLOCKED_FIELDS = ['userId', 'onboardingComplete', 'medicalReports'];

const sanitize = (body) => {
    const clean = { ...body };
    BLOCKED_FIELDS.forEach((f) => delete clean[f]);
    return clean;
};

/**
 * @desc    Get current patient's own profile.
 * Returns bookingProfileComplete so the frontend knows which screen to show.
 * @route   GET /api/patients/me
 * @access  Private — patient
 */
export const getMyProfile = async (req, res, next) => {
    try {
        const profile = await Patient.findOne({ userId: req.user.id });

        if (!profile) {
            // Registered in auth-service but hasn't hit the booking wall yet
            return res.status(200).json({
                success: true,
                bookingProfileComplete: false,
                profile: null,
            });
        }

        res.status(200).json({
            success: true,
            bookingProfileComplete: profile.bookingProfileComplete,
            profile,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Save required booking profile fields (The Booking Wall).
 * Sets bookingProfileComplete to true once successful.
 *
 * @route   POST /api/patients/profile
 * @access  Private — patient
 */
/**
 * @desc    Save required booking profile fields (The Booking Wall).
 * Sets bookingProfileComplete to true once successful.
 *
 * @route   POST /api/patients/profile
 * @access  Private — patient
 */
export const saveBookingProfile = async (req, res, next) => {
    try {
        // 1. Validate the incoming data (UNCOMMENTED!)
        const { valid, errors } = validateBookingProfile(req.body);
        if (!valid) return res.status(400).json({ success: false, errors });

        const { dateOfBirth, gender, contactNumber, bloodType, emergencyContact } = req.body;

        // 2. Upsert the patient profile
        const profile = await Patient.findOneAndUpdate(
            { userId: req.user.id },
            {
                userId: req.user.id,
                dateOfBirth,
                gender,
                contactNumber: contactNumber?.trim(),
                bloodType,
                emergencyContact,
                bookingProfileComplete: true, // Replaced onboardingComplete!
            },
            { upsert: true, new: true, runValidators: true }
        );

        logger.success(`[patient-service] Booking profile completed: ${req.user.id}`);

        // 3. Publish Event
        publishEvent('patient.profile.completed', {
            userId: req.user.id,
            patientId: profile._id,
            contactNumber: profile.contactNumber,
        });

        res.status(201).json({
            success: true,
            message: 'Booking profile saved successfully.',
            profile,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update optional profile fields (blood type, weight, allergies, etc.)
 *          Patient must have completed onboarding first.
 *
 *          COMMUNICATION:
 *          → Method 2 (RabbitMQ): publishes 'patient.profile.updated'
 *            so any service caching patient contact data can refresh its snapshot.
 *            Fire and forget — profile update succeeds regardless.
 *
 * @route   PUT /api/patients/me
 * @access  Private — patient
 */
export const updateProfile = async (req, res, next) => {
    try {
        const profile = await Patient.findOne({ userId: req.user.id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Profile not found. Please complete onboarding first.',
            });
        }

        if (!profile.bookingProfileComplete) {
            return res.status(400).json({
                success: false,
                error: 'Please complete onboarding before updating your profile.',
            });
        }

        const body = sanitize(req.body);

        const { valid, errors } = validateProfileUpdate(body);
        if (!valid) {
            return res.status(400).json({ success: false, errors });
        }

        const updated = await Patient.findOneAndUpdate(
            { userId: req.user.id },
            { $set: body },
            { new: true, runValidators: true }
        );

        logger.info(`[patient-service] Profile updated: ${req.user.email}`);

        // METHOD 2 — Fire and forget (per inter-service communication guide)
        // Any service that cached patient contact details can subscribe and refresh.
        publishEvent('patient.profile.updated', {
            userId: req.user.id,
            patientId: updated._id,
            contactNumber: updated.contactNumber,
            emergencyContact: updated.emergencyContact,
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            profile: updated,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a patient profile by userId.
 *
 *          COMMUNICATION — METHOD 1 (per inter-service communication guide):
 *          When appointment-service needs patient data, the frontend already
 *          has the patient's JWT from login. It forwards that token in the
 *          Authorization header when calling appointment-service, and
 *          appointment-service forwards it here.
 *          No direct service-to-service auth mechanism needed — the shared
 *          JWT_SECRET across all services handles verification.
 *
 * @route   GET /api/patients/:userId
 * @access  Private — any authenticated role
 */
export const getPatientByUserId = async (req, res, next) => {
    try {
        const profile = await Patient.findOne({ userId: req.params.userId });

        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Patient profile not found.',
            });
        }

        res.status(200).json({ success: true, profile });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Generate a 1-hour token for AI history access
 * @route   POST /api/patients/history-token
 * @access  Private — patient
 */
export const generateHistoryToken = async (req, res, next) => {
    try {
        const payload = {
            id: req.user.id,
            purpose: 'history_access',
        };

        // 1 hour expiration for AI context session
        const historyToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1h', 
        });

        res.status(200).json({
            success: true,
            token: historyToken,
        });
    } catch (err) {
        next(err);
    }
};