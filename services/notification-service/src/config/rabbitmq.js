import amqp from 'amqplib';
import { logger } from '../utils/logger.js';

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;
if (!RABBITMQ_URL) {
    logger.error('[RabbitMQ] RABBITMQ_URL is not set. Check your .env file.');
    process.exit(1);
}

const RETRY_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectRabbitMQ = async () => {
    while (!channel) {
        try {
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // Single topic exchange for the entire platform
            await channel.assertExchange('healthcare', 'topic', { durable: true });

            logger.success('[RabbitMQ] Connected to healthcare exchange');

            // Graceful reconnection on disconnect
            connection.on('close', () => {
                logger.warn('[RabbitMQ] Connection closed - reconnecting in 5s');
                connection = null;
                channel = null;

                setTimeout(() => {
                    connectRabbitMQ().catch((err) => {
                        logger.error('[RabbitMQ] Reconnect failed:', err.message);
                    });
                }, RETRY_DELAY_MS);
            });

            connection.on('error', (err) => {
                logger.error('[RabbitMQ] Connection error:', err.message);
            });

            return channel; // blocks until channel is ready
        } catch (error) {
            connection = null;
            channel = null;
            logger.error('[RabbitMQ] Connection failed:', error.message);
            logger.warn('[RabbitMQ] Retrying in 5s...');
            await sleep(RETRY_DELAY_MS);
        }
    }

    return channel;
};

export const getChannel = () => channel;