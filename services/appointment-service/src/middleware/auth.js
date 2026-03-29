import jwt from 'jsonwebtoken';

/**
 * Verifies JWT token and attaches decoded payload to req.user
 * No DB lookup — we trust the signed payload from auth-service
 */
export const protect = (req, res, next) => {
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