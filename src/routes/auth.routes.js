import express from 'express';
import {
    login,
    refreshToken,
    logout,
    logoutAll,
    getMe,
    changePassword,
    registerAdmin,
    activateAccount,
} from '../controllers/auth.controller.js';
import {
    createUser,
    registerStudent,
    registerLecturer,
    listUsers,
    getUserById,
    toggleUserActive,
} from '../controllers/admin.user.controller.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import {
    validateLogin,
    validateActivateAccount,
    validateChangePassword,
    validateRegisterAdmin,
    validateCreateUser,
    validateRegisterStudent,
    validateRegisterLecturer,
    validateUserId,
    validateListUsers,
} from '../middleware/validate.middleware.js';

const router = express.Router();

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES — no token required
// ══════════════════════════════════════════════════════════════════════════════

/** POST /auth/login
 *  Body: { email, password } → { accessToken, user } + sets refreshToken cookie */
router.post('/login',
    validateLogin,
    login
);

/** POST /auth/refresh
 *  Cookie: refreshToken → { accessToken } */
router.post('/refresh',
    refreshToken
);

/** POST /auth/activate
 *  Body: { email, password } → activates a pending account */
router.post('/activate',
    validateActivateAccount,
    activateAccount
);

// ══════════════════════════════════════════════════════════════════════════════
//  PROTECTED ROUTES — all authenticated roles
// ══════════════════════════════════════════════════════════════════════════════

/** POST /auth/logout
 *  Clears current device refresh token */
router.post('/logout',
    authenticate,
    logout
);

/** POST /auth/logout-all
 *  Revokes all refresh tokens for the user (all devices) */
router.post('/logout-all',
    authenticate,
    logoutAll
);

/** GET /auth/me
 *  Returns full profile of the currently authenticated user */
router.get('/me',
    authenticate,
    getMe
);

/** POST /auth/change-password
 *  Body: { currentPassword, newPassword } */
router.post('/change-password',
    authenticate,
    validateChangePassword,
    changePassword
);

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN ONLY ROUTES
// ══════════════════════════════════════════════════════════════════════════════

/** POST /auth/register-admin
 *  Creates a new Admin account */
router.post('/register-admin',
    // authenticate,
    // isAdmin,
    validateRegisterAdmin,
    registerAdmin
);

/** GET /auth/users
 *  List all users — optional ?role=Student|Lecturer|Admin filter */
router.get('/users',
    authenticate,
    isAdmin,
    validateListUsers,
    listUsers
);

/** GET /auth/users/:id
 *  Get single user with role profile */
router.get('/users/:id',
    authenticate,
    isAdmin,
    validateUserId,
    getUserById
);

/** POST /auth/users/create
 *  Step 1 — Create base user account (Student or Lecturer) */
router.post('/users/create',
    authenticate,
    isAdmin,
    validateCreateUser,
    createUser
);

/** POST /auth/users/:id/register-student
 *  Step 2a — Register existing user as Student */
router.post('/users/:id/register-student',
    authenticate,
    isAdmin,
    validateUserId,
    // validateRegisterStudent,
    registerStudent
);

/** POST /auth/users/:id/register-lecturer
 *  Step 2b — Register existing user as Lecturer */
router.post('/users/:id/register-lecturer',
    authenticate,
    isAdmin,
    validateUserId,
    // validateRegisterLecturer,
    registerLecturer
);

/** PATCH /auth/users/:id/toggle-active
 *  Activate or deactivate a user account */
router.patch('/users/:id/toggle-active',
    authenticate,
    isAdmin,
    validateUserId,
    toggleUserActive
);

export default router;