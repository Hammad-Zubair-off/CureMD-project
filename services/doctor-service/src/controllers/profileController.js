import mongoose from 'mongoose';
import { Doctor } from '../models/Doctor.js';

// POST /api/doctors/profile
// Doctor creates their own profile (one per userId)
export const createProfile = async (req, res, next) => {
    try {
        const existing = await Doctor.findOne({ userId: req.user.id });
        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Doctor profile already exists. Use PUT to update.',
            });
        }

        const doctor = await Doctor.create({ ...req.body, userId: req.user.id });

        return res.status(201).json({ success: true, data: doctor });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'License number already registered.',
            });
        }
        next(err);
    }
};

// GET /api/doctors/profile/me
// Logged-in doctor views their own full profile
export const getMyProfile = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Profile not found.' });
        }
        return res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        next(err);
    }
};

// PUT /api/doctors/profile
// Doctor updates their own profile
export const updateProfile = async (req, res, next) => {
    try {
        // Fields that doctors cannot change themselves
        const { isActive, rating, totalReviews, userId, ...allowedUpdates } = req.body;

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.id },
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        );

        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Profile not found.' });
        }

        return res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/doctors/:id ──────────────────────────────────────────────────────
// Public: get a single doctor's full profile (supports doctor _id or userId)
export const getDoctorById = async (req, res, next) => {
    try {
        const id = req.params.id;

        const orFilter = mongoose.Types.ObjectId.isValid(id)
            ? [{ _id: id }, { userId: id }]
            : [{ userId: id }];

        const doctor = await Doctor.findOne({
            isActive: true,
            $or: orFilter,
        }).lean({ virtuals: true });

        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found.' });
        }

        return res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        next(err);
    }
};

// GET /api/doctors
// Public: search + filter doctors (used by patient search page & appointment service)
export const searchDoctors = async (req, res, next) => {
    try {
        const {
            search,
            specialization,
            consultationType,
            minFee,
            maxFee,
            page = 1,
            limit = 12,
        } = req.query;

        const filter = { isActive: true };

        // Full-text search (name, specialization, areasOfExpertise)
        if (search) {
            filter.$text = { $search: search };
        }

        if (specialization) {
            filter.specialization = { $regex: new RegExp(specialization, 'i') };
        }

        if (consultationType) {
            filter[`consultationTypes.${consultationType}`] = true;
        }

        if (minFee !== undefined || maxFee !== undefined) {
            filter.consultationFee = {};
            if (minFee !== undefined) filter.consultationFee.$gte = Number(minFee);
            if (maxFee !== undefined) filter.consultationFee.$lte = Number(maxFee);
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [doctors, total] = await Promise.all([
            Doctor.find(filter)
                .select(
                    'title firstName lastName profilePhoto specialization yearsOfExperience ' +
                    'currentHospital consultationFee consultationTypes rating totalReviews ' +
                    'areasOfExpertise emergencyAvailable isApproved'
                )
                .lean({ virtuals: true })
                .skip(skip)
                .limit(limitNum)
                .sort({ rating: -1, totalReviews: -1 }),
            Doctor.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: doctors,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/doctors/specializations
// Public: distinct specialization list for the search dropdown
export const getSpecializations = async (req, res, next) => {
    try {
        const specializations = await Doctor.distinct('specialization', {
            isActive: true,
            isApproved: true,
        });
        return res.status(200).json({ success: true, data: specializations.sort() });
    } catch (err) {
        next(err);
    }
};