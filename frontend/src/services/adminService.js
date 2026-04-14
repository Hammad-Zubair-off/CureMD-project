import api from './api';

const adminService = {
    // USER MANAGEMENT

    /**
     * Get all users with optional filters
     * @param {Object} params - Query parameters (page, limit, role, status, search, etc.)
     */
    getAllUsers: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await api.get(`/auth/admin/users?${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    getUserById: async (id) => {
        try {
            const response = await api.get(`/auth/admin/users/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    approveDoctor: async (id) => {
        try {
            const response = await api.put(`/auth/admin/users/${id}/approve`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    rejectDoctor: async (id) => {
        try {
            const response = await api.put(`/auth/admin/users/${id}/reject`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    activateUser: async (id) => {
        try {
            const response = await api.put(`/auth/admin/users/${id}/activate`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    deactivateUser: async (id) => {
        try {
            const response = await api.put(`/auth/admin/users/${id}/deactivate`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    deleteUser: async (id) => {
        try {
            const response = await api.delete(`/auth/admin/users/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    createAdmin: async (userData) => {
        try {
            const response = await api.post('/auth/superadmin/create-admin', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    deleteAdmin: async (id) => {
        try {
            const response = await api.delete(`/auth/superadmin/admins/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // DOCTOR MANAGEMENT 
    getAllDoctors: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await api.get(`/doctors/admin/all?${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // PAYMENT / FINANCE MANAGEMENT 

    getAllPayments: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const response = await api.get(`/payments/admin/all?${query}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    refundPayment: async (paymentId) => {
        try {
            const response = await api.post(`/payments/${paymentId}/refund`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },
};

export default adminService;