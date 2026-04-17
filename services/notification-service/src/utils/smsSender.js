import { getTwilioClient } from '../config/twilio.js';
import { normalizeSriLankanPhone } from './phone.js';
import { logger } from './logger.js';

export const sendSMS = async (to, body) => {
    const client = getTwilioClient();

    if (!client) {
        logger.warn('[SmsSender] Twilio client is not initialized. Skipping SMS.');
        return { sent: false, reason: 'twilio_not_initialized' };
    }

    const normalizedTo = normalizeSriLankanPhone(to);
    if (!normalizedTo) {
        logger.warn(`[SmsSender] Invalid phone format: ${to}`);
        return { sent: false, reason: 'invalid_phone' };
    }

    const from = (process.env.TWILIO_PHONE_NUMBER || '').replace(/\s+/g, '');
    if (!from) {
        logger.warn('[SmsSender] TWILIO_PHONE_NUMBER is missing.');
        return { sent: false, reason: 'missing_from' };
    }

    try {
        const message = await client.messages.create({
            from,
            to: normalizedTo,
            body,
        });

        logger.success(`[SmsSender] SMS sent to ${normalizedTo} (sid: ${message.sid})`);
        return { sent: true, sid: message.sid };
    } catch (error) {
        const msg = String(error?.message || '').toLowerCase();

        // Permanent failures should not be retried forever by RabbitMQ consumers.
        const isPermanent =
            msg.includes('exceeded the 50 daily messages limit') ||
            msg.includes('is not a valid phone number') ||
            msg.includes('not a mobile number') ||
            msg.includes('permission to send an sms has not been enabled');

        error.isPermanent = isPermanent;

        logger.error('[SmsSender] Twilio send failed:', error.message);
        throw error;
    }
};