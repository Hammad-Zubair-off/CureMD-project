import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import patientRoutes from './routes/patientRoutes.js';

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
        service: 'patient-service',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api/patients', patientRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
