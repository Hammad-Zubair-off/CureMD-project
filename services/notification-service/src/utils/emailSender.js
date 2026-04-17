import sgMail from '@sendgrid/mail';
import { logger } from './logger.js';

/**
 * Send an email via SendGrid.
 * Never throws — logs error and returns false on failure.
 *
 * @param {string} to         Recipient email address
 * @param {string} subject    Email subject line
 * @param {string} html       HTML email body
 * @returns {Promise<boolean>} true if sent, false if failed
 */
export const sendEmail = async (to, subject, html) => {
    try {
        const msg = {
            to,
            from: {
                email: process.env.SENDGRID_FROM_EMAIL,
                name: process.env.SENDGRID_FROM_NAME,
            },
            subject,
            html,
        };

        await sgMail.send(msg);
        logger.success(`[EmailSender] Email sent to ${to} — "${subject}"`);
        return true;

    } catch (error) {
        // Log SendGrid's detailed error if available
        if (error.response) {
            logger.error(`[EmailSender] SendGrid error:`, error.response.body);
        } else {
            logger.error(`[EmailSender] Failed to send email to ${to}:`, error.message);
        }
        return false;
    }
};