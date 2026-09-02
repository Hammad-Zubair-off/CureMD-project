import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';

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
        service: process.env.SERVICE_NAME || 'auth_service',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
