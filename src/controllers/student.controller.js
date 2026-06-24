'use strict';

import { getPool, sql } from '../config/db.js';
import bcrypt from 'bcrypt';

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
  console.error(`[studentController] ${context}`, err.message);
  const status = sqlErrToHttp(err);
  res.status(status).json({ success: false, message: err.message });
}

// ─── 1. LIST STUDENTS ────────────────────────────────────────────────────────

export const getStudents = async (req, res) => {
  try {
    const { search = null, faculty = null, status = null, page = 1, pageSize = 10 } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('Search', sql.NVarChar(200), search || null)
      .input('Faculty', sql.NVarChar(100), faculty || null)
      .input('Status', sql.NVarChar(20), status || null)
      .input('Page', sql.Int, parseInt(page))
      .input('PageSize', sql.Int, parseInt(pageSize))
      .execute('sp_GetStudents');

    const rows = result.recordset;
    const total = rows.length ? rows[0].TotalCount : 0;

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        pages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (err) {
    handleError(res, err, 'getStudents');
  }
};

// ─── 2. GET SINGLE STUDENT ───────────────────────────────────────────────────

export const getStudentById = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .execute('sp_GetStudentByID');

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    handleError(res, err, 'getStudentById');
  }
};

// ─── 3. REGISTER STUDENT ─────────────────────────────────────────────────────

export const registerStudent = async (req, res) => {
  try {
    const {
      name, email, password, phone, gender, dob, address, avatarCode,
      facultyId, departmentId, program, level, enrolledDate,
    } = req.body;

    if (!name || !email || !password || !facultyId) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, and facultyId are required.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const avatar =
      avatarCode ||
      name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const pool = await getPool();

    const request = pool.request()
      .input('Name', sql.NVarChar(150), name)
      .input('Email', sql.NVarChar(150), email)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('Phone', sql.NVarChar(30), phone || null)
      .input('Gender', sql.NVarChar(10), gender || null)
      .input('DOB', sql.Date, dob || null)
      .input('Address', sql.NVarChar(255), address || null)
      .input('AvatarCode', sql.NVarChar(5), avatar)
      .input('FacultyID', sql.Int, parseInt(facultyId))
      .input('DepartmentID', sql.Int, departmentId ? parseInt(departmentId) : null)
      .input('Program', sql.NVarChar(150), program || null)
      .input('Level', sql.Int, level ? parseInt(level) : 100)
      .input('EnrolledDate', sql.Date, enrolledDate || null)
      .output('NewStudentID', sql.VarChar(20));

    const result = await request.execute('sp_RegisterStudent');

    res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      studentId: result.output.NewStudentID,
    });
  } catch (err) {
    handleError(res, err, 'registerStudent');
  }
};

// ─── 4. UPDATE STUDENT ───────────────────────────────────────────────────────

export const updateStudent = async (req, res) => {
  try {
    const {
      name, phone, gender, dob, address, avatarCode,
      facultyId, departmentId, program, level, status,
    } = req.body;

    const pool = await getPool();

    await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('Name', sql.NVarChar(150), name || null)
      .input('Phone', sql.NVarChar(30), phone || null)
      .input('Gender', sql.NVarChar(10), gender || null)
      .input('DOB', sql.Date, dob || null)
      .input('Address', sql.NVarChar(255), address || null)
      .input('AvatarCode', sql.NVarChar(5), avatarCode || null)
      .input('FacultyID', sql.Int, facultyId ? parseInt(facultyId) : null)
      .input('DepartmentID', sql.Int, departmentId ? parseInt(departmentId) : null)
      .input('Program', sql.NVarChar(150), program || null)
      .input('Level', sql.Int, level ? parseInt(level) : null)
      .input('Status', sql.NVarChar(20), status || null)
      .execute('sp_UpdateStudent');

    res.json({ success: true, message: 'Student updated successfully.' });
  } catch (err) {
    handleError(res, err, 'updateStudent');
  }
};

// ─── 5. DELETE STUDENT ───────────────────────────────────────────────────────

export const deleteStudent = async (req, res) => {
  try {
    const pool = await getPool();

    await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .execute('sp_DeleteStudent');

    res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (err) {
    handleError(res, err, 'deleteStudent');
  }
};

export const getStudentStats = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .execute('sp_GetStudentStats');

    res.json({
      success: true,
      data: {
        overview: result.recordsets[0][0],
        byFaculty: result.recordsets[1],
      },
    });
  } catch (err) {
    handleError(res, err, 'getStudentStats');
  }
};

export const getStudentSummary = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .execute('sp_GetStudentSummary');

    res.json({
      success: true,
      data: {
        profile: result.recordsets[0][0],
        activeEnrollments: result.recordsets[1][0],
        attendance: result.recordsets[2][0],
        payments: result.recordsets[3][0],
      },
    });
  } catch (err) {
    handleError(res, err, 'getStudentSummary');
  }
};

export const getEnrollments = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      // 1. Change 'StudentID' to 'UserID'
      // 2. Change sql.VarChar to sql.Int
      // 3. Parse the req.params.id to an integer
      .input('UserID', sql.Int, parseInt(req.params.id, 10))
      .input('Semester', sql.Int, req.query.semester ? parseInt(req.query.semester) : null)
      .execute('sp_GetStudentEnrollments');

    res.json({ success: true, data: result.recordset });
    console.log(result.recordset);
  } catch (err) {
    handleError(res, err, 'getEnrollments');
  }
};

