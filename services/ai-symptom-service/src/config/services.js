import createServiceClient from './serviceClient.js';

const SERVICES = {
    doctor: {
        name: 'doctor-service',
        baseURL: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3003',
        endpoints: {
            getById: (id) => `/api/doctors/${id}`,
            getAvailability: (id) => `/api/doctors/${id}/availability`,
        },
    },
};

// Pre-built client
export const doctorClient = createServiceClient(
    SERVICES.doctor.name,
    SERVICES.doctor.baseURL
);

export default SERVICES;