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
            throw error.response?.data || error;
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
            throw error.response?.data || error;
        }
    },

    /**
     * Get all appointments for the logged-in patient
     * Called in MyAppointments
     */
    getMyAppointments: async (page = 1, limit = 10) => {
        try {
            const response = await api.get(`/appointments/my?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
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
            throw error.response?.data || error;
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
            throw error.response?.data || error;
        }
    },
};

export default appointmentService;