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