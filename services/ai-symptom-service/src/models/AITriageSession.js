import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'ai'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const aiTriageSessionSchema = new mongoose.Schema(
  {
    // Which patient owns this session
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // The AI's running memory of the conversation.
    // Updated after every message — never grows the context window.
    rollingSummary: {
      type: String,
      default: 'Patient initiated a new symptom check.',
    },

    // Full message history for UI rendering
    messages: [messageSchema],

    // Latest triage assessment from the AI.
    // isEmergency: true → frontend blocks further chat and shows emergency alert.
    // Frontend is responsible for acting on this — backend just stores it.
    triageOutcome: {
      isEmergency: { type: Boolean, default: false },
      triageLevel: { type: String, enum: ['Pending', 'Routine', 'Urgent', 'Emergency'], default: 'Pending' },
      suggestedDepartment: { type: String, default: null },
    },

    // Optional title — set on creation if patient provides one,
    // otherwise defaults to the date. Used in the sessions list UI.
    title: {
      type: String,
      default: null,
    },
  },
  { timestamps: true } // createdAt = session start, updatedAt = last message
);

// Index for fast patient session lookups sorted by latest activity
aiTriageSessionSchema.index({ patientId: 1, updatedAt: -1 });

export default mongoose.model('AITriageSession', aiTriageSessionSchema);