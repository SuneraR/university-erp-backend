import { getPool, sql } from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  GET /courses
// ══════════════════════════════════════════════════════════════════════════════
export const getAllCourses = async (req, res) => {
    try {
        const pool   = await getPool();
        const result = await pool.request().execute('sp_GetAllCourses');

        return res.json({
            success: true,
            count: result.recordset.length,
            data:  result.recordset,
        });

    } catch (err) {
        console.error('getAllCourses:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /courses/:id
// ══════════════════════════════════════════════════════════════════════════════
export const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool   = await getPool();            // ← was req.app.get('db')

        const result = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_GetCourseById');

        if (!result.recordset.length)
            return res.status(404).json({ success: false, message: 'Course not found' });

        return res.json({ success: true, data: result.recordset[0] });

    } catch (err) {
        console.error('getCourseById:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /courses/:id/enrollments
// ══════════════════════════════════════════════════════════════════════════════
export const getCourseEnrollments = async (req, res) => {
    try {
        const { id } = req.params;
        const pool   = await getPool();            // ← was req.app.get('db')

        const result = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_GetCourseEnrollments');

        return res.json({
            success: true,
            count: result.recordset.length,
            data:  result.recordset,
        });

    } catch (err) {
        console.error('getCourseEnrollments:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /courses/:id/exams
// ══════════════════════════════════════════════════════════════════════════════
export const getCourseExams = async (req, res) => {
    try {
        const { id } = req.params;
        const pool   = await getPool();            // ← was req.app.get('db')

        const result = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_GetCourseExams');

        return res.json({
            success: true,
            count: result.recordset.length,
            data:  result.recordset,
        });

    } catch (err) {
        console.error('getCourseExams:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /courses/:id/stats
// ══════════════════════════════════════════════════════════════════════════════
export const getCourseStats = async (req, res) => {
    try {
        const { id } = req.params;
        const pool   = await getPool();            // ← was req.app.get('db')

        const result = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_GetCourseStats');

        if (!result.recordset.length)
            return res.status(404).json({ success: false, message: 'Course not found' });

        // Rely on column order since SP has no aliases
        const values = Object.values(result.recordset[0]);

        return res.json({
            success: true,
            data: {
                total_enrolled:  values[0] ?? 0,
                upcoming_exams:  values[1] ?? 0,
                completed_exams: values[2] ?? 0,
                average_score:   values[3] ?? null,
            },
        });

    } catch (err) {
        console.error('getCourseStats:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /courses
// ══════════════════════════════════════════════════════════════════════════════
export const createCourse = async (req, res) => {
    try {
        const {
            course_id,
            title,
            faculty_id,
            department_id,
            credits,
            level,
            semester,
            lecturer_id,
            room,
            schedule_days,
            schedule_time,
            description,
            status,
            mode,
        } = req.body;

        // ── validation handled by validateCreateCourse middleware ──────────────

        const pool = await getPool();               // ← was req.app.get('db')

        // Check course ID uniqueness
        const exists      = await pool.request()
            .input('CourseID', sql.VarChar(20), course_id)
            .execute('sp_CheckCourseExists');

        const existsCount = Object.values(exists.recordset[0])[0];
        if (existsCount > 0)
            return res.status(409).json({ success: false, message: 'Course ID already exists' });

        await pool.request()
            .input('CourseID',     sql.VarChar(20),      course_id)
            .input('title',        sql.VarChar(255),     title)
            .input('FacultyID',    sql.Int,              faculty_id)      // ← VarChar(20) → Int
            .input('DepartmentID', sql.Int,              department_id)   // ← VarChar(20) → Int
            .input('credits',      sql.Int,              credits      ?? null)
            .input('level',        sql.Int,              level        ?? null)
            .input('semester',     sql.Int,              semester     ?? null)
            .input('LecturerID',   sql.Int,              lecturer_id  ?? null) // ← VarChar(20) → Int
            .input('room',         sql.VarChar(50),      room         ?? null)
            .input('scheduleDays', sql.VarChar(100),     schedule_days ?? null)
            .input('scheduleTime', sql.VarChar(50),      schedule_time ?? null)
            .input('description',  sql.VarChar(sql.MAX), description  ?? null)
            .input('status',       sql.VarChar(20),      status       ?? 'Active')
            .input('mode',         sql.VarChar(20),      mode         ?? 'In-person')
            .execute('sp_CreateCourse');

        return res.status(201).json({
            success:   true,
            message:   'Course created successfully',
            course_id,
        });

    } catch (err) {
        console.error('createCourse:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PUT /courses/:id
// ══════════════════════════════════════════════════════════════════════════════
export const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            faculty_id,
            department_id,
            credits,
            level,
            semester,
            lecturer_id,
            room,
            schedule_days,
            schedule_time,
            description,
            status,
            mode,
        } = req.body;

        // ── validation handled by validateUpdateCourse middleware ──────────────

        const pool = await getPool();               // ← was req.app.get('db')

        const exists      = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_CheckCourseExists');

        const existsCount = Object.values(exists.recordset[0])[0];
        if (existsCount === 0)
            return res.status(404).json({ success: false, message: 'Course not found' });

        await pool.request()
            .input('CourseID',     sql.VarChar(20),      id)
            .input('title',        sql.VarChar(255),     title)
            .input('FacultyID',    sql.Int,              faculty_id)      // ← VarChar(20) → Int
            .input('DepartmentID', sql.Int,              department_id)   // ← VarChar(20) → Int
            .input('credits',      sql.Int,              credits      ?? null)
            .input('level',        sql.Int,              level        ?? null)
            .input('semester',     sql.Int,              semester     ?? null)
            .input('LecturerID',   sql.Int,              lecturer_id  ?? null) // ← VarChar(20) → Int
            .input('room',         sql.VarChar(50),      room         ?? null)
            .input('scheduleDays', sql.VarChar(100),     schedule_days ?? null)
            .input('scheduleTime', sql.VarChar(50),      schedule_time ?? null)
            .input('description',  sql.VarChar(sql.MAX), description  ?? null)
            .input('status',       sql.VarChar(20),      status       ?? 'Active')
            .input('mode',         sql.VarChar(20),      mode         ?? 'In-person')
            .execute('sp_UpdateCourse');

        return res.json({ success: true, message: 'Course updated successfully' });

    } catch (err) {
        console.error('updateCourse:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  DELETE /courses/:id
// ══════════════════════════════════════════════════════════════════════════════
export const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const pool   = await getPool();             // ← was req.app.get('db')

        const exists      = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_CheckCourseExists');

        const existsCount = Object.values(exists.recordset[0])[0];
        if (existsCount === 0)
            return res.status(404).json({ success: false, message: 'Course not found' });

        const deps      = await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_CheckCourseDependencies');

        const depValues        = Object.values(deps.recordset[0]);
        const enrollment_count = depValues[0];
        const exam_count       = depValues[1];

        if (enrollment_count > 0 || exam_count > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete course with existing enrollments or exams',
                details: { enrollment_count, exam_count },
            });
        }

        await pool.request()
            .input('CourseID', sql.VarChar(20), id)
            .execute('sp_DeleteCourse');

        return res.json({ success: true, message: 'Course deleted successfully' });

    } catch (err) {
        console.error('deleteCourse:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};