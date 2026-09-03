import express from 'express';
import { logger } from '../utils/logger.js';
import { verifyQstash } from '../utils/qstashVerify.js';
import { EVENT_HANDLERS } from '../handlers/eventHandlers.js';

const router = express.Router();

/**
 * Inbound async events. Called by QStash in production, or directly by a
 * publishing service on the local Docker network in dev.
 *
 *   POST /   body: { event: "<routingKey>", data: { ... } }
 *
 * 2xx  -> acknowledged. Non-2xx -> QStash retries with backoff.
 */
router.post('/', express.raw({ type: '*/*' }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

    const valid = await verifyQstash(req.headers['upstash-signature'], raw);
    if (!valid) {
        return res.status(401).json({ success: false, error: 'invalid signature' });
    }

    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        return res.status(400).json({ success: false, error: 'invalid JSON body' });
    }

    const { event, data } = payload || {};
    const handler = EVENT_HANDLERS[event];

    if (!handler) {
        logger.info(`[events] no handler for "${event}" — acknowledging`);
        return res.status(200).json({ success: true, ignored: true });
    }

    try {
        await handler(data);
        return res.status(200).json({ success: true });
    } catch (err) {
        if (err?.isPermanent) {
            logger.warn(`[events] handler "${event}" permanent failure — acknowledging: ${err.message}`);
            return res.status(200).json({ success: true, permanentFailure: true });
        }
        logger.error(`[events] handler "${event}" failed: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
