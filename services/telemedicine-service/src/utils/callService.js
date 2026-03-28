import { classifyError } from '../config/serviceClient.js';
import { logger } from './logger.js';

export const callService = async (requestFn, serviceName, res) => {
    try {
        const response = await requestFn();
        return response.data;
    } catch (error) {
        const classified = classifyError(error, serviceName);
        logger.error(`[callService] ${serviceName} — ${classified.type}: ${classified.message}`);
        res.status(classified.statusCode).json({
            success: false,
            error: classified.message,
        });
        return null;
    }
};