import api from './api';

const patientService = {

  // ── Profile ───────────────────────────────────────────────────────────────

  /**
   * Get the logged-in patient's profile.
   * Returns bookingProfileComplete flag — frontend uses this to decide
   * whether to show the booking wall or go straight to the dashboard.
   * Called on every login and before opening the booking form.
   */
  getMyProfile: async () => {
    try {
      const response = await api.get('/patients/me');
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Save the required booking wall fields for the first time.
   * Required: dateOfBirth, gender, contactNumber, bloodType, emergencyContact.
   * Called when patient hits the booking wall before their first appointment.
   */
  saveBookingProfile: async (payload) => {
    try {
      const response = await api.post('/patients/profile', payload);
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Update optional profile fields from the dashboard settings page.
   * Optional fields: height, weight, allergies, currentMedications,
   * chronicConditions, address, emergencyContact updates.
   * Can also update required fields (re-validates on save).
   */
  updateProfile: async (payload) => {
    try {
      const response = await api.put('/patients/me', payload);
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Upload a profile picture to Cloudinary.
   * Payload must be a FormData object containing the 'image' file.
   */
  uploadProfilePicture: async (formData) => {
    try {
      const response = await api.post('/patients/me/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  // ── Snapshots ─────────────────────────────────────────────────────────────

  /**
   * Get all confirmed snapshots for the logged-in patient.
   * Called before opening the booking form to check whether the patient
   * has any medical history — used to enable or disable sharing options.
   * If total === 0 or no medical data exists, sharing options are disabled.
   */
  getMySnapshots: async () => {
    try {
      const response = await api.get('/patients/snapshots/my');
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Get a single snapshot by ID.
   * Called by the patient to view what was shared for a specific appointment.
   * Also called by the doctor's frontend to view the patient's medical data
   * for an appointment (doctor JWT is used automatically via api interceptor).
   */
  getSnapshotById: async (snapshotId) => {
    try {
      const response = await api.get(`/patients/snapshot/${snapshotId}`);
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  // ── Medical Reports ───────────────────────────────────────────────────────

  /**
   * Upload a medical report file to Cloudinary.
   * Payload must be a FormData object containing 'file' (the file), 
   * 'title' (string), and 'category' (enum string).
   */
  uploadReport: async (formData) => {
    try {
      const response = await api.post('/patients/reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Get all active medical reports for the logged-in patient.
   */
  getMyReports: async () => {
    try {
      const response = await api.get('/patients/reports/my');
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Get a specific medical report by its ID.
   * Accessible by patient (own), authorized doctor, or admin.
   */
  getReportById: async (reportId) => {
    try {
      const response = await api.get(`/patients/reports/${reportId}`);
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Soft delete (archive) a medical report.
   * Only the patient who owns the report can do this.
   */
  archiveReport: async (reportId) => {
    try {
      const response = await api.patch(`/patients/reports/${reportId}/archive`);
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  // ── Medical History & AI ──────────────────────────────────────────────────

  /**
   * Generate a 1-hour history token for AI access.
   * Called when the patient opens the AI chat.
   * The returned token is passed to the AI service — not used as a standard JWT.
   */
  generateHistoryToken: async () => {
    try {
      const response = await api.post('/patients/history-token');
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Get the patient's full medical history for a doctor (24-hour window).
   * Called when a doctor clicks "View Full History" on an appointment
   * where the patient chose sharingMode: 'full_history_24h'.
   * The 24h clock starts on the first call — subsequent calls within
   * 24h return the same data without re-verifying the appointment.
   */
  getDoctorHistory: async (patientId, appointmentId) => {
    try {
      const response = await api.get(
        `/patients/history/doctor/${patientId}?appointmentId=${appointmentId}`
      );
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Get a single snapshot by ID.
   * Doctor JWT is forwarded automatically via api interceptor.
   */
  getSnapshotById: async (snapshotId) => {
    try {
      const response = await api.get(`/patients/snapshot/${snapshotId}`);
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

  /**
   * Get full 24h history for a doctor.
   * Called when patient chose sharingMode: 'FULL'.
   */
  getDoctorHistory: async (patientId, appointmentId) => {
    try {
      const response = await api.get(
        `/patients/history/doctor/${patientId}?appointmentId=${appointmentId}`
      );
      return response.data;
    } catch (error) {
      const errData = error.response?.data;
      throw errData || { error: error.message || 'Something went wrong.' };
    }
  },

};

export default patientService;