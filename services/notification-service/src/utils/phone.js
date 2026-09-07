/**
 * Normalise a phone number to E.164-ish (`+` followed by 7–15 digits).
 * Returns null if it cannot be made into a plausible international number.
 * A bare number with no `+` is assumed to already include its country code.
 */
export const normalizeInternationalPhone = (raw) => {
    if (!raw || typeof raw !== 'string') return null;

    const cleaned = raw.replace(/[\s()\-.]/g, '');

    if (!/^\+?[0-9]{7,15}$/.test(cleaned)) return null;

    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};
