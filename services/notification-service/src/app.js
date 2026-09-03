import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initBrevo } from './config/brevo.js';
import { initTwilio } from './config/twilio.js';
import eventRoutes from './routes/eventRoutes.js';

// Provider clients configure themselves from env at module load.
initBrevo();
initTwilio();

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));

// Async event intake — raw body (QStash signature check), mounted before the
// JSON parser so it can read the exact bytes that were signed.
app.use('/api/notifications/events', eventRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: process.env.SERVICE_NAME || 'notification-service',
        timestamp: new Date().toISOString(),
    });
});

app.use(notFound);
app.use(errorHandler);

export default app;
