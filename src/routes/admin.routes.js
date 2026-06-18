import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { enrollStudent } from '../controllers/admin.user.controller.js';

const router = express.Router();

// admin.routes.js
router.post('/users/:id/student-enrollment', authenticate, isAdmin, enrollStudent);


export default router;