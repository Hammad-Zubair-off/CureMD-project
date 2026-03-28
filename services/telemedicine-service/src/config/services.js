import createServiceClient from './serviceClient.js';

const SERVICES = {
    appointment: {
        name:    'appointment-service',
        baseURL: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004',
        endpoints: {
            getById: (id) => `/api/appointments/${id}`,
        },
    },
};

export const appointmentClient = createServiceClient(
    SERVICES.appointment.name,
    SERVICES.appointment.baseURL
);

export default SERVICES;