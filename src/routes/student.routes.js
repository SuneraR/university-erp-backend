// src/routes/student.routes.js
import express from 'express';
import { getStudents } from '../controllers/student.controller.js';
const router = express.Router();

router.get('/', getStudents);

export default router;