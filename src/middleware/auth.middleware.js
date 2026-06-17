import jwt from 'jsonwebtoken';

// ══════════════════════════════════════════════════════════════════════════════
//  authenticate  —  verifies the Bearer access token on every protected route
// ══════════════════════════════════════════════════════════════════════════════
export const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];

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
//  Convenience role guards (shorthand wrappers)
// ══════════════════════════════════════════════════════════════════════════════
export const isAdmin    = authorizeRoles('Admin');
export const isLecturer = authorizeRoles('Lecturer', 'Admin');   // Admin can do anything a Lecturer can
export const isStudent  = authorizeRoles('Student', 'Admin');

// ══════════════════════════════════════════════════════════════════════════════
//  optionalAuth  —  attaches req.user if a valid token is present, but never
//                   blocks the request
// ══════════════════════════════════════════════════════════════════════════════
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_ACCESS_SECRET);
        } catch {
            // silently ignore invalid / expired token
        }
    }
    next();
};