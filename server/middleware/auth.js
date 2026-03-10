// ============================================
// KAARUNYA — Auth Middleware
// ============================================

/**
 * Require authentication — blocks unauthenticated requests.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user;
        return next();
    }
    return res.status(401).json({ error: 'Authentication required. Please login.' });
}

/**
 * Optional authentication — attaches user if logged in, but doesn't block.
 * Used for public-facing endpoints that benefit from user context.
 */
function optionalAuth(req, res, next) {
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    return next();
}

/**
 * Require specific role(s).
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        req.user = req.session.user;
        next();
    };
}

module.exports = { requireAuth, optionalAuth, requireRole };
