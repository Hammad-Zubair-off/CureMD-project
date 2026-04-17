import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { connectRabbitMQ } from './src/config/rabbitmq.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';
import appointmentRoutes from './src/routes/appointmentRoutes.js';
import { startAppointmentExpirer } from './src/utils/appointmentExpirer.js';
import { initAppointmentEventConsumers } from './src/controllers/appointmentController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const SERVICE_NAME = process.env.SERVICE_NAME || 'appointment';

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

const connectRabbitMQWithRetry = async (retries = 10, delayMs = 3000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await connectRabbitMQ();
            return;
        } catch (err) {
            logger.warn(`[RabbitMQ] connect attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt === retries) throw err;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};

//  Startup 
const startServer = async () => {
    // Fail fast — INTERNAL_SECRET is required for payment-service communication
    if (!process.env.INTERNAL_SECRET) {
        logger.error('INTERNAL_SECRET is not set. Shutting down.');
        process.exit(1);
    }

    try {
        await connectDB();
        startAppointmentExpirer(); // auto-transition confirmed → past when time elapses
        await connectRabbitMQWithRetry();
        await initAppointmentEventConsumers();

        const server = app.listen(PORT, () => {
            logger.success(`${SERVICE_NAME}-service running on port ${PORT}`);
        });

        process.on('SIGTERM', () => {
            logger.warn(`${SERVICE_NAME}-service SIGTERM received — shutting down gracefully`);
            server.close(() => process.exit(0));
        });
    } catch (error) {
        logger.error(`${SERVICE_NAME}-service startup failed:`, error);
        process.exit(1);
    }
};

startServer();