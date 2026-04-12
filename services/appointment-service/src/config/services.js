import createServiceClient from './serviceClient.js';

const SERVICES = {
    patient: {
        name:    'patient-service',
        baseURL: process.env.PATIENT_SERVICE_URL || 'http://patient-service:3002',
        endpoints: {
            createSnapshot:  ()   => `/api/patients/snapshot`,
            confirmSnapshot: (id) => `/api/patients/snapshot/${id}/confirm`,
        },
    },
    doctor: {
        name: 'doctor-service',
        baseURL: process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3003',
        endpoints: {
            getById: (id) => `/api/doctors/${id}`,
            getAvailability: (id) => `/api/doctors/${id}/availability`,
        },
    },
};

// Pre-built client — import in controllers that need Method 3

export const patientClient = createServiceClient(
    SERVICES.patient.name,
    SERVICES.patient.baseURL
);

export const doctorClient = createServiceClient(
    SERVICES.doctor.name,
    SERVICES.doctor.baseURL
);

export default SERVICES;