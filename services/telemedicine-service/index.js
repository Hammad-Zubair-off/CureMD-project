import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectRabbitMQ } from './src/config/rabbitmq.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';
import appointmentRoutes from './src/routes/appointmentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  Health check 
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'appointment-service',
        timestamp: new Date().toISOString(),
    });
});

//  Routes 
app.use('/api/appointments', appointmentRoutes);

//  Error handling 
app.use(notFound);
app.use(errorHandler);

//  Startup 
const startServer = async () => {
    try {
        await connectRabbitMQ(); // needed for publishEvent() after bookings

        const server = app.listen(PORT, () => {
            logger.success(`[appointment-service] Running on port ${PORT}`);
        });

        process.on('SIGTERM', () => {
            logger.warn('[appointment-service] SIGTERM received — shutting down gracefully');
            server.close(() => process.exit(0));
        });
    } catch (error) {
        logger.error('[appointment-service] Startup failed:', error);
        process.exit(1);
    }
};

startServer();