'use strict';

import express from 'express';
import * as ctrl from '../controllers/student.controller.js';

const router = express.Router();

// ─── Students ─────────────────────────────────────────────

router.get('/', ctrl.getStudents);
router.post('/', ctrl.registerStudent);

// router.get('/stats', ctrl.getStudentStats);

router.get('/:id', ctrl.getStudentById);
router.patch('/:id', ctrl.updateStudent);
router.delete('/:id', ctrl.deleteStudent);

// ─── Summary ─────────────────────────────────────────────

// router.get('/:id/summary', ctrl.getStudentSummary);

// // ─── Enrollments ─────────────────────────────────────────

// router.get('/:id/enrollments', ctrl.getEnrollments);
// router.post('/:id/enrollments', ctrl.enrollStudent);
// router.delete('/:id/enrollments', ctrl.dropEnrollment);

// // ─── Attendance ──────────────────────────────────────────

// router.get('/:id/attendance', ctrl.getAttendance);

// // ─── Results ─────────────────────────────────────────────

// router.get('/:id/results', ctrl.getResults);

// // ─── Payments ────────────────────────────────────────────

// router.get('/:id/payments', ctrl.getPayments);
// router.post('/:id/payments', ctrl.createPayment);

// // ─── Scholarships ────────────────────────────────────────

// router.get('/:id/scholarships', ctrl.getScholarships);
// router.post('/:id/scholarships', ctrl.addScholarship);

export default router;