import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
    {
        // Links to the User document in auth-service (auth-db)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, 'userId is required'],
            unique: true,
        },

        // Onboarding (required to use the app)
        dateOfBirth: {
            type: Date,
            default: null,
        },
        gender: {
            type: String,
            enum: {
                values: ['Male', 'Female', 'Other'],
                message: 'Gender must be Male, Female, or Other',
            },
            default: null,
        },
        contactNumber: {
            type: String,
            trim: true,
            default: null,
        },

        // Frontend reads this on every login:
        // false → show onboarding screen
        // true  → go to dashboard
        bookingProfileComplete: {
            type: Boolean,
            default: false,
        },

        // STAGE 3: Profile Settings (optional, filled later)
        address: {
            type: String,
            trim: true,
            default: null,
        },
        bloodType: {
            type: String,
            enum: {
                values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
                message: 'Invalid blood type',
            },
            default: null,
        },
        height: { type: Number, min: [50, 'Min 50 cm'], max: [300, 'Max 300 cm'], default: null }, // cm
        weight: { type: Number, min: [1, 'Min 1 kg'], max: [500, 'Max 500 kg'], default: null }, // kg

        allergies: { type: [String], default: [] },
        currentMedications: { type: [String], default: [] },
        chronicConditions: { type: [String], default: [] },

        emergencyContact: {
            name: { type: String, trim: true, default: null },
            phone: { type: String, trim: true, default: null },
            relationship: { type: String, trim: true, default: null },
        },

        // File URLs stored after upload (multer/S3 handled separately)
        medicalReports: [
            {
                title: { type: String, required: true },
                fileUrl: { type: String, required: true },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

// Calculated from dateOfBirth at read time — never stored in DB
patientSchema.virtual('age').get(function () {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
});

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
