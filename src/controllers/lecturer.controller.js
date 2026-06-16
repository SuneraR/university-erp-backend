'use strict';

import { getPool, sql } from '../config/db.js';
import bcrypt from 'bcrypt';

// ---------------- Error Handler ----------------

function handleError(res, err, context = '') {
  console.error(`[lecturerController] ${context}`, err.message);
  res.status(500).json({
    success: false,
    message: err.message,
  });
}

// ---------------- GET ALL ----------------

export const getLecturers = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .execute('sp_GetLecturers');

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    handleError(res, err, 'getLecturers');
  }
};

// ---------------- GET BY ID ----------------

export const getLecturerById = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('LecturerID', sql.VarChar(20), req.params.id)
      .execute('sp_GetLecturerByID');

    if (!result.recordset.length) {
      return res.status(404).json({
        success: false,
        message: 'Lecturer not found.',
      });
    }

    res.json({
      success: true,
      data: result.recordset[0],
    });

  } catch (err) {
    handleError(res, err, 'getLecturerById');
  }
};

// ---------------- GET BY Faculty ----------------

export const getLecturersByFaculty = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('FacultyID', sql.Int, req.params.facultyId)
      .execute('sp_GetLecturersByFaculty');

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    handleError(res, err, 'getLecturersByFaculty');
  }
};

// ---------------- GET BY Department ----------------

export const getLecturersByDepartment = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('DepartmentID', sql.Int, req.params.departmentId)
      .execute('sp_GetLecturersByDepartment');

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    handleError(res, err, 'getLecturersByDepartment');
  }
};

// ---------------- REGISTER ----------------

export const registerLecturer = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      gender,
      dob,
      address,
      avatarCode,
      facultyId,
      departmentId,
      specialization,
      rank,
      joinedDate,
    } = req.body;

    if (!name || !email || !password || !facultyId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password, facultyId and departmentId are required.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const avatar =
      avatarCode ||
      name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const pool = await getPool();

    const result = await pool.request()
      .input('Name', sql.NVarChar(150), name)
      .input('Email', sql.NVarChar(150), email)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('Phone', sql.NVarChar(30), phone || null)
      .input('Gender', sql.NVarChar(10), gender || null)
      .input('DOB', sql.Date, dob || null)
      .input('Address', sql.NVarChar(255), address || null)
      .input('AvatarCode', sql.NVarChar(5), avatar)
      .input('FacultyID', sql.Int, parseInt(facultyId))
      .input('DepartmentID', sql.Int, parseInt(departmentId))
      .input('Specialization', sql.NVarChar(150), specialization || null)
      .input('Rank', sql.NVarChar(50), rank || null)
      .input('JoinedDate', sql.Date, joinedDate || null)
      .output('NewLecturerID', sql.VarChar(20))
      .execute('sp_RegisterLecturer');

    res.status(201).json({
      success: true,
      message: 'Lecturer registered successfully.',
      lecturerId: result.output.NewLecturerID,
    });

  } catch (err) {
    handleError(res, err, 'registerLecturer');
  }
};

// ---------------- UPDATE ----------------

export const updateLecturer = async (req, res) => {
  try {
    const {
      name,
      phone,
      gender,
      dob,
      address,
      avatarCode,
      facultyId,
      departmentId,
      specialization,
      rank,
      status,
    } = req.body;

    const pool = await getPool();

    await pool.request()
      .input('LecturerID', sql.VarChar(20), req.params.id)
      .input('Name', sql.NVarChar(150), name || null)
      .input('Phone', sql.NVarChar(30), phone || null)
      .input('Gender', sql.NVarChar(10), gender || null)
      .input('DOB', sql.Date, dob || null)
      .input('Address', sql.NVarChar(255), address || null)
      .input('AvatarCode', sql.NVarChar(5), avatarCode || null)
      .input('FacultyID', sql.Int, facultyId ? parseInt(facultyId) : null)
      .input('DepartmentID', sql.Int, departmentId ? parseInt(departmentId) : null)
      .input('Specialization', sql.NVarChar(150), specialization || null)
      .input('Rank', sql.NVarChar(50), rank || null)
      .input('Status', sql.NVarChar(20), status || null)
      .execute('sp_UpdateLecturer');

    res.json({
      success: true,
      message: 'Lecturer updated successfully.',
    });

  } catch (err) {
    handleError(res, err, 'updateLecturer');
  }
};

// ---------------- DELETE ----------------

export const deleteLecturer = async (req, res) => {
  try {
    const pool = await getPool();

    await pool.request()
      .input('LecturerID', sql.VarChar(20), req.params.id)
      .execute('sp_DeleteLecturer');

    res.json({
      success: true,
      message: 'Lecturer deleted successfully.',
    });

  } catch (err) {
    handleError(res, err, 'deleteLecturer');
  }
};

// ---------------- GET COURSES ----------------

export const getLecturerCourses = async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('LecturerID', sql.VarChar(20), req.params.id)
      .execute('sp_GetLecturerCourses');

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    handleError(res, err, 'getLecturerCourses');
  }
};