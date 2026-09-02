import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import paymentRoutes from './routes/paymentRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import { stripeWebhook } from './controllers/paymentController.js';

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));

// --- Raw-body routes: must be mounted BEFORE express.json() ---

// Stripe webhook — needs the exact bytes for signature verification.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Async event intake — raw body for QStash signature verification.
app.use('/api/payments/events', eventRoutes);

// --- Parsed-body routes ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
