import createServiceClient from './serviceClient.js';

const SERVICES = {
    appointment: {
        name: 'appointment-service',
        baseURL: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004',
        endpoints: {
            confirm: (id) => `/api/appointments/${id}/confirm`,
            getById: (id) => `/api/appointments/${id}`,
        },
    },
};

// Pre-built client — import in paymentController.js for webhook handling
export const appointmentClient = createServiceClient(
    SERVICES.appointment.name,
    SERVICES.appointment.baseURL
);

export default SERVICES;