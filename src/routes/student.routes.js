'use strict';

import express from 'express';
import * as ctrl from '../controllers/student.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── Students ─────────────────────────────────────────────

router.get('/', authenticate,ctrl.getStudents);
router.post('/', authenticate, ctrl.registerStudent);
router.get('/by-user/:user_id', authenticate, ctrl.getStudentByUserId);
router.get('/stats', authenticate, ctrl.getStudentStats);

router.get('/:id', authenticate, ctrl.getStudentById);
router.patch('/:id', authenticate, ctrl.updateStudent);
router.delete('/:id', authenticate, ctrl.deleteStudent);

// ─── Summary ─────────────────────────────────────────────

router.get('/:id/summary', authenticate, ctrl.getStudentSummary);

// ─── Enrollments ─────────────────────────────────────────

router.get('/:id/enrollments', authenticate, ctrl.getEnrollments);
router.post('/:id/enrollments', authenticate, ctrl.enrollStudent);
router.delete('/:id/enrollments', authenticate, ctrl.dropEnrollment);

// ─── Attendance ──────────────────────────────────────────

router.get('/:id/attendance', authenticate, ctrl.getAttendance);

// ─── Results ─────────────────────────────────────────────

router.get('/:id/results', authenticate, ctrl.getResults);

// ─── Payments ────────────────────────────────────────────

router.get('/:id/payments',     authenticate, ctrl.getPayments);
router.post('/:id/payments', authenticate, ctrl.createPayment);

// ─── Scholarships ────────────────────────────────────────

router.get('/:id/scholarships', authenticate, ctrl.getScholarships);
router.post('/:id/scholarships', authenticate, ctrl.addScholarship);

export default router;