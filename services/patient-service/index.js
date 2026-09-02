import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';

// Local / Docker entrypoint. On Vercel, api/index.js is used instead.
const PORT = process.env.PORT || 3002;

const start = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, () => {
            logger.success(`patient-service running on port ${PORT}`);
        });

        process.on('SIGTERM', () => {
            logger.warn('SIGTERM received. Shutting down gracefully...');
            server.close(() => process.exit(0));
        });
    } catch (error) {
        logger.error('Failed to start service:', error);
        process.exit(1);
    }
};

start();
