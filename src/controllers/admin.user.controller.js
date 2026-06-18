import { getPool, sql } from '../config/db.js';

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/users/create
//  Step 1 — Create base user account (Student or Lecturer)
// ══════════════════════════════════════════════════════════════════════════════
export const createUser = async (req, res) => {
    try {
        console.log('createUser request body:', req.body);
        const { email, name, phone, gender, dob, address, role } = req.body;

        // ── validation handled by validateCreateUser middleware ────────────────

        const avatarCode = role === 'Student' ? 'ST' : 'LC';
        const pool       = await getPool();

        const result = await pool.request()
            .input('Email',      sql.NVarChar(150), email)
            .input('Name',       sql.NVarChar(150), name)
            .input('Phone',      sql.NVarChar(30),  phone   || null)
            .input('Gender',     sql.NVarChar(10),  gender  || null)
            .input('DOB',        sql.Date,          dob     || null)
            .input('Address',    sql.NVarChar(255), address || null)
            .input('Role',       sql.NVarChar(20),  role)
            .input('AvatarCode', sql.NVarChar(5),   avatarCode)
            .execute('sp_CreateUser');

        const userId = result.recordset[0].UserID;

        return res.status(201).json({
            success: true,
            message: `User account created with role ${role}. Proceed to register as ${role}.`,
            userId,
        });

    } catch (err) {
        if (err.message?.includes('Email already exists')) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        console.error('createUser:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/users/:id/register-student
//  Step 2a — Register existing user as Student
// ══════════════════════════════════════════════════════════════════════════════
export const registerStudent = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { facultyId, departmentId, program, level } = req.body;

        const pool = await getPool();

        const result = await pool.request()
            .input('UserID',       sql.Int,          userId)
            .input('FacultyID',    sql.Int,          facultyId)
            .input('DepartmentID', sql.Int,          departmentId || null)
            .input('Program',      sql.NVarChar(150), program)
            .input('Level',        sql.Int,          level ? parseInt(level) : 100)
            .output('NewStudentID', sql.VarChar(20))
            .execute('sp_RegisterStudent');

        const studentId = result.output.NewStudentID;

        return res.status(201).json({
            success: true,
            message: 'User registered as Student successfully',
            studentId,
        });

    } catch (err) {
        if (err.message?.includes('not found or is not assigned the Student role')) {
            return res.status(400).json({ success: false, message: 'User not found or role is not Student' });
        }
        if (err.message?.includes('already registered as a Student')) {
            return res.status(400).json({ success: false, message: 'User is already registered as a Student' });
        }
        if (err.message?.includes('Invalid FacultyID')) {
            return res.status(400).json({ success: false, message: 'Invalid FacultyID' });
        }
        console.error('registerStudent:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/users/:id/register-lecturer
//  Step 2b — Register existing user as Lecturer
// ══════════════════════════════════════════════════════════════════════════════
export const registerLecturer = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { facultyId, departmentId, specialization, rank } = req.body;

        const pool = await getPool();

        const result = await pool.request()
            .input('UserID',         sql.Int,           userId)
            .input('FacultyID',      sql.Int,           facultyId)
            .input('DepartmentID',   sql.Int,           departmentId)
            .input('Specialization', sql.NVarChar(150), specialization || null)
            .input('Rank',           sql.NVarChar(50),  rank           || null)
            .output('NewLecturerID', sql.VarChar(20))
            .execute('sp_RegisterLecturer');

        const lecturerId = result.output.NewLecturerID;

        return res.status(201).json({
            success: true,
            message: 'User registered as Lecturer successfully',
            lecturerId,
        });

    } catch (err) {
        if (err.message?.includes('not found or is not assigned the Lecturer role')) {
            return res.status(400).json({ success: false, message: 'User not found or role is not Lecturer' });
        }
        if (err.message?.includes('already registered as a Lecturer')) {
            return res.status(400).json({ success: false, message: 'User is already registered as a Lecturer' });
        }
        if (err.message?.includes('Invalid FacultyID')) {
            return res.status(400).json({ success: false, message: 'Invalid FacultyID' });
        }
        console.error('registerLecturer:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
// ══════════════════════════════════════════════════════════════════════════════
//  GET /auth/users
//  List all users with optional ?role= filter
// ══════════════════════════════════════════════════════════════════════════════
export const listUsers = async (req, res) => {
    try {
        const { role } = req.query;

        // ── validation handled by validateListUsers middleware ─────────────────

        const pool    = await getPool();
        const request = pool.request();

        const query = `
            SELECT
                UserID, Email, Name, Phone,
                Gender, DOB, Address, AvatarCode,
                Role, IsActive
            FROM users
            ${role ? 'WHERE Role = @Role' : ''}
            ORDER BY UserID DESC
        `;

        if (role) request.input('Role', sql.NVarChar(20), role);

        const result = await request.query(query);

        return res.json({
            success: true,
            count: result.recordset.length,
            data:  result.recordset,
        });

    } catch (err) {
        console.error('listUsers:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /auth/users/:id
//  Get single user with role profile
// ══════════════════════════════════════════════════════════════════════════════
export const getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // ── validation handled by validateUserId middleware ────────────────────

        const pool   = await getPool();
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_GetUserById');

        if (!result.recordset.length)
            return res.status(404).json({ success: false, message: 'User not found' });

        const user = result.recordset[0];

        let profile = null;
        if (user.Role === 'Student') {
            const r = await pool.request()
                .input('UserID', sql.Int, userId)
                .execute('sp_GetStudentProfile');
            profile = r.recordset[0] ?? null;
        } else if (user.Role === 'Lecturer') {
            const r = await pool.request()
                .input('UserID', sql.Int, userId)
                .execute('sp_GetLecturerProfile');
            profile = r.recordset[0] ?? null;
        }

        return res.json({ success: true, data: { ...user, profile } });

    } catch (err) {
        console.error('getUserById:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  PATCH /auth/users/:id/toggle-active
//  Activate or deactivate any user account
// ══════════════════════════════════════════════════════════════════════════════
export const toggleUserActive = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // ── validation handled by validateUserId middleware ────────────────────

        const pool    = await getPool();
        const current = await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_GetUserById');

        if (!current.recordset.length)
            return res.status(404).json({ success: false, message: 'User not found' });

        const newState = current.recordset[0].IsActive ? 0 : 1;

        await pool.request()
            .input('UserID',   sql.Int, userId)
            .input('IsActive', sql.Bit, newState)
            .query('UPDATE users SET IsActive = @IsActive WHERE UserID = @UserID');

        // If deactivating, revoke all active sessions
        if (newState === 0) {
            await pool.request()
                .input('UserID', sql.Int, userId)
                .execute('sp_DeleteAllUserRefreshTokens');
        }

        return res.json({
            success:  true,
            message:  `User ${newState ? 'activated' : 'deactivated'} successfully`,
            isActive: Boolean(newState),
        });

    } catch (err) {
        console.error('toggleUserActive:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
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