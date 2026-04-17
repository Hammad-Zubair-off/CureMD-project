import api from './api';

const telemedicineService = {
  // Creates session and returns { channelName, token, agoraAppId, uid, sessionId, patientJoinUrl }
  createSession: async (appointmentId, patientId) => {
    const response = await api.post('/telemedicine/session/create', {
      appointmentId,
      patientId,
    });
    return response.data.data;
  },

  markActive: async (sessionId) => {
    const response = await api.patch(`/telemedicine/session/${sessionId}/start`);
    return response.data;
  },

  endSession: async (sessionId) => {
    const response = await api.patch(`/telemedicine/session/${sessionId}/end`);
    return response.data;
  },

  getSessionByAppointment: async (appointmentId) => {
    const response = await api.get(`/telemedicine/session/appointment/${appointmentId}`);
    return response.data;
  },

  // Join data for current logged user (doctor or patient)
  getSessionJoinDataByAppointment: async (appointmentId) => {
    const response = await api.get(`/telemedicine/session/appointment/${appointmentId}`);
    return response.data.data;
  },
};

export default telemedicineService;