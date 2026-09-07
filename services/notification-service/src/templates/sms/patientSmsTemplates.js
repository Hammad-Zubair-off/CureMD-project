const formatAppointmentDate = (appointmentDate) => {
    try {
        return new Date(appointmentDate).toLocaleDateString('en-US', {
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
    return `CureMD: Appointment booked with ${doctorFullName} on ${date} at ${timeSlot}. Ref: ${appointmentId}.`;
};

export const appointmentConfirmedPatientSms = ({
    appointmentId,
    doctorFullName,
    appointmentDate,
    timeSlot,
}) => {
    const date = formatAppointmentDate(appointmentDate);
    return `CureMD: Payment confirmed. Your appointment with ${doctorFullName} is confirmed for ${date} at ${timeSlot}. Ref: ${appointmentId}.`;
};

export const consultationCompletedPatientSms = ({
    appointmentId,
    doctorFullName,
    appointmentDate,
    timeSlot,
}) => {
    const date = formatAppointmentDate(appointmentDate);
    return `CureMD: Consultation completed with ${doctorFullName} (${date} ${timeSlot}). Thank you. Ref: ${appointmentId}.`;
};

export const appointmentRescheduledPatientSms = ({
    appointmentId,
    doctorFullName,
    appointmentDate,
    timeSlot,
}) => {
    const date = formatAppointmentDate(appointmentDate);
    return `CureMD: Your appointment with ${doctorFullName} has been rescheduled to ${date} at ${timeSlot}. Ref: ${appointmentId}.`;
};
