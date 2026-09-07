import { logger } from './logger.js';

/**
 * Verifies the `Upstash-Signature` header on an incoming QStash delivery.
 *
 * Signing keys are REQUIRED in production — if they are missing there, every
 * delivery is rejected (fail closed). Keyless acceptance is only allowed
 * outside production (local dev / tests).
 */

let receiver;
const getReceiver = async () => {
    if (receiver !== undefined) return receiver;
    const cur = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const next = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!cur || !next) {
        receiver = null;
        return null;
    }
    const { Receiver } = await import('@upstash/qstash');
    receiver = new Receiver({ currentSigningKey: cur, nextSigningKey: next });
    return receiver;
};

export const verifyQstash = async (signature, rawBody) => {
    const r = await getReceiver();
    if (!r) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('[qstash] signing keys missing in production — rejecting delivery');
            return false;
        }
        return true; // no keys -> local/dev, accept
    }
    if (!signature) return false;
    try {
        return await r.verify({ signature, body: rawBody });
    } catch (err) {
        logger.warn(`[qstash] signature verification failed: ${err.message}`);
        return false;
    }
};
