import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const TTL_MS = 60_000; // 1 minute

let cache = { ids: null, fetchedAt: 0 };

/**
 * Returns a Set of userIds for doctors that auth-service considers active AND
 * approved, so public listings can hide unapproved doctors.
 *
 * Cached for 60s. If auth-service is unreachable, returns `null` — callers
 * treat that as "cannot filter, show active doctors" (fail open, same posture
 * as the account-status middleware).
 */
export const getApprovedDoctorIdSet = async () => {
    if (cache.ids && Date.now() - cache.fetchedAt < TTL_MS) {
        return cache.ids;
    }
    try {
        const { data } = await axios.get(
            `${AUTH_SERVICE_URL}/api/auth/internal/approved-doctors`,
            { headers: { 'x-internal-secret': process.env.INTERNAL_SECRET }, timeout: 3000 }
        );
        const ids = Array.isArray(data?.userIds) ? data.userIds.map(String) : null;
        // A valid response is a non-empty list. Anything else (empty, malformed,
        // auth still warming up) → treat as "unknown" and fail open rather than
        // hiding every doctor. Do NOT cache the unknown result.
        if (!ids || ids.length === 0) {
            // eslint-disable-next-line no-console
            console.warn('[doctor-service] approved-doctors returned nothing usable; showing all active');
            return null;
        }
        const set = new Set(ids);
        cache = { ids: set, fetchedAt: Date.now() };
        return set;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[doctor-service] approved-doctors lookup failed (${err.message}); showing all active`);
        return null;
    }
};
