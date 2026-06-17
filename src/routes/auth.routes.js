import express from 'express';
import {
    login,
    refreshToken,
    logout,
    logoutAll,
    getMe,
    changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
// import { createAccount } from '../controllers/admin.user.controller.js';
import { isAdmin } from '../middleware/auth.middleware.js';
import { registerAdmin } from '../controllers/auth.controller.js';

const router = express.Router();

// ── Public routes (no token required) ─────────────────────────────────────────

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns: { accessToken, user }  +  sets refreshToken cookie
 */
router.post('/login', login);

/**
 * POST /auth/refresh
 * Cookie: refreshToken (HttpOnly)
 * Returns: { accessToken }
 */
router.post('/refresh', refreshToken);

// ── Protected routes (valid access token required) ────────────────────────────

/**
 * POST /auth/logout
 * Clears the current device's refresh token
 */
router.post('/logout', authenticate, logout);

/**
 * POST /auth/logout-all
 * Revokes all refresh tokens for the authenticated user (all devices)
 */
router.post('/logout-all', authenticate, logoutAll);

/**
 * GET /auth/me
 * Returns the full profile of the currently authenticated user
 */
router.get('/me', authenticate, getMe);

/**
 * POST /auth/change-password
 * Body: { currentPassword, newPassword }
 * Invalidates all existing sessions after a successful change
 */
router.post('/change-password', authenticate, changePassword);

// router.post('/create-account', authenticate, isAdmin, createAccount);
router.post('/register-admin', registerAdmin);

export default router;