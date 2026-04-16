import twilio from 'twilio';
import { logger } from '../utils/logger.js';

let twilioClient = null;

export const initTwilio = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        logger.warn('[Twilio] Missing credentials or sender number. SMS sending will be disabled.');
        return;
    }

    twilioClient = twilio(accountSid, authToken);
    logger.success('[Twilio] Initialized successfully');
};

export const getTwilioClient = () => twilioClient;