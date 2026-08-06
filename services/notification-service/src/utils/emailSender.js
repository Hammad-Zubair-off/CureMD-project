import * as brevo from '@getbrevo/brevo';
import { getBrevoClient } from '../config/brevo.js';
import { logger } from './logger.js';

/**
 * Send an email via Brevo.
 * Never throws — logs error and returns false on failure.
 *
 * @param {string} to         Recipient email address
 * @param {string} subject    Email subject line
 * @param {string} html       HTML email body
 * @returns {Promise<boolean>} true if sent, false if failed
 */
export const sendEmail = async (to, subject, html) => {
    const client = getBrevoClient();

    if (!client) {
        logger.warn('[EmailSender] Brevo client is not initialized. Skipping email.');
        return false;
    }

    try {
        const email = new brevo.SendSmtpEmail();
        email.to = [{ email: to }];
        email.sender = {
            email: process.env.BREVO_FROM_EMAIL,
            name: process.env.BREVO_FROM_NAME,
        };
        email.subject = subject;
        email.htmlContent = html;

        await client.sendTransacEmail(email);
        logger.success(`[EmailSender] Email sent to ${to} — "${subject}"`);
        return true;

    } catch (error) {
        if (error.response) {
            logger.error(`[EmailSender] Brevo error:`, error.response.body || error.response.text);
        } else {
            logger.error(`[EmailSender] Failed to send email to ${to}:`, error.message);
        }
        return false;
    }
};
