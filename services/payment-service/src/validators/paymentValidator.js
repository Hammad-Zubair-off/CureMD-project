export const validateCreatePaymentIntent = ({ appointmentId } = {}) => {
    const errors = [];

    if (!appointmentId || typeof appointmentId !== 'string' || !appointmentId.trim()) {
        errors.push('appointmentId is required.');
    }

    return { valid: errors.length === 0, errors };
};