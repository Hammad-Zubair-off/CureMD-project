import streamifier from 'streamifier';
import cloudinary from '../config/cloudinary.js';
import MedicalReport from '../models/MedicalReport.js';
import { logger } from '../utils/logger.js';

// Helpers

/**
 * Streams a buffer to Cloudinary and returns the upload result.
 * Uses streamifier to avoid writing to disk.
 */
const streamUploadToCloudinary = (buffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

// Controllers

/**
 * @desc    Upload a medical report file to Cloudinary and save the reference.
 *          File is streamed directly from memory to Cloudinary — never touches disk.
 *          Saves { title, category, fileUrl, publicId, originalName, mimeType }
 *          to the MedicalReport collection.
 *
 * @route   POST /api/patients/reports/upload
 * @access  Private — patient
 */
export const uploadReport = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded. Please select a file.',
            });
        }

        const { title, category } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Report title is required.',
            });
        }

        const VALID_CATEGORIES = ['Lab Result', 'X-Ray', 'Prescription', 'Other'];
        if (!category || !VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}.`,
            });
        }

        // Determine resource type for Cloudinary
        // PDFs must be uploaded as 'raw', images as 'image'
        const isPDF = req.file.mimetype === 'application/pdf';
        const resourceType = isPDF ? 'raw' : 'image';

        // Upload to Cloudinary — stream from buffer
        const uploadResult = await streamUploadToCloudinary(req.file.buffer, {
            folder: `healthcare/patients/${req.user.id}/reports`,
            resource_type: resourceType,
            // Use the original filename (sanitised) as the public_id suffix
            public_id: `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`,
        });

        // Save reference to DB
        const report = await MedicalReport.create({
            userId: req.user.id,
            title: title.trim(),
            category,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
        });

        logger.success(`[patient-service] Report uploaded: ${report._id} | patient: ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: 'Report uploaded successfully.',
            report,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all medical reports for the logged-in patient.
 *          Sorted newest first.
 *
 * @route   GET /api/patients/reports/my
 * @access  Private — patient
 */
export const getMyReports = async (req, res, next) => {
    try {
        const reports = await MedicalReport.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            total: reports.length,
            reports,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get a single report by ID.
 *          Patient can only access their own reports.
 *          Doctor can access reports that are referenced in a snapshot
 *          linked to their appointment (enforced at the snapshot level —
 *          this endpoint trusts that the doctor already passed snapshot access).
 *
 * @route   GET /api/patients/reports/:reportId
 * @access  Private — patient (own), doctor, admin
 */
export const getReportById = async (req, res, next) => {
    try {
        const report = await MedicalReport.findById(req.params.reportId);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Report not found.',
            });
        }

        // Patient can only access their own reports
        if (req.user.role === 'patient' && report.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to view this report.',
            });
        }

        res.status(200).json({ success: true, report });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Soft delete a medical report — hides it from the user but keeps the file.
 * Patient can only archive their own reports.
 *
 * @route   PATCH /api/patients/reports/:reportId/archive
 * @access  Private — patient
 */
export const archiveReport = async (req, res, next) => {
    try {
        const report = await MedicalReport.findById(req.params.reportId);

        // Treat an already deleted report as a 404 for the patient
        if (!report || report.isDeleted) {
            return res.status(404).json({
                success: false,
                error: 'Report not found.',
            });
        }

        if (report.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to delete this report.',
            });
        }

        // Soft delete: Update the flag and save
        report.isDeleted = true;
        await report.save();

        logger.info(`[patient-service] Report archived (soft delete): ${report._id} | patient: ${req.user.email}`);

        res.status(200).json({
            success: true,
            message: 'Report deleted successfully.', // Keep message standard for frontend UX
        });
    } catch (err) {
        next(err);
    }
};