import jwt from 'jsonwebtoken';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const STATUS_CACHE_TTL = 60_000; // 1 minute
const statusCache = new Map();

// Asks auth-service whether the account is still active/approved.
// Cached briefly so a deactivation/rejection takes effect quickly without
// hitting auth-service on every single request.
const fetchUserStatus = async (userId) => {
    const cached = statusCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < STATUS_CACHE_TTL) {
        return cached.data;
    }

    const response = await axios.get(
        `${AUTH_SERVICE_URL}/api/auth/internal/users/${userId}/status`,
        {
            headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
            timeout: 3000,
        }
    );

    statusCache.set(userId, { data: response.data, fetchedAt: Date.now() });
    return response.data;
};

/**
 * Verifies JWT token and attaches decoded payload to req.user
 * Re-checks account status against auth-service so a deactivated/rejected
 * account can't keep using an already-issued token
 */
export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token has expired. Please login again.',
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token.',
            });
        }

        try {
            const status = await fetchUserStatus(decoded.id);
            if (!status.isActive) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account has been deactivated. Contact support.',
                });
            }
            decoded.isApproved = status.isApproved;
        } catch (err) {
            if (err.response?.status === 404) {
                return res.status(401).json({
                    success: false,
                    error: 'User account no longer exists.',
                });
            }
            // auth-service unreachable — fail open on the signed token so a
            // transient outage there doesn't take this service down too
        }

        // Attach decoded payload to req.user
        // Payload shape: { id, firstName, lastName, fullName, email, role, isApproved }
        req.user = decoded;
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Restricts access to specific roles
 * superadmin always passes any role check
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated.',
            });
        }

        if (req.user.role === 'superadmin') return next();

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required: ${roles.join(' or ')}. Your role: ${req.user.role}`,
            });
        }
        next();
    };
};

/**
 * Ensures doctor accounts are approved before accessing protected routes
 * Used in addition to authorize('doctor') on doctor-specific routes
 */
export const requireApproved = (req, res, next) => {
    if (req.user.role === 'doctor' && !req.user.isApproved) {
        return res.status(403).json({
            success: false,
            error: 'Your doctor account is pending admin approval.',
        });
    }
    next();
};