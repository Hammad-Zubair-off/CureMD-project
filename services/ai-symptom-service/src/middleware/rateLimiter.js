import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for the AI chat endpoint.
 * Limits by userId extracted from the JWT payload (req.user.id)
 * rather than IP — more accurate in shared network environments
 * (university, corporate proxy) where many users share one IP.
 *
 * 10 requests per 15 minutes per user.
 * After hitting the limit the user must wait out the window.
 */
export const aiChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max:      10,              // 10 AI queries per window

    // Key by userId — falls back to IP if user is not authenticated
    keyGenerator: (req) => req.user?.id || req.ip,

    message: {
        success: false,
        error:   'You have reached the AI chat limit. Please wait 15 minutes before asking more questions.',
    },
    standardHeaders: true,
    legacyHeaders:   false,
});
