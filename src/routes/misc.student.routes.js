'use strict';

/**
 * Routes that don't sit under /students/:id but are still student-related.
 */

import express from 'express';
import * as ctrl from '../controllers/student.controller.js';

const router = express.Router();

// POST /api/attendance
router.post('/attendance', ctrl.markAttendance);

// POST /api/results
router.post('/results', ctrl.upsertResult);

// PATCH /api/payments/:paymentId
router.patch('/payments/:paymentId', ctrl.updatePaymentStatus);

export default router;