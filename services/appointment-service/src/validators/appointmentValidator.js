// ─ Shared constants ─
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'expired'];

// ─ Helpers ─

// Normalize incoming date strings to UTC — same helper as in controller
const toUTC = (dateStr) => new Date(new Date(dateStr).toISOString());

/**
 * Validates the request body for booking a new appointment.
 * Returns parsed fee alongside validation result so controller
 * doesn't need to re-parse it.
 */
export const validateBookAppointment = ({
    doctorId,
    doctorFullName,
    specialty,
    consultationFee,
    appointmentDate,
    timeSlot,
    reason,
    patientPhone,
} = {}) => {
    const errors = [];

    // Required fields
    if (!doctorId) errors.push('doctorId is required.');
    if (!doctorFullName) errors.push('doctorFullName is required.');
    if (!specialty) errors.push('specialty is required.');
    if (!consultationFee) errors.push('consultationFee is required.');
    if (!appointmentDate) errors.push('appointmentDate is required.');
    if (!timeSlot) errors.push('timeSlot is required.');
    if (!reason) errors.push('reason is required.');
    if (!patientPhone) errors.push('patientPhone is required.');

    // Early return — no point checking further if required fields are missing
    if (errors.length > 0) return { valid: false, errors, fee: null };

    // consultationFee — parse to handle both number and string input
    const fee = Number(consultationFee);
    if (isNaN(fee) || fee <= 0)
        errors.push('consultationFee must be a positive number.');

    // appointmentDate — must be in the future
    if (toUTC(appointmentDate) <= new Date())
        errors.push('Appointment date must be in the future.');

    return { valid: errors.length === 0, errors, fee };
};

/**
 * Validates the request body for rescheduling an appointment.
 */
export const validateRescheduleAppointment = ({
    appointmentDate,
    timeSlot,
} = {}) => {
    const errors = [];

    if (!appointmentDate) errors.push('New appointmentDate is required.');
    if (!timeSlot) errors.push('New timeSlot is required.');

    // Early return — no point checking date if it's missing
    if (errors.length > 0) return { valid: false, errors };

    // appointmentDate — must be in the future
    if (toUTC(appointmentDate) <= new Date())
        errors.push('Appointment date must be in the future.');

    return { valid: errors.length === 0, errors };
};

/**
 * Validates the status query param for getAllAppointments.
 */
export const validateStatusQuery = (status) => {
    if (status && !VALID_STATUSES.includes(status)) {
        return {
            valid: false,
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        };
    }
    return { valid: true, error: null };
};