import { getChannel } from '../config/rabbitmq.js';
import { logger } from './logger.js';

/**
 * Publish an event to the healthcare exchange.
 * Call this AFTER your main operation succeeds.
 * Do NOT await this in a way that blocks the response.
 *
 * @param {string} routingKey  
 * @param {object} data        The event payload
 */
export const publishEvent = (routingKey, data) => {
    try {
        const channel = getChannel();

        if (!channel) {
            logger.warn(`[EventBus] Channel not ready — skipping event: ${routingKey}`);
            return;
        }

        channel.publish(
            'healthcare',
            routingKey,
            Buffer.from(JSON.stringify(data)),
            { persistent: true } // survives RabbitMQ restart
        );

        logger.info(`[EventBus] Published: ${routingKey}`);
    } catch (error) {
        // NEVER throw — publishing failure must never break the main flow
        logger.warn(`[EventBus] Failed to publish ${routingKey}: ${error.message}`);
    }
};

/**
 * Subscribe to an event from the healthcare exchange.
 * Used in notification-service and any future consumer.
 * Acks on success, nacks (requeues) on handler failure.
 *
 * @param {string}   routingKey  
 * @param {function} handler     async (data) => void
 */
export const subscribeToEvent = async (routingKey, handler) => {
    const channel = getChannel();

    if (!channel) {
        const infraError = new Error(
            '[EventBus] RabbitMQ channel is not ready. Cannot subscribe to routing key: ' + routingKey
        );
        infraError.name = 'InfrastructureError';
        throw infraError;
    }

    // Durable queue so consumer can survive restarts
    const { queue } = await channel.assertQueue('', { exclusive: false, durable: true });
    await channel.bindQueue(queue, 'healthcare', routingKey);

    channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());
            logger.info('[EventBus] Received: ' + routingKey);
            await handler(data);
            channel.ack(msg);
        } catch (error) {
            logger.error('[EventBus] Handler failed for ' + routingKey + ':', error.message);

            if (error?.isPermanent) {
                logger.warn('[EventBus] Permanent handler error for ' + routingKey + ' — acking message (no requeue).');
                channel.ack(msg);
            } else {
                channel.nack(msg, false, true);
            }
        }
    });

    logger.info('[EventBus] Subscribed to: ' + routingKey);
};