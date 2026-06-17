import jwt from 'jsonwebtoken';

// ══════════════════════════════════════════════════════════════════════════════
//  authenticate  —  verifies the Bearer access token on every protected route
// ══════════════════════════════════════════════════════════════════════════════
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded; // { userId, email, role, studentId?, lecturerId? }
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Access token expired'
            : 'Invalid access token';
        return res.status(401).json({ success: false, message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  authorizeRoles(...roles)  —  role-based access guard
//  Usage: router.get('/admin-only', authenticate, authorizeRoles('Admin'), handler)
// ══════════════════════════════════════════════════════════════════════════════
export const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  Convenience role guards
//  - isAdmin    : Admin only
//  - isLecturer : Lecturer + Admin (Admin can do anything a Lecturer can)
//  - isStudent  : Student only  — Admin should NOT access personal student routes
//                 (grades, exam submissions, etc.)
// ══════════════════════════════════════════════════════════════════════════════
export const isAdmin    = authorizeRoles('Admin');
export const isLecturer = authorizeRoles('Lecturer', 'Admin');
export const isStudent  = authorizeRoles('Student');         // ← Admin removed

// ══════════════════════════════════════════════════════════════════════════════
//  optionalAuth  —  attaches req.user if a valid token is present, but never
//                   blocks the request
// ══════════════════════════════════════════════════════════════════════════════
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;           // ← consistent casing
    if (authHeader?.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_ACCESS_SECRET);
        } catch (err) {
            if (!(err instanceof jwt.JsonWebTokenError)) {
                console.error('optionalAuth unexpected error:', err);  // ← narrow catch
            }
            // silently ignore JWT errors — don't block the request
        }
    }
    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateSecrets  —  call once at app startup to fail fast if JWT secrets
//                      are missing from the environment
// ══════════════════════════════════════════════════════════════════════════════
export const validateSecrets = () => {
    const missing = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
        (key) => !process.env[key]
    );
    if (missing.length) {
        console.error(`FATAL: Missing environment variable(s): ${missing.join(', ')}`);
        process.exit(1);
    }
};