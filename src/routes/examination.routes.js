import express from 'express';
import {
  getAllExams,
  getExamStats,
  getExamById,
  createExam,
  updateExam,
  updateExamStatus,
  deleteExam,
  getResultsByExam,
  getResultsByStudent,
  upsertResult,
  deleteResult,
} from '../controllers/examination.controller.js';

const router = express.Router();

// ─── Examinations ────────────────────────────────────────────────────────────
// GET    /api/examinations              → list all (filter: ?status=&course_id=)
// GET    /api/examinations/stats        → dashboard counts
// GET    /api/examinations/:exam_id     → single exam
// POST   /api/examinations              → schedule new exam
// PUT    /api/examinations/:exam_id     → full update
// PATCH  /api/examinations/:exam_id/status → update status only
// DELETE /api/examinations/:exam_id     → delete exam

router.get('/', getAllExams);
router.get('/stats', getExamStats);
router.get('/:exam_id', getExamById);
router.post('/', createExam);
router.put('/:exam_id', updateExam);
router.patch('/:exam_id/status', updateExamStatus);
router.delete('/:exam_id', deleteExam);

// ─── Results ────────────────────────────────────────────────────────────────
// GET    /api/examinations/:exam_id/results             → all results for exam
// POST   /api/examinations/:exam_id/results             → enter / update results (single or bulk array)
// DELETE /api/examinations/:exam_id/results/:student_id → remove one result

// GET    /api/examinations/student/:student_id/results  → all results for a student

router.get('/:exam_id/results', getResultsByExam);
router.post('/:exam_id/results', upsertResult);
router.delete('/:exam_id/results/:student_id', deleteResult);

router.get('/student/:student_id/results', getResultsByStudent);

export default router;