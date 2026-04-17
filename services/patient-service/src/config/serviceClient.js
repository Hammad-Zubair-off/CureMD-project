import axios from 'axios';
import { logger } from '../utils/logger.js';

// Circuit State
const circuitState = new Map();

const getCircuit = (serviceName) => {
    if (!circuitState.has(serviceName)) {
        circuitState.set(serviceName, {
            failures: 0,
            lastFailure: null,
            isOpen: false,
            nextRetry: null,
        });
    }
    return circuitState.get(serviceName);
};

const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT = 30_000; // 30 seconds

const recordSuccess = (name) => {
    const c = getCircuit(name);
    c.failures = 0;
    c.isOpen = false;
    c.nextRetry = null;
};

const recordFailure = (name) => {
    const c = getCircuit(name);
    c.failures++;
    c.lastFailure = Date.now();

    if (c.failures >= FAILURE_THRESHOLD) {
        c.isOpen = true;
        c.nextRetry = Date.now() + RECOVERY_TIMEOUT;
        logger.warn(`[Circuit Breaker] OPEN for ${name} — will retry after 30s`);
    }
};

const isCircuitOpen = (name) => {
    const c = getCircuit(name);
    if (!c.isOpen) return false;

    // Recovery window passed — allow one test request (half-open)
    if (Date.now() >= c.nextRetry) {
        c.isOpen = false;
        logger.info(`[Circuit Breaker] HALF-OPEN for ${name} — testing recovery`);
        return false;
    }
    return true;
};

// Error Classifier
// Converts raw axios errors into clean, consistent objects.
// Used by callService.js to build the error response sent to the client.
export const classifyError = (error, serviceName) => {
    if (error.code === 'CIRCUIT_OPEN') {
        return {
            type: 'SERVICE_UNAVAILABLE',
            statusCode: 503,
            retryable: true,
            message: `${serviceName} is currently unavailable. Please try again later.`,
        };
    }
    if (['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(error.code)) {
        return {
            type: 'SERVICE_UNAVAILABLE',
            statusCode: 503,
            retryable: true,
            message: `${serviceName} is currently unavailable. Please try again later.`,
        };
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
            type: 'SERVICE_TIMEOUT',
            statusCode: 504,
            retryable: true,
            message: `${serviceName} took too long to respond. Please try again.`,
        };
    }
    if (error.response?.status === 404) {
        return {
            type: 'NOT_FOUND',
            statusCode: 404,
            retryable: false,
            message: error.response.data?.error || `Resource not found in ${serviceName}.`,
        };
    }
    if (error.response?.status === 400) {
        return {
            type: 'BAD_REQUEST',
            statusCode: 400,
            retryable: false,
            message: error.response.data?.error || `Bad request to ${serviceName}.`,
        };
    }
    if (error.response?.status === 403) {
        return {
            type: 'FORBIDDEN',
            statusCode: 403,
            retryable: false,
            message: error.response.data?.error || `Access denied by ${serviceName}.`,
        };
    }
    if (error.response?.status >= 500) {
        return {
            type: 'SERVICE_ERROR',
            statusCode: 502,
            retryable: true,
            message: `${serviceName} encountered an internal error. Please try again later.`,
        };
    }
    return {
        type: 'UNKNOWN',
        statusCode: 500,
        retryable: false,
        message: `Unexpected error communicating with ${serviceName}.`,
    };
};

// Factory
const createServiceClient = (serviceName, baseURL) => {
    const client = axios.create({
        baseURL,
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' },
    });

    const request = async (config) => {
        // Fail fast if circuit is open
        if (isCircuitOpen(serviceName)) {
            const err = new Error(`Circuit open for ${serviceName}`);
            err.code = 'CIRCUIT_OPEN';
            throw err;
        }

        try {
            const response = await client(config);
            recordSuccess(serviceName);
            return response;
        } catch (error) {
            // 4xx = caller's fault, not service failure — don't penalise the circuit
            const is4xx = error.response?.status >= 400 && error.response?.status < 500;
            if (!is4xx) recordFailure(serviceName);
            throw error;
        }
    };

    return {
        get: (url, config = {}) => request({ ...config, method: 'get', url }),
        post: (url, data, config = {}) => request({ ...config, method: 'post', url, data }),
        put: (url, data, config = {}) => request({ ...config, method: 'put', url, data }),
        patch: (url, data, config = {}) => request({ ...config, method: 'patch', url, data }),
        delete: (url, config = {}) => request({ ...config, method: 'delete', url }),
    };
};

export default createServiceClient;