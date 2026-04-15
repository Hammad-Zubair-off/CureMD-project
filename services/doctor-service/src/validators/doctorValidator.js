// src/validators/doctorValidator.js

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VALID_TITLES = ['Dr.', 'Prof.', 'Assoc. Prof.'];
const VALID_CONSULT_TYPES = ['videoCall', 'audioCall', 'chat'];
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
// E.164-ish: optional +, then 7–15 digits
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

const fail = (res, errors) =>
    res.status(400).json({ success: false, errors });

// ── shared phone validator helper ─────────────────────────────────────────────
function validatePhoneNumbers(phones, errors) {
    if (!Array.isArray(phones)) {
        errors.push({ field: 'phoneNumbers', message: 'phoneNumbers must be an array' });
        return;
    }
    if (phones.length > 5) {
        errors.push({ field: 'phoneNumbers', message: 'A maximum of 5 phone numbers are allowed' });
    }
    phones.forEach((p, i) => {
        if (typeof p !== 'string' || !PHONE_REGEX.test(p.trim())) {
            errors.push({
                field: `phoneNumbers[${i}]`,
                message: 'Each phone number must be 7–15 digits, optionally prefixed with +',
            });
        }
    });
}

// ── POST /api/doctors/profile ─────────────────────────────────────────────────
export const createProfileValidator = (req, res, next) => {
    const errors = [];
    const b = req.body;

    if (!b.firstName || !String(b.firstName).trim())
        errors.push({ field: 'firstName', message: 'First name is required' });

    if (!b.lastName || !String(b.lastName).trim())
        errors.push({ field: 'lastName', message: 'Last name is required' });

    if (b.title !== undefined && !VALID_TITLES.includes(b.title))
        errors.push({ field: 'title', message: `title must be one of: ${VALID_TITLES.join(', ')}` });

    if (!b.specialization || !String(b.specialization).trim())
        errors.push({ field: 'specialization', message: 'Specialization is required' });

    if (b.yearsOfExperience === undefined || b.yearsOfExperience === null)
        errors.push({ field: 'yearsOfExperience', message: 'Years of experience is required' });
    else if (!Number.isInteger(Number(b.yearsOfExperience)) || Number(b.yearsOfExperience) < 0)
        errors.push({ field: 'yearsOfExperience', message: 'yearsOfExperience must be a non-negative integer' });

    if (!b.licenseNumber || !String(b.licenseNumber).trim())
        errors.push({ field: 'licenseNumber', message: 'License number is required' });

    if (b.consultationFee === undefined || b.consultationFee === null)
        errors.push({ field: 'consultationFee', message: 'Consultation fee is required' });
    else if (isNaN(Number(b.consultationFee)) || Number(b.consultationFee) < 0)
        errors.push({ field: 'consultationFee', message: 'consultationFee must be a non-negative number' });

    if (b.bio !== undefined && String(b.bio).length > 1000)
        errors.push({ field: 'bio', message: 'Bio must be under 1000 characters' });

    // phoneNumbers (optional on create, but validated if present)
    if (b.phoneNumbers !== undefined) {
        validatePhoneNumbers(b.phoneNumbers, errors);
    }

    if (b.education !== undefined) {
        if (!Array.isArray(b.education)) {
            errors.push({ field: 'education', message: 'education must be an array' });
        } else {
            b.education.forEach((e, i) => {
                if (!e.degree) errors.push({ field: `education[${i}].degree`, message: 'Degree is required' });
                if (!e.institution) errors.push({ field: `education[${i}].institution`, message: 'Institution is required' });
            });
        }
    }

    if (b.certifications !== undefined && !Array.isArray(b.certifications))
        errors.push({ field: 'certifications', message: 'certifications must be an array' });

    if (b.areasOfExpertise !== undefined && !Array.isArray(b.areasOfExpertise))
        errors.push({ field: 'areasOfExpertise', message: 'areasOfExpertise must be an array' });

    if (b.languagesSpoken !== undefined && !Array.isArray(b.languagesSpoken))
        errors.push({ field: 'languagesSpoken', message: 'languagesSpoken must be an array' });

    if (b.consultationTypes !== undefined) {
        if (typeof b.consultationTypes !== 'object' || Array.isArray(b.consultationTypes))
            errors.push({ field: 'consultationTypes', message: 'consultationTypes must be an object' });
        else {
            ['videoCall', 'audioCall', 'chat'].forEach(k => {
                if (b.consultationTypes[k] !== undefined && typeof b.consultationTypes[k] !== 'boolean')
                    errors.push({ field: `consultationTypes.${k}`, message: `${k} must be a boolean` });
            });
        }
    }

    if (b.emergencyAvailable !== undefined && typeof b.emergencyAvailable !== 'boolean')
        errors.push({ field: 'emergencyAvailable', message: 'emergencyAvailable must be a boolean' });

    if (errors.length) return fail(res, errors);
    next();
};

