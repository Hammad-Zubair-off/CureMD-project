import mongoose from 'mongoose';

/**
 * MedicalReport
 *
 * One document per uploaded file. Lives in patient-db.
 * File is stored in Cloudinary — this document stores the reference.
 *
 * Linked to Patient via userId (query by userId to get all reports).
 * Linked to MedicalHistorySnapshot via snapshot.medicalReports[] (array of ObjectIds).
 *
 * publicId is required to delete the file from Cloudinary.
 * fileUrl is the permanent secure Cloudinary URL used for display/download.
 */
const medicalReportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        title: {
            type: String,
            required: [true, 'Report title is required'],
            trim: true,
            maxlength: [100, 'Title must not exceed 100 characters'],
        },

        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: {
                values: ['Lab Result', 'X-Ray', 'Prescription', 'Other'],
                message: 'Category must be Lab Result, X-Ray, Prescription, or Other',
            },
        },

        // Cloudinary permanent secure URL — used for display and download
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
        },

        // Cloudinary public ID — required to delete the file from Cloudinary
        publicId: {
            type: String,
            required: [true, 'Cloudinary public ID is required'],
        },

        // Original file name and type — stored for display purposes
        originalName: {
            type: String,
            default: null,
        },
        mimeType: {
            type: String,
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true, // Adding an index here is good for read performance since we'll query by it often
        }
    },
    { timestamps: true }
);

const MedicalReport = mongoose.model('MedicalReport', medicalReportSchema);
export default MedicalReport;
