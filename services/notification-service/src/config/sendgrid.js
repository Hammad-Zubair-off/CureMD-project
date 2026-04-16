import sgMail from '@sendgrid/mail';
import { logger } from '../utils/logger.js';

export const initSendGrid = () => {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        logger.error('[SendGrid] SENDGRID_API_KEY is not set. Check your .env file.');
        process.exit(1);
    }

    sgMail.setApiKey(apiKey);
    logger.success('[SendGrid] Initialized successfully');
};

export default sgMail;