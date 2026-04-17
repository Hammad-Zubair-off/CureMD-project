import { Doctor } from '../models/Doctor.js';

// PUT /api/doctors/availability
// Doctor replaces their entire weekly availability schedule
export const setAvailability = async (req, res, next) => {
    try {
        const { availability } = req.body;

        // Validate that no duplicate days are sent
        const days = availability.map((a) => a.day);
        const uniqueDays = new Set(days);
        if (uniqueDays.size !== days.length) {
            return res.status(400).json({
                success: false,
                error: 'Duplicate days found in availability. Each day must appear only once.',
            });
        }

        // Validate slot order: startTime < endTime for every slot
        for (const dayEntry of availability) {
            for (const slot of dayEntry.slots) {
                if (slot.startTime >= slot.endTime) {
                    return res.status(400).json({
                        success: false,
                        error: `On ${dayEntry.day}: startTime (${slot.startTime}) must be before endTime (${slot.endTime}).`,
                    });
                }
            }
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.id },
            { $set: { availability } },
            { new: true, runValidators: true }
        );

        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor profile not found.' });
        }

        return res.status(200).json({ success: true, data: { availability: doctor.availability } });
    } catch (err) {
        next(err);
    }
};

// GET /api/doctors/availability/me
// Logged-in doctor views their own schedule
export const getMyAvailability = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.id }).select('availability');
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor profile not found.' });
        }
        return res.status(200).json({ success: true, data: { availability: doctor.availability } });
    } catch (err) {
        next(err);
    }
};

// GET /api/doctors/:id/availability
// Public: get a specific doctor's availability (used by appointment service & detail page)
export const getDoctorAvailability = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true })
            .select('availability consultationFee consultationTypes firstName lastName title')
            .lean({ virtuals: true });

        console.log('doctor found:', doctor);

        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found.' });
        }
        console.log('returning 200');
        return res.status(200).json({
            success: true,
            data: {
                doctorId: doctor._id,
                fullName: doctor.fullName,
                consultationFee: doctor.consultationFee,
                consultationTypes: doctor.consultationTypes,
                availability: doctor.availability,
            },
        });
    } catch (err) {
        next(err);
    }
};