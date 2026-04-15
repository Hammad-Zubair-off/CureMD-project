import api from './api';

const aiService = {
  // Get all previous sessions (Returns summary view)
  getAllSessions: async () => {
    const response = await api.get('/ai/sessions');
    return response.data;
  },

  // Get a specific session with full message history
  getSessionById: async (sessionId) => {
    const response = await api.get(`/ai/sessions/${sessionId}`);
    return response.data;
  },

  // Create a new session (Optional payload: { title, vitals })
  createSession: async (payload = {}) => {
    const response = await api.post('/ai/sessions', payload);
    return response.data;
  },

  // Send a message to a specific session
  sendMessage: async (sessionId, payload) => {
    // payload expects: { message: string, selectedReports: array }
    const response = await api.post(`/ai/sessions/${sessionId}/message`, payload);
    return response.data;
  },

  // Delete a specific session
  deleteSession: async (sessionId) => {
    const response = await api.delete(`/ai/sessions/${sessionId}`);
    return response.data;
  }
};

export default aiService;