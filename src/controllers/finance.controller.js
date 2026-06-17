'use strict';

import { getPool, sql } from '../config/db.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function sqlErrToHttp(err) {
  const map = {
    50001: 400,
    50002: 409,
    50003: 404,
    50004: 404,
    50005: 409,
    50006: 404,
    50007: 400,
    50008: 404,
    50009: 400,
    50010: 404,
  };

  return map[err.number] || 500;
}

function handleError(res, err, context = '') {
  console.error(`[financeController] ${context}`, err.message);
  const status = sqlErrToHttp(err);
  res.status(status).json({ success: false, message: err.message });
}

// ─── 1. PAYMENTS ─────────────────────────────────────────────────────────────

export const getPayments = async (req, res) => {
  try {
    const { status = null, type = null, semester = null, search = null, page = 1, limit = 20 } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('Search', sql.NVarChar(200), search || null)
      .input('Type', sql.NVarChar(20), type || null)
      .input('Status', sql.NVarChar(20), status || null)
      .input('Semester', sql.NVarChar(5), semester || null)
      .input('Page', sql.Int, parseInt(page))
      .input('PageSize', sql.Int, parseInt(limit))
      .execute('sp_GetPaymentsList');

    const rows = result.recordset;
    const total = rows.length ? rows[0].TotalCount : 0;

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    handleError(res, err, 'getPayments');
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('PaymentID', sql.VarChar(20), req.params.paymentId)
      .execute('sp_GetPaymentByID');

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    handleError(res, err, 'getPaymentById');
  }
};

export const createPayment = async (req, res) => {
  try {
    const { student_id, amount, type, semester, payment_date, method, status } = req.body;

    if (!student_id || !amount || !type || !semester) {
      return res.status(400).json({
        success: false,
        message: 'student_id, amount, type and semester are required.',
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), student_id)
      .input('Amount', sql.Decimal(10, 2), amount)
      .input('Type', sql.NVarChar(20), type)
     .input('Semester', sql.NVarChar(10), semester || null)
      .input('PaymentDate', sql.Date, payment_date || null)
      .input('Method', sql.NVarChar(50), method || null)
      .input('Status', sql.NVarChar(20), status || 'Pending')
      .output('NewPaymentID', sql.VarChar(20))
      .execute('sp_CreatePayment');

    res.status(201).json({
      success: true,
      message: 'Payment created successfully.',
      paymentId: result.output.NewPaymentID,
    });
  } catch (err) {
    handleError(res, err, 'createPayment');
  }
};

export const updatePayment = async (req, res) => {
  try {
    const { status, method, payment_date, amount } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('PaymentID', sql.VarChar(20), req.params.paymentId)
      .input('Amount', sql.Decimal(10, 2), amount || null)
      .input('Status', sql.NVarChar(20), status || null)
      .input('PaymentDate', sql.Date, payment_date || null)
      .input('Method', sql.NVarChar(50), method || null)
      .execute('sp_UpdatePaymentDetails');

    res.json({ success: true, message: 'Payment updated successfully.' });
  } catch (err) {
    handleError(res, err, 'updatePayment');
  }
};

export const deletePayment = async (req, res) => {
  try {
    const pool = await getPool();

    await pool.request()
      .input('PaymentID', sql.VarChar(20), req.params.paymentId)
      .execute('sp_DeletePayment');

    res.json({ success: true, message: 'Payment deleted successfully.' });
  } catch (err) {
    handleError(res, err, 'deletePayment');
  }
};

// ─── 2. SCHOLARSHIPS ─────────────────────────────────────────────────────────

export const getScholarships = async (req, res) => {
  try {
    const { type = null, status = null } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('Type', sql.NVarChar(20), type || null)
      .input('Status', sql.NVarChar(20), status || null)
      .execute('sp_GetScholarshipsList');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getScholarships');
  }
};

export const getScholarshipById = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('ScholarshipID', sql.Int, parseInt(req.params.scholarshipId))
      .execute('sp_GetScholarshipByID');

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Scholarship not found.' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    handleError(res, err, 'getScholarshipById');
  }
};

export const createScholarship = async (req, res) => {
  try {
    const { name, student_id, amount, type, status } = req.body;

    if (!name || !student_id || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'name, student_id, amount and type are required.',
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('Name', sql.NVarChar(150), name)
      .input('StudentID', sql.VarChar(20), student_id)
      .input('Amount', sql.Decimal(10, 2), amount)
      .input('Type', sql.NVarChar(20), type)
      .input('Status', sql.NVarChar(20), status || 'Active')
      .output('NewID', sql.Int)
      .execute('sp_CreateScholarship');

    res.status(201).json({
      success: true,
      message: 'Scholarship created successfully.',
      scholarshipId: result.output.NewID,
    });
  } catch (err) {
    handleError(res, err, 'createScholarship');
  }
};

export const updateScholarship = async (req, res) => {
  try {
    const { name, amount, status, type } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('ScholarshipID', sql.Int, parseInt(req.params.scholarshipId))
      .input('Name', sql.NVarChar(150), name || null)
      .input('Amount', sql.Decimal(10, 2), amount || null)
      .input('Type', sql.NVarChar(20), type || null)
      .input('Status', sql.NVarChar(20), status || null)
      .execute('sp_UpdateScholarship');

    res.json({ success: true, message: 'Scholarship updated successfully.' });
  } catch (err) {
    handleError(res, err, 'updateScholarship');
  }
};

export const deleteScholarship = async (req, res) => {
  try {
    const pool = await getPool();

    await pool.request()
      .input('ScholarshipID', sql.Int, parseInt(req.params.scholarshipId))
      .execute('sp_DeleteScholarship');

    res.json({ success: true, message: 'Scholarship deleted successfully.' });
  } catch (err) {
    handleError(res, err, 'deleteScholarship');
  }
};

// ─── 3. DASHBOARD / ANALYTICS ────────────────────────────────────────────────

export const getFinanceSummary = async (req, res) => {
  try {
    const pool = await getPool();

    // Assuming the SP returns multiple recordsets for the dashboard metrics
    const result = await pool.request()
      .execute('sp_GetFinanceSummaryDashboard');

    res.json({
      success: true,
      data: {
        totalRevenue: result.recordsets[0][0]?.totalRevenue || 0,
        pendingAmount: result.recordsets[1][0]?.pendingAmount || 0,
        scholarshipTotal: result.recordsets[2][0]?.scholarshipTotal || 0,
        statusCounts: result.recordsets[3] || [],
        revenueByType: result.recordsets[4] || [],
      },
    });
  } catch (err) {
    handleError(res, err, 'getFinanceSummary');
  }
};

export const getMonthlyRevenue = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const pool = await getPool();

    const result = await pool.request()
      .input('Year', sql.Int, year)
      .execute('sp_GetMonthlyRevenue');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getMonthlyRevenue');
  }
};

// ─── 4. STUDENT-SPECIFIC FINANCE ─────────────────────────────────────────────

export const getStudentPayments = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.studentId)
      .execute('sp_GetStudentPayments'); // Should map to the same SP used in studentController

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getStudentPayments');
  }
};

export const getStudentScholarships = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.studentId)
      .execute('sp_GetStudentScholarships'); // Should map to the same SP used in studentController

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getStudentScholarships');
  }
};