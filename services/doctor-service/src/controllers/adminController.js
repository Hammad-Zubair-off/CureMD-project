import { Doctor } from '../models/Doctor.js';

// GET /api/doctors/admin/pending
// Admin: list all doctors pending approval
export const getPendingDoctors = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;

        const [doctors, total] = await Promise.all([
            Doctor.find({ isApproved: false, isActive: true })
                .select('title firstName lastName specialization licenseNumber createdAt')
                .lean({ virtuals: true })
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: 1 }),
            Doctor.countDocuments({ isApproved: false, isActive: true }),
        ]);

        return res.status(200).json({
            success: true,
            data: doctors,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/doctors/admin/all
// Admin: list ALL doctors with filter
export const getAllDoctors = async (req, res, next) => {
    try {
        const { isApproved, isActive, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, parseInt(limit));
        const skip = (pageNum - 1) * limitNum;

        const filter = {};
        if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const [doctors, total, approvedCount, pendingCount] = await Promise.all([
            Doctor.find(filter)
                .lean({ virtuals: true })
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 }),
            Doctor.countDocuments(filter),
            Doctor.countDocuments({ ...filter, isApproved: true }),
            Doctor.countDocuments({ ...filter, isApproved: false, isActive: true }),
        ]);

        return res.status(200).json({
            success: true,
            data: doctors,
            approvedCount,
            pendingCount,
            pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
        });
    } catch (err) {
        next(err);
    }
};


// PATCH /api/doctors/admin/:id/toggle-active
// Admin: enable / disable a doctor account
export const toggleActive = async (req, res, next) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found.' });
        }

        doctor.isActive = !doctor.isActive;
        await doctor.save();

        return res.status(200).json({
            success: true,
            message: `Doctor ${doctor.isActive ? 'activated' : 'deactivated'}.`,
            data: { isActive: doctor.isActive },
        });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/doctors/admin/:id/rating
// Called internally by appointment-service after a review is submitted
export const updateRating = async (req, res, next) => {
    try {
        const { rating, totalReviews } = req.body;

        if (rating === undefined || totalReviews === undefined) {
            return res.status(400).json({ success: false, error: 'rating and totalReviews are required.' });
        }

        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { rating, totalReviews },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found.' });
        }

        return res.status(200).json({ success: true, data: { rating: doctor.rating, totalReviews: doctor.totalReviews } });
    } catch (err) {
        next(err);
    }
};