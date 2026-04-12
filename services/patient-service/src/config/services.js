import createServiceClient from './serviceClient.js';

/**
 * patient-service only needs to call appointment-service.
 * Used in snapshotController.getHistoryForDoctor (Method 3) to verify
 * that the requesting doctor actually has a 'full_history_24h' appointment
 * with the patient before granting 24h history access.
 *
 * patient-service NEVER calls doctor-service — the frontend handles that
 * by forwarding the doctor's JWT directly (Method 1).
 */
const SERVICES = {
    appointment: {
        name:    'appointment-service',
        baseURL: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004',
        endpoints: {
            // Used by getHistoryForDoctor to verify sharingMode and doctorId
            getById: (id) => `/api/appointments/${id}`,
        },
    },
};

// Pre-built client — import in controllers that need Method 3
export const appointmentClient = createServiceClient(
    SERVICES.appointment.name,
    SERVICES.appointment.baseURL
);

export default SERVICES;