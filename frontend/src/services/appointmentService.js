import api from './api';

const appointmentService = {

    /**
     * Create a new appointment
     * Called in BookingDrawer — Step 1
     */
    createAppointment: async (payload) => {
        try {
            const response = await api.post('/appointments', payload);
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Confirm appointment after payment
     * Called in BookingDrawer — Step 2 (simulated payment)
     */
    confirmAppointment: async (appointmentId, paymentId) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/confirm`, { paymentId });
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Confirm appointment without payment (local dev only)
     */
    skipPayment: async (appointmentId) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/skip-payment`);
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Get all appointments for the logged-in patient
     * Called in MyAppointments
     */
    getMyAppointments: async (page = 1, limit = 10, tab = 'upcoming') => {
        try {
            const response = await api.get(`/appointments/my?page=${page}&limit=${limit}&tab=${tab}`);
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Cancel an appointment
     * Called in MyAppointments
     */
    cancelAppointment: async (appointmentId) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/cancel`);
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Reschedule an appointment
     * Called in MyAppointments
     */
    rescheduleAppointment: async (appointmentId, appointmentDate, timeSlot) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/reschedule`, {
                appointmentDate,
                timeSlot,
            });
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },


    /**
     * Get all appointments booked on the logged-in doctor
     * Called in DoctorAppointments
     */
    getDoctorAppointments: async (page = 1, limit = 10) => {
        try {
            const response = await api.get(`/appointments/doctor?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    rejectAppointment: async (appointmentId, reason) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/reject`, { reason });
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Mark a confirmed appointment as completed
     * Called by the doctor after a consultation is finished
     */
    markCompleted: async (appointmentId, notes) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/status`, { notes });
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

    /**
     * Get a single appointment by ID
     * Called in MedicalHistory (snapshot linked appointment context)
     */
    getAppointmentById: async (appointmentId) => {
        try {
            const response = await api.get(`/appointments/${appointmentId}`);
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

        /**
     * Get taken slots for a doctor on a specific date
     * Used by booking flow to disable already booked slots
     */
    getTakenSlots: async (doctorId, dateIso) => {
        try {
            const response = await api.get(
                `/appointments/availability?doctorId=${doctorId}&date=${encodeURIComponent(dateIso)}`
            );
            return response.data;
        } catch (error) {
            const errData = error.response?.data;
            throw errData || { error: error.message || 'Something went wrong.' };
        }
    },

};

export default appointmentService;