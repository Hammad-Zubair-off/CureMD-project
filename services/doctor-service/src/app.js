import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import doctorRoutes from './routes/doctorRoutes.js';

const app = express();

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['http://localhost:5173', 'http://localhost:80'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: process.env.SERVICE_NAME || 'doctor',
        timestamp: new Date().toISOString()
    });
});

app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
    next();
});

// Routes
app.use('/api/doctors', doctorRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
