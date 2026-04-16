export const normalizeSriLankanPhone = (raw) => {
    if (!raw || typeof raw !== 'string') return null;

    const cleaned = raw.replace(/[\s()-]/g, '');

    if (/^\+947\d{8}$/.test(cleaned)) return cleaned;
    if (/^07\d{8}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
    if (/^7\d{8}$/.test(cleaned)) return `+94${cleaned}`;

    return null;
};