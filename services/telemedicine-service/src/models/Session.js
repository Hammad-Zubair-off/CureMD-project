import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    required: true,
    unique: true,   // one session per appointment
  },
  channelName: {
    type: String,
    required: true,
    unique: true,
  },
  doctorId: {
    type: String,
    required: true,
  },
  patientId: {
    type: String,
    required: true,
  },
  // Session lifecycle: created → active → ended
  status: {
    type: String,
    enum: ['created', 'active', 'ended'],
    default: 'created',
  },
  startedAt: { type: Date },
  endedAt:   { type: Date },
  durationMinutes: { type: Number },

  // Agora token for the doctor (UID 1 = doctor by convention)
  doctorToken: { type: String },
  // Agora token for the patient (UID 2 = patient by convention)
  patientToken: { type: String },

  // Join link sent to patient
  patientJoinUrl: { type: String },
}, {
  timestamps: true,
});

export const Session = mongoose.model('Session', sessionSchema);