export const enrollStudent = async (req, res) => {
  try {
    const { courseId, semester } = req.body;

    if (!courseId || !semester) {
      return res.status(400).json({
        success: false,
        message: 'courseId and semester are required',
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('CourseID', sql.VarChar(20), courseId)
      .input('Semester', sql.Int, parseInt(semester))
      .output('NewEnrollmentID', sql.Int)
      .execute('sp_EnrollStudent');

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      enrollmentId: result.output.NewEnrollmentID,
    });
  } catch (err) {
    handleError(res, err, 'enrollStudent');
  }
};

export const dropEnrollment = async (req, res) => {
  try {
    const { courseId, semester } = req.body;

    const pool = await getPool();

    await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('CourseID', sql.VarChar(20), courseId)
      .input('Semester', sql.Int, parseInt(semester))
      .execute('sp_DropEnrollment');

    res.json({ success: true, message: 'Enrollment removed successfully' });
  } catch (err) {
    handleError(res, err, 'dropEnrollment');
  }
};

export const getAttendance = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('Semester', sql.Int, req.query.semester ? parseInt(req.query.semester) : null)
      .execute('sp_GetStudentAttendance');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getAttendance');
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { enrollmentId, sessionDate, status } = req.body;

    if (!enrollmentId || !sessionDate || !status) {
      return res.status(400).json({
        success: false,
        message: 'enrollmentId, sessionDate, status required',
      });
    }

    const pool = await getPool();

    await pool.request()
      .input('EnrollmentID', sql.Int, enrollmentId)
      .input('SessionDate', sql.Date, sessionDate)
      .input('Status', sql.NVarChar(10), status)
      .execute('sp_MarkAttendance');

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (err) {
    handleError(res, err, 'markAttendance');
  }
};

export const getResults = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .execute('sp_GetStudentResults');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getResults');
  }
};

export const upsertResult = async (req, res) => {
  try {
    const { examId, studentId, score, grade, gpaPoint } = req.body;

    const pool = await getPool();

    await pool.request()
      .input('ExamID', sql.VarChar(20), examId)
      .input('StudentID', sql.VarChar(20), studentId)
      .input('Score', sql.Decimal(5, 2), score)
      .input('Grade', sql.NVarChar(5), grade || null)
      .input('GpaPoint', sql.Decimal(3, 2), gpaPoint || null)
      .execute('sp_UpsertResult');

    res.json({ success: true, message: 'Result saved successfully' });
  } catch (err) {
    handleError(res, err, 'upsertResult');
  }
};

export const getPayments = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('Status', sql.NVarChar(20), req.query.status || null)
      .execute('sp_GetStudentPayments');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getPayments');
  }
};

export const createPayment = async (req, res) => {
  try {
    const {
      amount, type, semester, paymentDate, method, status,
    } = req.body;

    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('Amount', sql.Decimal(10, 2), amount)
      .input('Type', sql.NVarChar(20), type)
      .input('Semester', sql.NVarChar(5), semester || null)
      .input('PaymentDate', sql.Date, paymentDate || null)
      .input('Method', sql.NVarChar(50), method || null)
      .input('Status', sql.NVarChar(20), status || 'Pending')
      .output('NewPaymentID', sql.VarChar(20))
      .execute('sp_CreatePayment');

    res.status(201).json({
      success: true,
      paymentId: result.output.NewPaymentID,
    });
  } catch (err) {
    handleError(res, err, 'createPayment');
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, paymentDate, method } = req.body;

    const pool = await getPool();

    await pool.request()
      .input('PaymentID', sql.VarChar(20), paymentId)
      .input('Status', sql.NVarChar(20), status)
      .input('PaymentDate', sql.Date, paymentDate || null)
      .input('Method', sql.NVarChar(50), method || null)
      .execute('sp_UpdatePaymentStatus');

    res.json({ success: true, message: 'Payment updated successfully' });
  } catch (err) {
    handleError(res, err, 'updatePaymentStatus');
  }
};

export const getScholarships = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .execute('sp_GetStudentScholarships');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getScholarships');
  }
};

export const addScholarship = async (req, res) => {
  try {
    const { name, amount, type, status } = req.body;

    const pool = await getPool();

    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.id)
      .input('Name', sql.NVarChar(150), name)
      .input('Amount', sql.Decimal(10, 2), amount || null)
      .input('Type', sql.NVarChar(20), type || null)
      .input('Status', sql.NVarChar(20), status || 'Active')
      .output('NewID', sql.Int)
      .execute('sp_AddScholarship');

    res.status(201).json({
      success: true,
      scholarshipId: result.output.NewID,
    });
  } catch (err) {
    handleError(res, err, 'addScholarship');
  }
};

export const getStudentByUserId = async (req, res) => {
  try {
    // Security: students can only fetch their own profile
    if (req.user.role === 'Student' && req.user.userId !== parseInt(req.params.user_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('UserID', sql.Int, req.params.user_id)
      .execute('sp_GetStudentByUserID');

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    handleError(res, err, 'getStudentByUserId');
  }
};