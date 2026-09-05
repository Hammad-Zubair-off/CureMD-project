export const normalizeInternationalPhone = (raw) => {
    if (!raw || typeof raw !== 'string') return null;

    const cleaned = raw.replace(/[\s()-]/g, '');

    if (/^07\d{8}$/.test(cleaned)) return `+94${cleaned.slice(1)}`;
    if (/^7\d{8}$/.test(cleaned)) return `+94${cleaned}`;

    if (/^\+?[0-9]{7,15}$/.test(cleaned)) return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;

    return null;
};
