import { subscribeToEvent } from '../utils/eventBus.js';
import { sendSMS } from '../utils/smsSender.js';
import { logger } from '../utils/logger.js';
import {
    appointmentCreatedPatientSms,
    appointmentConfirmedPatientSms,
    consultationCompletedPatientSms,
} from '../templates/sms/patientSmsTemplates.js';

const sendPatientSmsFromEvent = async (routingKey, payload, templateFn) => {
    const { appointmentId, patientPhone } = payload;

    logger.info(`[SmsHandler] Processing ${routingKey}: ${appointmentId}`);

    if (!patientPhone) {
        logger.warn(`[SmsHandler] Missing patientPhone for ${routingKey}: ${appointmentId}`);
        return;
    }

    const message = templateFn(payload);
    await sendSMS(patientPhone, message);
};

export const registerSMSHandlers = async () => {
    await subscribeToEvent('appointment.created', async (payload) => {
        await sendPatientSmsFromEvent('appointment.created', payload, appointmentCreatedPatientSms);
    });

    await subscribeToEvent('appointment.confirmed', async (payload) => {
        await sendPatientSmsFromEvent('appointment.confirmed', payload, appointmentConfirmedPatientSms);
    });

    await subscribeToEvent('consultation.completed', async (payload) => {
        await sendPatientSmsFromEvent('consultation.completed', payload, consultationCompletedPatientSms);
    });

    logger.success('[SmsHandler] Subscribed to patient SMS events');
};