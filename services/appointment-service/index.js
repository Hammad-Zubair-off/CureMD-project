import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';
import { startAppointmentExpirer } from './src/utils/appointmentExpirer.js';

// Local / Docker entrypoint. On Vercel, api/index.js is used instead
// (and the expirer runs via the /internal/run-expiry cron endpoint).
const PORT = process.env.PORT || 3004;

const start = async () => {
    if (!process.env.INTERNAL_SECRET) {
        logger.error('INTERNAL_SECRET is not set. Shutting down.');
        process.exit(1);
    }

    try {
        await connectDB();
        startAppointmentExpirer();

        const server = app.listen(PORT, () => {
            logger.success(`appointment-service running on port ${PORT}`);
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
