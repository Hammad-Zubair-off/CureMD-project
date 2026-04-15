import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import { connectRabbitMQ } from './src/config/rabbitmq.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import { initPaymentEventConsumers } from './src/controllers/paymentController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;
const SERVICE_NAME = process.env.SERVICE_NAME;

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/payments', paymentRoutes);

//  Health check 
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
    });
});

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
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            logger.success(`${[SERVICE_NAME]}-service Running on port ${PORT}`);
        });

        await connectRabbitMQWithRetry();
        await initPaymentEventConsumers();

        process.on('SIGTERM', () => {
            logger.warn(`${[SERVICE_NAME]}-service SIGTERM received — shutting down gracefully`);
            server.close(() => process.exit(0));
        });
    } catch (error) {
        logger.error(`${[SERVICE_NAME]}-service Startup failed:`, error);
        process.exit(1);
    }
};

startServer();