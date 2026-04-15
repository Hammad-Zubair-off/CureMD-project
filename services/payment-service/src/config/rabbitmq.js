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

        await channel.assertExchange('healthcare', 'topic', { durable: true });

        logger.success('[RabbitMQ] Connected to healthcare exchange');

        connection.on('close', () => {
            logger.warn('[RabbitMQ] Connection closed — reconnecting in 5s');
            setTimeout(async () => {
                try {
                    await connectRabbitMQ();
                } catch (err) {
                    logger.error('[RabbitMQ] Reconnect failed:', err.message);
                }
            }, 5000);
        });

        connection.on('error', (err) => {
            logger.error('[RabbitMQ] Connection error:', err.message);
        });
    } catch (error) {
        logger.error('[RabbitMQ] Connection failed:', error.message);
        throw error; // fail fast during startup
    }
};

export const getChannel = () => channel;