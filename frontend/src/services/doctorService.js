import api from './api.js';

const doctorService = {
    // Profile settings

    createProfile: async (profileData) => {
        const res = await api.post('/doctors/profile', profileData);
        return res.data;
    },

    getMyProfile: async () => {
        const res = await api.get('/doctors/profile/me');
        return res.data; // { success, data: doctor }
    },

    updateProfile: async (profileData) => {
        const res = await api.put('/doctors/profile', profileData);
        return res.data;
    },

    // Availability management

    getMyAvailability: async () => {
        const res = await api.get('/doctors/availability/me');
        return res.data; // { success, data: doctor } — availability is in data.availability
    },

    setAvailability: async (availabilityData) => {
        const res = await api.put('/doctors/availability', availabilityData);
        return res.data;
    },

    // Public lookups

    searchDoctors: async (params) => {
        const res = await api.get('/doctors', { params });
        return res.data;
    },

    getDoctorById: async (id) => {
        const res = await api.get(`/doctors/${id}`);
        return res.data;
    },

    getDoctorAvailability: async (id) => {
        const res = await api.get(`/doctors/${id}/availability`);
        return res.data;
    },

    getSpecializations: async () => {
        const res = await api.get('/doctors/specializations');
        return res.data;
    },
};

export default doctorService;