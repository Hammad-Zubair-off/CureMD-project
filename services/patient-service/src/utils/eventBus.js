import 'dotenv/config';
import { logger } from './logger.js';

/**
 * Async event bus (replaces the old RabbitMQ topic exchange).
 *
 *   Production  — publishes via Upstash QStash (HTTP queue, retries + DLQ).
 *   Local / dev — direct fire-and-forget HTTP POST on the Docker network
 *                 (no QSTASH_TOKEN set).
 *
 * `publishEvent()` NEVER throws — a failed publish must not break the caller.
 * It returns a promise; awaiting it in serverless is recommended so the
 * function is not frozen before the QStash call completes.
 */

const SERVICE_URLS = {
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
    appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3004',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
};

// routingKey -> [{ service, path }]. Keys with no entry are published nowhere.
const EVENT_ROUTES = {
    'appointment.confirmed': [{ service: 'notification', path: '/api/notifications/events' }],
    'appointment.created': [{ service: 'notification', path: '/api/notifications/events' }],
    'consultation.completed': [{ service: 'notification', path: '/api/notifications/events' }],
    'payment.refunded': [
        { service: 'notification', path: '/api/notifications/events' },
        { service: 'appointment', path: '/api/appointments/events' },
    ],
    'appointment.rejected_by_doctor': [{ service: 'payment', path: '/api/payments/events' }],
    'appointment.cancelled': [{ service: 'payment', path: '/api/payments/events' }],
};

const urlFor = ({ service, path }) => {
    const base = SERVICE_URLS[service];
    return base ? base.replace(/\/$/, '') + path : null;
};

let qstashClient;
const getQstash = async () => {
    if (qstashClient !== undefined) return qstashClient;
    if (!process.env.QSTASH_TOKEN) {
        qstashClient = null;
        return null;
    }
    const { Client } = await import('@upstash/qstash');
    qstashClient = new Client({ token: process.env.QSTASH_TOKEN });
    return qstashClient;
};

export const publishEvent = async (routingKey, data) => {
    const targets = EVENT_ROUTES[routingKey] || [];
    if (targets.length === 0) {
        logger.info(`[EventBus] no route for ${routingKey} — skipped`);
        return;
    }

    const body = { event: routingKey, data };

    for (const target of targets) {
        const url = urlFor(target);
        if (!url) {
            logger.warn(`[EventBus] no URL configured for ${target.service} (${routingKey})`);
            continue;
        }

        try {
            const qstash = await getQstash();
            if (qstash) {
                await qstash.publishJSON({ url, body, retries: 3 });
                logger.info(`[EventBus] queued ${routingKey} -> ${target.service}`);
            } else {
                const { default: axios } = await import('axios');
                axios
                    .post(url, body, { timeout: 5000 })
                    .catch((err) =>
                        logger.warn(`[EventBus] direct ${routingKey} -> ${target.service} failed: ${err.message}`),
                    );
                logger.info(`[EventBus] sent ${routingKey} -> ${target.service} (direct)`);
            }
        } catch (err) {
            logger.warn(`[EventBus] publish ${routingKey} -> ${target.service} failed: ${err.message}`);
        }
    }
};
