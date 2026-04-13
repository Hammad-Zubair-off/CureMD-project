import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify config on startup
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY    ||
    !process.env.CLOUDINARY_API_SECRET
) {
    logger.warn('[Cloudinary] Missing credentials — file uploads will fail. Check your .env file.');
} else {
    logger.success('[Cloudinary] Configured successfully.');
}

export default cloudinary;
