import { classifyError } from '../config/serviceClient.js';
import { logger } from './logger.js';

/**
 * BLOCKING inter-service call helper — Method 3.
 *
 * Use ONLY when patient-service genuinely needs an answer from another
 * service before it can continue. Currently used in one place:
 *   getHistoryForDoctor → calls appointment-service to verify the
 *   doctor's appointment has sharingMode: 'full_history_24h'.
 *
 * Returns the response data on success.
 * Returns null and sends the error response to the client on failure
 * — the controller must check for null and return immediately.
 *
 * Usage:
 *   const data = await callService(
 *     () => appointmentClient.get(SERVICES.appointment.endpoints.getById(id)),
 *     'appointment-service',
 *     res
 *   );
 *   if (!data) return; // error response already sent
 */
export const callService = async (requestFn, serviceName, res) => {
    try {
        const response = await requestFn();
        return response.data;
    } catch (error) {
        const classified = classifyError(error, serviceName);
        logger.error(`[callService] ${serviceName} — ${classified.type}: ${classified.message}`);

        res.status(classified.statusCode).json({
            success: false,
            error:   classified.message,
        });

        return null;
    }
};
