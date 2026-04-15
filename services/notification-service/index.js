import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectRabbitMQ } from './src/config/rabbitmq.js';
import { notFound, errorHandler } from './src/middleware/errorHandler.js';
import { logger } from './src/utils/logger.js';
import { subscribeToEvent, publishEvent } from './src/utils/eventBus.js';
//import patientRoutes from './src/routes/patientRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const SERVICE_NAME = process.env.SERVICE_NAME;

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
        service: 'notification-service',
        timestamp: new Date().toISOString(),
    });
});

// Routes 
//app.use('/api/patients', patientRoutes);

// Error handling 
app.use(notFound);
app.use(errorHandler);

const initNotificationConsumers = async () => {
    await subscribeToEvent('appointment.rejected_by_doctor', async (event) => {
        publishEvent('notification.patient.created', {
            type: 'appointment_rejected',
            patientId: event.patientId || null,
            patientEmail: event.patientEmail,
            title: 'Appointment Rejected',
            message: 'Your appointment with ' + event.doctorFullName + ' was rejected. Refund is being processed.',
            appointmentId: event.appointmentId,
            reason: event.reason || null,
            appointmentDate: event.appointmentDate,
            timeSlot: event.timeSlot,
        });

        publishEvent('notification.admin.created', {
            type: 'doctor_rejected_appointment',
            title: 'Doctor Rejected Appointment',
            message: event.doctorFullName + ' rejected appointment for ' + event.patientFullName + '.',
            appointmentId: event.appointmentId,
            doctorFullName: event.doctorFullName,
            patientFullName: event.patientFullName,
            reason: event.reason || null,
            createdAt: new Date().toISOString(),
        });

        logger.info('[NotificationConsumer] Rejection notifications emitted for appointment ' + event.appointmentId);
    });

    await subscribeToEvent('payment.refunded', async (event) => {
        publishEvent('notification.patient.created', {
            type: 'payment_refunded',
            patientId: event.patientId,
            title: 'Refund Completed',
            message: 'Your refund for appointment ' + event.appointmentId + ' has been completed.',
            appointmentId: event.appointmentId,
            amount: event.amount,
            refundedAt: event.refundedAt,
        });

        logger.info('[NotificationConsumer] Refund notification emitted for appointment ' + event.appointmentId);
    });
};

//  Startup 
const startServer = async () => {
    try {
        const server = app.listen(PORT, () => {
            logger.success(`${[SERVICE_NAME]}-service Running on port ${PORT}`);
        });

        await connectRabbitMQ(); // needed for publishEvent() after bookings
        await initNotificationConsumers();

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