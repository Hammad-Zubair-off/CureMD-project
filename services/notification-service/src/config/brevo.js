import * as brevo from '@getbrevo/brevo';
import { logger } from '../utils/logger.js';

let emailApi = null;

export const initBrevo = () => {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        logger.warn('[Brevo] BREVO_API_KEY is not set. Email sending will be disabled.');
        return;
    }

    emailApi = new brevo.TransactionalEmailsApi();
    emailApi.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    logger.success('[Brevo] Initialized successfully');
};

export const getBrevoClient = () => emailApi;
