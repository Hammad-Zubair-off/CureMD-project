const VALID_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_GENDERS = ['Male', 'Female', 'Other'];
const VALID_SHARING_MODES = ['MINIMAL', 'FULL'];
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

// Reusable helpers

const validateDOB = (dateOfBirth, errors) => {
    if (!dateOfBirth) { errors.push('Date of birth is required.'); return; }
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) errors.push('Date of birth must be a valid date.');
    else if (dob >= new Date()) errors.push('Date of birth must be in the past.');
};

const validatePhone = (phone, fieldName, errors) => {
    if (phone && !PHONE_REGEX.test(phone.trim()))
        errors.push(`${fieldName} must be 7–15 digits and may start with +.`);
};

// Booking wall

export const validateBookingProfile = ({
    dateOfBirth, gender, contactNumber, bloodType, emergencyContact,
} = {}) => {
    const errors = [];

    validateDOB(dateOfBirth, errors);

    if (!gender) errors.push('Gender is required.');
    else if (!VALID_GENDERS.includes(gender))
        errors.push(`Gender must be one of: ${VALID_GENDERS.join(', ')}.`);

    if (!contactNumber) errors.push('Contact number is required.');
    else validatePhone(contactNumber, 'Contact number', errors);

    if (!bloodType) errors.push('Blood type is required.');
    else if (!VALID_BLOOD_TYPES.includes(bloodType))
        errors.push(`Blood type must be one of: ${VALID_BLOOD_TYPES.join(', ')}.`);

    if (!emergencyContact) {
        errors.push('Emergency contact is required.');
    } else {
        const { name, phone, relationship } = emergencyContact;
        if (!name?.trim()) errors.push('Emergency contact name is required.');
        if (!phone?.trim()) errors.push('Emergency contact phone is required.');
        if (!relationship?.trim()) errors.push('Emergency contact relationship is required.');
        if (phone) validatePhone(phone, 'Emergency contact phone', errors);
    }

    return { valid: errors.length === 0, errors };
};

// Profile update

export const validateProfileUpdate = (body = {}) => {
    const errors = [];
    const { bloodType, height, weight, contactNumber, dateOfBirth, gender, emergencyContact } = body;

    if (dateOfBirth !== undefined) validateDOB(dateOfBirth, errors);
    if (gender !== undefined && !VALID_GENDERS.includes(gender))
        errors.push(`Gender must be one of: ${VALID_GENDERS.join(', ')}.`);
    if (contactNumber !== undefined) validatePhone(contactNumber, 'Contact number', errors);
    if (bloodType !== undefined && !VALID_BLOOD_TYPES.includes(bloodType))
        errors.push(`Blood type must be one of: ${VALID_BLOOD_TYPES.join(', ')}.`);
    if (height !== undefined) {
        const h = Number(height);
        if (isNaN(h) || h < 50 || h > 300) errors.push('Height must be between 50 and 300 cm.');
    }
    if (weight !== undefined) {
        const w = Number(weight);
        if (isNaN(w) || w < 1 || w > 500) errors.push('Weight must be between 1 and 500 kg.');
    }
    if (emergencyContact?.phone) validatePhone(emergencyContact.phone, 'Emergency contact phone', errors);

    return { valid: errors.length === 0, errors };
};

// Snapshot request

/**
 * sharingMode:
 *   'MINIMAL' → basic stats only, no reports
 *   'FULL'    → basic stats + all Cloudinary report URLs, 24h history access
 *
 * appointmentId required — links snapshot to the appointment that triggered it.
 */
export const validateSnapshotRequest = ({ sharingMode, appointmentId } = {}) => {
    const errors = [];

    if (!sharingMode)
        errors.push(`sharingMode is required. Must be one of: ${VALID_SHARING_MODES.join(', ')}.`);
    else if (!VALID_SHARING_MODES.includes(sharingMode))
        errors.push(`sharingMode must be one of: ${VALID_SHARING_MODES.join(', ')}.`);

    if (!appointmentId) errors.push('appointmentId is required.');

    return { valid: errors.length === 0, errors };
};