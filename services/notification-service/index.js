import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { connectRabbitMQ } from './src/config/rabbitmq.js';
import { initSendGrid } from './src/config/sendgrid.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';
import { registerAppointmentHandlers } from './src/handlers/appointmentHandlers.js';
import { registerPaymentHandlers } from './src/handlers/paymentHandlers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const SERVICE_NAME = process.env.SERVICE_NAME || 'notification-service';

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: SERVICE_NAME,
        timestamp: new Date().toISOString(),
    });
});

// Routes 
//app.use('/api/patients', patientRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Register all event consumers
const registerAllHandlers = async () => {
    await registerAppointmentHandlers();
    await registerPaymentHandlers();
    // SMS handlers will be registered here later
    // await registerSMSHandlers();
};

//  Startup 
const startServer = async () => {
    try {
        // 1. Initialize SendGrid
        initSendGrid();

        // 2. Connect to MongoDB
        await connectDB();

        // 3. Connect to RabbitMQ
        await connectRabbitMQ();

        // 4. Register all event handlers
        await registerAllHandlers();

        // 5. Start server
        const server = app.listen(PORT, () => {
            logger.success(`[${SERVICE_NAME}] Running on port ${PORT}`);
        });

        process.on('SIGTERM', () => {
            logger.warn(`[${SERVICE_NAME}] SIGTERM received — shutting down gracefully`);
            server.close(() => process.exit(0));
        });

    } catch (error) {
        logger.error(`[${SERVICE_NAME}] Startup failed:`, error);
        process.exit(1);
    }
};

startServer();