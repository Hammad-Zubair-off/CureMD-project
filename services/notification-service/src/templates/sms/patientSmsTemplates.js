const formatAppointmentDate = (appointmentDate) => {
    try {
        return new Date(appointmentDate).toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return String(appointmentDate || '');
    }
};

export const appointmentCreatedPatientSms = ({
    appointmentId,
    doctorFullName,
    appointmentDate,
    timeSlot,
}) => {
    const date = formatAppointmentDate(appointmentDate);
    return `MediCare: Appointment booked with ${doctorFullName} on ${date} at ${timeSlot}. Ref: ${appointmentId}.`;
};

export const appointmentConfirmedPatientSms = ({
    appointmentId,
    doctorFullName,
    appointmentDate,
    timeSlot,
}) => {
    const date = formatAppointmentDate(appointmentDate);
    return `MediCare: Payment confirmed. Your appointment with ${doctorFullName} is confirmed for ${date} at ${timeSlot}. Ref: ${appointmentId}.`;
};

export const consultationCompletedPatientSms = ({
    appointmentId,
    doctorFullName,
    appointmentDate,
    timeSlot,
}) => {
    const date = formatAppointmentDate(appointmentDate);
    return `MediCare: Consultation completed with ${doctorFullName} (${date} ${timeSlot}). Thank you. Ref: ${appointmentId}.`;
};