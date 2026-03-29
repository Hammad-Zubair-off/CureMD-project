import amqp from 'amqplib';
import { logger } from '../utils/logger.js';

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL;
if (!RABBITMQ_URL) {
    logger.error('[RabbitMQ] RABBITMQ_URL is not set. Check your .env file.');
    process.exit(1);
}

export const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        // Single topic exchange for the entire platform
        await channel.assertExchange('healthcare', 'topic', { durable: true });

        logger.success('[RabbitMQ] Connected to healthcare exchange');

        // Graceful shutdown
        connection.on('close', () => {
            logger.warn('[RabbitMQ] Connection closed — reconnecting in 5s');
            setTimeout(connectRabbitMQ, 5000);
        });

        connection.on('error', (err) => {
            logger.error('[RabbitMQ] Connection error:', err.message);
        });

    } catch (error) {
        logger.error('[RabbitMQ] Connection failed:', error.message);
        // Retry — RabbitMQ may still be starting in Docker
        setTimeout(connectRabbitMQ, 5000);
    }
};

export const getChannel = () => channel;