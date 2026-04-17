import api from './api.js';

const prescriptionService = {
    /**
     * Create or update the draft prescription for a session.
     * Safe to call multiple times — upserts on appointmentId.
     */
    save: (payload) =>
        api.post('/doctors/prescriptions', payload).then(r => r.data.data),

    /**
     * Finalise and issue the prescription to the patient.
     */
    issue: (prescriptionId) =>
        api.post(`/doctors/prescriptions/${prescriptionId}/issue`).then(r => r.data.data),

    /**
     * Fetch existing draft/issued prescription for a given appointment.
     * Returns null if none exists yet.
     */
    getByAppointment: (appointmentId) =>
        api.get(`/doctors/prescriptions/appointment/${appointmentId}`)
            .then(r => r.data.data)
            .catch(err => {
                if (err.response?.status === 404) return null;
                throw err;
            }),

    /**
     * All issued prescriptions for a patient.
     */
    getByPatient: (patientId) =>
        api.get(`/doctors/prescriptions/patient/${patientId}`).then(r => r.data.data),
};

export default prescriptionService;