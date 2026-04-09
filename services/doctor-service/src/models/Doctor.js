import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
    {
        degree: { type: String, required: true },
        institution: { type: String, required: true },
        year: { type: Number },
    },
    { _id: false }
);

const experienceSchema = new mongoose.Schema(
    {
        hospital: { type: String, required: true },
        role: { type: String, required: true },
        from: { type: Number, required: true },
        to: { type: Number },
        isCurrent: { type: Boolean, default: false },
    },
    { _id: false }
);

const slotSchema = new mongoose.Schema(
    {
        startTime: { type: String, required: true },   // "09:00"
        endTime: { type: String, required: true },     // "09:30"
    },
    { _id: false }
);

const availabilityDaySchema = new mongoose.Schema(
    {
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true,
        },
        slots: [slotSchema],
    },
    { _id: false }
);

const doctorSchema = new mongoose.Schema(
    {
        // Linked to auth-service user ID
        userId: { type: String, required: true, unique: true, index: true },

        // Basic Identity
        title: { type: String, enum: ['Dr.', 'Prof.', 'Assoc. Prof.'], default: 'Dr.' },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        profilePhoto: { type: String, default: null },
        specialization: { type: String, required: true, trim: true, index: true },
        yearsOfExperience: { type: Number, required: true, min: 0 },
        licenseNumber: { type: String, required: true, unique: true, trim: true },

        // Education & Qualifications
        education: [educationSchema],
        certifications: [{ type: String, trim: true }],

        // Professional Details
        currentHospital: { type: String, trim: true },
        experience: [experienceSchema],
        areasOfExpertise: [{ type: String, trim: true }],
        languagesSpoken: [{ type: String, trim: true }],
        bio: { type: String, maxlength: 1000 },

        // Consultation Info
        consultationFee: { type: Number, required: true, min: 0 },
        consultationTypes: {
            videoCall: { type: Boolean, default: true },
            audioCall: { type: Boolean, default: false },
            chat: { type: Boolean, default: false },
        },
        emergencyAvailable: { type: Boolean, default: false },

        // Weekly Availability Schedule
        availability: [availabilityDaySchema],

        // System Fields
        isActive: { type: Boolean, default: true },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        totalReviews: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

doctorSchema.virtual('fullName').get(function () {
    return `${this.title} ${this.firstName} ${this.lastName}`;
});

// Full-text search index
doctorSchema.index(
    { firstName: 'text', lastName: 'text', specialization: 'text', areasOfExpertise: 'text' },
    { name: 'doctor_search_text' }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);