// ── PUT /api/doctors/profile ──────────────────────────────────────────────────
export const updateProfileValidator = (req, res, next) => {
    const errors = [];
    const b = req.body;

    if (b.firstName !== undefined && !String(b.firstName).trim())
        errors.push({ field: 'firstName', message: 'First name cannot be empty' });

    if (b.lastName !== undefined && !String(b.lastName).trim())
        errors.push({ field: 'lastName', message: 'Last name cannot be empty' });

    if (b.title !== undefined && !VALID_TITLES.includes(b.title))
        errors.push({ field: 'title', message: `title must be one of: ${VALID_TITLES.join(', ')}` });

    if (b.specialization !== undefined && !String(b.specialization).trim())
        errors.push({ field: 'specialization', message: 'Specialization cannot be empty' });

    if (b.yearsOfExperience !== undefined &&
        (!Number.isInteger(Number(b.yearsOfExperience)) || Number(b.yearsOfExperience) < 0))
        errors.push({ field: 'yearsOfExperience', message: 'yearsOfExperience must be a non-negative integer' });

    if (b.consultationFee !== undefined &&
        (isNaN(Number(b.consultationFee)) || Number(b.consultationFee) < 0))
        errors.push({ field: 'consultationFee', message: 'consultationFee must be a non-negative number' });

    if (b.bio !== undefined && String(b.bio).length > 1000)
        errors.push({ field: 'bio', message: 'Bio must be under 1000 characters' });

    // phoneNumbers (optional on update, but validated if present)
    if (b.phoneNumbers !== undefined) {
        validatePhoneNumbers(b.phoneNumbers, errors);
    }

    if (b.education !== undefined && !Array.isArray(b.education))
        errors.push({ field: 'education', message: 'education must be an array' });

    if (b.certifications !== undefined && !Array.isArray(b.certifications))
        errors.push({ field: 'certifications', message: 'certifications must be an array' });

    if (b.areasOfExpertise !== undefined && !Array.isArray(b.areasOfExpertise))
        errors.push({ field: 'areasOfExpertise', message: 'areasOfExpertise must be an array' });

    if (b.languagesSpoken !== undefined && !Array.isArray(b.languagesSpoken))
        errors.push({ field: 'languagesSpoken', message: 'languagesSpoken must be an array' });

    if (b.consultationTypes !== undefined) {
        if (typeof b.consultationTypes !== 'object' || Array.isArray(b.consultationTypes))
            errors.push({ field: 'consultationTypes', message: 'consultationTypes must be an object' });
        else {
            ['videoCall', 'audioCall', 'chat'].forEach(k => {
                if (b.consultationTypes[k] !== undefined && typeof b.consultationTypes[k] !== 'boolean')
                    errors.push({ field: `consultationTypes.${k}`, message: `${k} must be a boolean` });
            });
        }
    }

    if (b.emergencyAvailable !== undefined && typeof b.emergencyAvailable !== 'boolean')
        errors.push({ field: 'emergencyAvailable', message: 'emergencyAvailable must be a boolean' });

    if (errors.length) return fail(res, errors);
    next();
};

// ── PUT /api/doctors/availability ─────────────────────────────────────────────
export const availabilityValidator = (req, res, next) => {
    const errors = [];
    const { availability } = req.body;

    if (!Array.isArray(availability) || availability.length === 0) {
        errors.push({ field: 'availability', message: 'availability must be a non-empty array' });
        return fail(res, errors);
    }

    availability.forEach((entry, i) => {
        if (!VALID_DAYS.includes(entry.day))
            errors.push({ field: `availability[${i}].day`, message: `day must be one of: ${VALID_DAYS.join(', ')}` });

        if (!Array.isArray(entry.slots) || entry.slots.length === 0) {
            errors.push({ field: `availability[${i}].slots`, message: 'Each day must have at least one slot' });
        } else {
            entry.slots.forEach((slot, j) => {
                if (!slot.startTime || !timeRegex.test(slot.startTime))
                    errors.push({ field: `availability[${i}].slots[${j}].startTime`, message: 'startTime must be HH:MM format' });
                if (!slot.endTime || !timeRegex.test(slot.endTime))
                    errors.push({ field: `availability[${i}].slots[${j}].endTime`, message: 'endTime must be HH:MM format' });
            });
        }
    });

    if (errors.length) return fail(res, errors);
    next();
};

// ── GET /api/doctors (search query params) ────────────────────────────────────
export const searchValidator = (req, res, next) => {
    const errors = [];
    const q = req.query;

    if (q.consultationType !== undefined && !VALID_CONSULT_TYPES.includes(q.consultationType))
        errors.push({ field: 'consultationType', message: `consultationType must be one of: ${VALID_CONSULT_TYPES.join(', ')}` });

    if (q.minFee !== undefined && (isNaN(Number(q.minFee)) || Number(q.minFee) < 0))
        errors.push({ field: 'minFee', message: 'minFee must be a non-negative number' });

    if (q.maxFee !== undefined && (isNaN(Number(q.maxFee)) || Number(q.maxFee) < 0))
        errors.push({ field: 'maxFee', message: 'maxFee must be a non-negative number' });

    if (q.page !== undefined && (!Number.isInteger(Number(q.page)) || Number(q.page) < 1))
        errors.push({ field: 'page', message: 'page must be a positive integer' });

    if (q.limit !== undefined) {
        const l = Number(q.limit);
        if (!Number.isInteger(l) || l < 1 || l > 50)
            errors.push({ field: 'limit', message: 'limit must be an integer between 1 and 50' });
    }

    if (errors.length) return fail(res, errors);
    next();
};

// ── :id param validator ───────────────────────────────────────────────────────
export const mongoIdParam = (paramName = 'id') => (req, res, next) => {
    if (!OBJECT_ID_REGEX.test(req.params[paramName])) {
        return res.status(400).json({
            success: false,
            errors: [{ field: paramName, message: `${paramName} must be a valid MongoDB ObjectId` }],
        });
    }
    next();
};