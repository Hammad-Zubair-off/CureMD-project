import api from "./api";

const authService = {
    register: async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Login user
    login: async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Logout user
    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    },

    // Get current user
    getMe: async () => {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Verify token validity
    verifyToken: async () => {
        try {
            const response = await api.get('/auth/verify');
            return response.data.success === true;
        } catch (error) {
            return false;
        }
    },

    // Change password
    changePassword: async (currentPassword, newPassword) => {
        try {
            const response = await api.put('/auth/change-password', { currentPassword, newPassword });
            // If the server returns a new token, update it in storage
            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
            }
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Self-deactivate account
    deactivateMyAccount: async (currentPassword) => {
        try {
            const response = await api.put('/auth/deactivate-account', { currentPassword });
            return response.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    },

    // Admin endpoints
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
};

export default authService;