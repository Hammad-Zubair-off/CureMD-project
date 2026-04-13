import multer from 'multer';

// Store file in memory — we stream it directly to Cloudinary
// Never written to disk inside the container
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const ALLOWED_MIME_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error('Invalid file type. Only PDF, JPEG, PNG, and WEBP files are allowed.'),
            false
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
});

export default upload;
