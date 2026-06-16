import express from 'express';
import {
    getAllCourses,
    getCourseById,
    getCourseEnrollments,
    getCourseExams,
    getCourseStats,
    createCourse,
    updateCourse,
    deleteCourse,
} from '../controllers/course.controller.js';

const router = express.Router();

// ── Collection routes ──────────────────────────────────────────────────────────
// GET    /api/courses               → list all (filters: facultyId, departmentId, status, mode, search)
// POST   /api/courses               → create a new course
router.route('/')
    .get(getAllCourses)
    .post(createCourse);

// ── Single-resource routes ─────────────────────────────────────────────────────
// GET    /api/courses/:id           → get one course
// PUT    /api/courses/:id           → full update
// DELETE /api/courses/:id           → delete (blocked if dependencies exist)
router.route('/:id')
    .get(getCourseById)
    .put(updateCourse)
    .delete(deleteCourse);

// ── Sub-resource routes ────────────────────────────────────────────────────────
// GET    /api/courses/:id/enrollments
// GET    /api/courses/:id/exams
// GET    /api/courses/:id/stats
router.get('/:id/enrollments', getCourseEnrollments);
router.get('/:id/exams',       getCourseExams);
router.get('/:id/stats',       getCourseStats);

export default router;