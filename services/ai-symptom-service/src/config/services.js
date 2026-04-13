import createServiceClient from './serviceClient.js';

const SERVICES = {
    patient: {
        name: 'patient-service',
        baseURL: process.env.PATIENT_SERVICE_URL || 'http://patient-service:3002',
        endpoints: {
            // Fetches anonymized medical history using the 1-hour AI token
            // Token is forwarded as-is from the frontend — patient-service
            // validates it via verifyHistoryToken middleware
            historyForAI: () => `/api/patients/history/ai`,
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

// Pre-built client
export const patientClient = createServiceClient(
    SERVICES.patient.name,
    SERVICES.patient.baseURL
);

export const doctorClient = createServiceClient(
    SERVICES.doctor.name,
    SERVICES.doctor.baseURL
);

export default SERVICES;