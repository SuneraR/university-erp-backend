import { Router } from 'express';
import {
  // Payments
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  // Scholarships
  getScholarships,
  getScholarshipById,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  // Dashboard / analytics
  getFinanceSummary,
  getMonthlyRevenue,
  getStudentPayments,
  getStudentScholarships,
} from '../controllers/finance.controller.js';

const router = Router();

// ── Dashboard ──────────────────────────────────────────────
// GET  /api/finance/summary             → KPI cards + status counts + revenue by type
// GET  /api/finance/revenue/monthly     → monthly revenue breakdown (charts)
router.get('/summary',          getFinanceSummary);
router.get('/revenue/monthly',  getMonthlyRevenue);

// ── Payments ───────────────────────────────────────────────
// GET    /api/finance/payments           → list (filter: status, type, semester, search)
// POST   /api/finance/payments           → create invoice/payment
// GET    /api/finance/payments/:id       → single payment
// PATCH  /api/finance/payments/:id       → update (status, method, payment_date, amount)
// DELETE /api/finance/payments/:id       → delete
router.get   ('/payments',          getPayments);
router.post  ('/payments',          createPayment);
router.get   ('/payments/:paymentId', getPaymentById);
router.patch ('/payments/:paymentId', updatePayment);
router.delete('/payments/:paymentId', deletePayment);

// ── Scholarships ───────────────────────────────────────────
// GET    /api/finance/scholarships       → list (filter: type, status)
// POST   /api/finance/scholarships       → award scholarship
// GET    /api/finance/scholarships/:id   → single scholarship
// PATCH  /api/finance/scholarships/:id   → update (name, amount, status, type)
// DELETE /api/finance/scholarships/:id   → delete
router.get   ('/scholarships',               getScholarships);
router.post  ('/scholarships',               createScholarship);
router.get   ('/scholarships/:scholarshipId', getScholarshipById);
router.patch ('/scholarships/:scholarshipId', updateScholarship);
router.delete('/scholarships/:scholarshipId', deleteScholarship);

// ── Per-student finance ────────────────────────────────────
// GET  /api/finance/student/:studentId/payments      → payment history
// GET  /api/finance/student/:studentId/scholarships  → awarded scholarships
router.get('/student/:studentId/payments',     getStudentPayments);
router.get('/student/:studentId/scholarships', getStudentScholarships);

export default router;