import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import { runExpiryTick } from './utils/appointmentExpirer.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));

// Async event intake — raw body (QStash signature check), before the JSON parser.
app.use('/api/appointments/events', eventRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'appointment-service',
        timestamp: new Date().toISOString(),
    });
});

// Serverless replacement for the 60s setInterval expirer: an external scheduler
// (Vercel Cron / cron-job.org) POSTs here with the shared internal secret.
app.post('/api/appointments/internal/run-expiry', async (req, res) => {
    if (req.get('x-internal-secret') !== process.env.INTERNAL_SECRET) {
        return res.status(401).json({ success: false, error: 'unauthorized' });
    }
    try {
        await runExpiryTick();
        return res.status(200).json({ success: true });
    } catch (err) {
        logger.error(`[run-expiry] ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.use('/api/appointments', appointmentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
