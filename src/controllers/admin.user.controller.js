// 'use strict';

// import { getPool, sql } from '../config/db.js';
// import bcrypt from 'bcryptjs';

// export const createAccount = async (req, res) => {
//     try {
//         const {
//             name,
//             email,
//             role,
//             phone,
//             gender,
//             dob,
//             address,
//             facultyId,
//             departmentId,
//             studentId,
//             lecturerId
//         } = req.body;

//         if (!name || !email || !role) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'name, email, role are required'
//             });
//         }

//         const pool = await getPool();

//         // 1. Check email exists
//         const exists = await pool.request()
//             .input('email', sql.NVarChar(150), email)
//             .query('SELECT 1 FROM Users WHERE Email = @email');

//         if (exists.recordset.length) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Email already exists'
//             });
//         }

//         // 2. Generate temporary password
//         const tempPassword = Math.random().toString(36).slice(-8);
//         const hash = await bcrypt.hash(tempPassword, 10);

//         // 3. Create user
//         const userResult = await pool.request()
//             .input('Email', sql.NVarChar(150), email)
//             .input('PasswordHash', sql.NVarChar(255), hash)
//             .input('Phone', sql.NVarChar(30), phone || null)
//             .input('Name', sql.NVarChar(150), name)
//             .input('Gender', sql.NVarChar(10), gender || null)
//             .input('DOB', sql.Date, dob || null)
//             .input('Address', sql.NVarChar(255), address || null)
//             .input('AvatarCode', sql.NVarChar(5), null)
//             .input('Role', sql.NVarChar(20), role)
//             .input('IsActive', sql.Bit, 1)
//             .query(`
//                 INSERT INTO Users (
//                     Email, PasswordHash, Phone, Name,
//                     Gender, DOB, Address, AvatarCode,
//                     Role, IsActive
//                 )
//                 OUTPUT INSERTED.UserID
//                 VALUES (
//                     @Email, @PasswordHash, @Phone, @Name,
//                     @Gender, @DOB, @Address, @AvatarCode,
//                     @Role, @IsActive
//                 )
//             `);

//         const userId = userResult.recordset[0].UserID;

//         // 4. Create Lecturer or Student profile
//         if (role === 'Student') {
//             await pool.request()
//                 .input('StudentID', sql.VarChar(20), studentId)
//                 .input('UserID', sql.Int, userId)
//                 .input('FacultyID', sql.Int, facultyId)
//                 .input('DepartmentID', sql.Int, departmentId)
//                 .query(`
//                     INSERT INTO Students (StudentID, UserID, FacultyID, DepartmentID)
//                     VALUES (@StudentID, @UserID, @FacultyID, @DepartmentID)
//                 `);
//         }

//         if (role === 'Lecturer') {
//             await pool.request()
//                 .input('LecturerID', sql.VarChar(20), lecturerId)
//                 .input('UserID', sql.Int, userId)
//                 .input('FacultyID', sql.Int, facultyId)
//                 .input('DepartmentID', sql.Int, departmentId)
//                 .query(`
//                     INSERT INTO Lecturers (LecturerID, UserID, FacultyID, DepartmentID)
//                     VALUES (@LecturerID, @UserID, @FacultyID, @DepartmentID)
//                 `);
//         }

//         res.status(201).json({
//             success: true,
//             message: 'Account created successfully',
//             userId,
//             credentials: {
//                 email,
//                 password: tempPassword
//             }
//         });

//     } catch (err) {
//         console.error('createAccount:', err);
//         res.status(500).json({
//             success: false,
//             message: err.message
//         });
//     }
// };

// // ---------------- CREATE USER (STUDENT / LECTURER) ----------------
// export const createUser = async (req, res) => {
//     try {
//         const {
//             name,
//             email,
//             role,          // Student | Lecturer
//             phone,
//             facultyId,
//             departmentId,
//             studentId,
//             lecturerId
//         } = req.body;

//         if (!name || !email || !role) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'name, email, role required'
//             });
//         }

//         const pool = await getPool();

//         // check email exists
//         const check = await pool.request()
//             .input('email', sql.NVarChar(150), email)
//             .query('SELECT 1 FROM Users WHERE Email = @email');

//         if (check.recordset.length) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Email already exists'
//             });
//         }

//         // generate temporary password
//         const tempPassword = Math.random().toString(36).slice(-8);
//         const passwordHash = await bcrypt.hash(tempPassword, 10);

//         // create user
//         const userResult = await pool.request()
//             .input('Email', sql.NVarChar(150), email)
//             .input('Name', sql.NVarChar(150), name)
//             .input('Phone', sql.NVarChar(30), phone || null)
//             .input('Role', sql.NVarChar(20), role)
//             .input('PasswordHash', sql.NVarChar(255), passwordHash)
//             .query(`
//                 INSERT INTO Users (Email, Name, Phone, Role, PasswordHash, IsActive)
//                 OUTPUT INSERTED.UserID
//                 VALUES (@Email, @Name, @Phone, @Role, @PasswordHash, 1)
//             `);

//         const userId = userResult.recordset[0].UserID;

//         // create profile based on role
//         if (role === 'Student') {
//             await pool.request()
//                 .input('StudentID', sql.VarChar(20), studentId)
//                 .input('UserID', sql.Int, userId)
//                 .input('FacultyID', sql.Int, facultyId)
//                 .input('DepartmentID', sql.Int, departmentId)
//                 .query(`
//                     INSERT INTO Students (StudentID, UserID, FacultyID, DepartmentID)
//                     VALUES (@StudentID, @UserID, @FacultyID, @DepartmentID)
//                 `);
//         }

//         if (role === 'Lecturer') {
//             await pool.request()
//                 .input('LecturerID', sql.VarChar(20), lecturerId)
//                 .input('UserID', sql.Int, userId)
//                 .input('FacultyID', sql.Int, facultyId)
//                 .input('DepartmentID', sql.Int, departmentId)
//                 .query(`
//                     INSERT INTO Lecturers (LecturerID, UserID, FacultyID, DepartmentID)
//                     VALUES (@LecturerID, @UserID, @FacultyID, @DepartmentID)
//                 `);
//         }

//         res.status(201).json({
//             success: true,
//             message: 'User created successfully',
//             loginCredentials: {
//                 email,
//                 password: tempPassword
//             },
//             userId
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({
//             success: false,
//             message: err.message
//         });
//     }
// };