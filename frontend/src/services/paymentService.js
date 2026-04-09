import api from './api';

const paymentService = {
    createPaymentIntent: async (appointmentId) => {
        try {
            const response = await api.post('/payments/create-intent', { appointmentId });
            //console.log('Payment intent created:', response.data);
            return response.data;

        } catch (error) {
            throw error.response?.data || error;
        }
    },

    confirmPayment: async (paymentIntentId) => {
        try {
            const response = await api.post('/payments/confirm-payment', { paymentIntentId });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    getPaymentByAppointment: async (appointmentId) => {
        try {
            const response = await api.get(`/payments/appointment/${appointmentId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default paymentService;