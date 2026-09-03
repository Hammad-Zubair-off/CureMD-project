/**
 * Middleware to catch 404s and centralized error handler to ensure
 * consistent API error responses across microservices.
 */

import { logger } from "../utils/logger.js";

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found = ${req.originalUrl}`);
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || 'Server Error';

    // Mongoose: malformed ObjectId / cast failure
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }
    // Mongoose: schema validation
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors || {}).map((e) => e.message).join(', ') || 'Validation failed';
    }
    // Mongo: duplicate key
    else if (err.code === 11000) {
        statusCode = 409;
        message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(', ') || 'field'}`;
    }
    // JWT
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Invalid or expired token';
    }

    if (statusCode >= 500) logger.error(`${req.method} ${req.url}`, err);
    else logger.warn(`${req.method} ${req.url} — ${statusCode}: ${message}`);

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
