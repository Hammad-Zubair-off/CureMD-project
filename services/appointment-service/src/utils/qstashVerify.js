import { logger } from './logger.js';

/**
 * Verifies the `Upstash-Signature` header on an incoming QStash delivery.
 *
 * If no signing keys are configured (local / dev), verification is skipped
 * and the request is accepted.
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
    if (!r) return true; // no keys -> local/dev, accept
    if (!signature) return false;
    try {
        return await r.verify({ signature, body: rawBody });
    } catch (err) {
        logger.warn(`[qstash] signature verification failed: ${err.message}`);
        return false;
    }
};
