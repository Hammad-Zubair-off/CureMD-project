import axios from 'axios';

const api = axios.create({
  //baseURL: import.meta.env.VITE_API_URL || 'http://localhost:80/api',
  baseURL: '/api',
  // 45s, not 15s: a single request can chain through multiple backend
  // services (gateway -> appointment-service -> patient-service for a
  // medical-history snapshot, etc), each independently able to be a cold
  // Render free-tier instance taking 20-30s+ to wake. 15s was aborting
  // valid in-flight requests before the backend ever got to respond.
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
  //withCredentials: true,
});

// Request interceptor - Add JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api