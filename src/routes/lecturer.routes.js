'use strict';

import express from 'express';
import * as ctrl from '../controllers/lecturer.controller.js';

const router = express.Router();

// Lecturer CRUD
router.get('/', ctrl.getLecturers);
router.post('/', ctrl.registerLecturer);

router.get('/:id', ctrl.getLecturerById);
router.patch('/:id', ctrl.updateLecturer);
router.delete('/:id', ctrl.deleteLecturer);
router.get('/faculty/:facultyId', ctrl.getLecturersByFaculty);
router.get('/department/:departmentId', ctrl.getLecturersByDepartment);

// Bonus: Get courses handled by lecturer
router.get('/:id/courses', ctrl.getLecturerCourses);

export default router;