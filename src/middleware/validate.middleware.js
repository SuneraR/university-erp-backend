// ══════════════════════════════════════════════════════════════════════════════
//  Input validation middleware
// ══════════════════════════════════════════════════════════════════════════════

// ── Helpers ───────────────────────────────────────────────────────────────────
const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone) =>
    /^\+?[\d\s\-()]{7,20}$/.test(phone);

// ══════════════════════════════════════════════════════════════════════════════
//  validateCreateUser
//  POST /admin/users/create
// ══════════════════════════════════════════════════════════════════════════════
export const validateCreateUser = (req, res, next) => {
    const { email, name, role, phone, gender, dob } = req.body;
    const errors = [];

    if (!email)                          errors.push('email is required');
    else if (!isValidEmail(email))       errors.push('email is invalid');

    if (!name)                           errors.push('name is required');
    else if (name.trim().length < 2)     errors.push('name must be at least 2 characters');

    if (!role)                           errors.push('role is required');
    else if (!['Student', 'Lecturer'].includes(role))
                                         errors.push('role must be Student or Lecturer');

    if (phone && !isValidPhone(phone))   errors.push('phone number is invalid');

    if (gender && !['Male', 'Female', 'Other'].includes(gender))
                                         errors.push('gender must be Male, Female, or Other');

    if (dob) {
        const date = new Date(dob);
        if (isNaN(date.getTime()))       errors.push('dob is invalid date');
        else if (date >= new Date())     errors.push('dob must be in the past');
    }

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateRegisterStudent
//  POST /admin/users/:id/register-student
// ══════════════════════════════════════════════════════════════════════════════
export const validateRegisterStudent = (req, res, next) => {
    const { facultyId, program, departmentId, level } = req.body;
    const errors = [];

    if (!facultyId)                          errors.push('facultyId is required');
    else if (!Number.isInteger(Number(facultyId)) || Number(facultyId) < 1)
                                             errors.push('facultyId must be a positive integer');

    if (!program)                            errors.push('program is required');
    else if (program.trim().length < 2)      errors.push('program must be at least 2 characters');

    if (departmentId !== undefined && departmentId !== null) {
        if (!Number.isInteger(Number(departmentId)) || Number(departmentId) < 1)
                                             errors.push('departmentId must be a positive integer');
    }

    if (level && !['L3', 'L4', 'L5', 'L6', 'L7'].includes(level))
                                             errors.push('level must be one of L3, L4, L5, L6, L7');

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateRegisterLecturer
//  POST /admin/users/:id/register-lecturer
// ══════════════════════════════════════════════════════════════════════════════
export const validateRegisterLecturer = (req, res, next) => {
    const { facultyId, departmentId, rank } = req.body;
    const errors = [];

    if (!facultyId)                          errors.push('facultyId is required');
    else if (!Number.isInteger(Number(facultyId)) || Number(facultyId) < 1)
                                             errors.push('facultyId must be a positive integer');

    if (!departmentId)                       errors.push('departmentId is required');
    else if (!Number.isInteger(Number(departmentId)) || Number(departmentId) < 1)
                                             errors.push('departmentId must be a positive integer');

    if (rank && !['Instructor', 'Assistant Professor', 'Associate Professor', 'Professor'].includes(rank))
                                             errors.push('rank must be Instructor, Assistant Professor, Associate Professor, or Professor');

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateUserId
//  Any route with :id param
// ══════════════════════════════════════════════════════════════════════════════
export const validateUserId = (req, res, next) => {
    const id = parseInt(req.params.id);

    if (isNaN(id) || id < 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID',
        });
    }

    req.params.id = id; // normalize to integer
    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateListUsers
//  GET /admin/users?role=
// ══════════════════════════════════════════════════════════════════════════════
export const validateListUsers = (req, res, next) => {
    const { role } = req.query;

    if (role && !['Student', 'Lecturer', 'Admin'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'role query must be Student, Lecturer, or Admin',
        });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateLogin
//  POST /auth/login
// ══════════════════════════════════════════════════════════════════════════════
export const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email)                        errors.push('email is required');
    else if (!isValidEmail(email))     errors.push('email is invalid');

    if (!password)                     errors.push('password is required');

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateActivateAccount
//  POST /auth/activate
// ══════════════════════════════════════════════════════════════════════════════
export const validateActivateAccount = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email)                        errors.push('email is required');
    else if (!isValidEmail(email))     errors.push('email is invalid');

    if (!password)                     errors.push('password is required');
    else if (password.length < 8)      errors.push('password must be at least 8 characters');

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateChangePassword
//  POST /auth/change-password
// ══════════════════════════════════════════════════════════════════════════════
export const validateChangePassword = (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const errors = [];

    if (!currentPassword)              errors.push('currentPassword is required');

    if (!newPassword)                  errors.push('newPassword is required');
    else if (newPassword.length < 8)   errors.push('newPassword must be at least 8 characters');

    if (currentPassword && newPassword && currentPassword === newPassword)
                                       errors.push('newPassword must differ from currentPassword');

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  validateRegisterAdmin
//  POST /auth/register-admin
// ══════════════════════════════════════════════════════════════════════════════
export const validateRegisterAdmin = (req, res, next) => {
    const { email, name, password, phone, gender, dob } = req.body;
    const errors = [];

    if (!email)                        errors.push('email is required');
    else if (!isValidEmail(email))     errors.push('email is invalid');

    if (!name)                         errors.push('name is required');
    else if (name.trim().length < 2)   errors.push('name must be at least 2 characters');

    if (!password)                     errors.push('password is required');
    else if (password.length < 8)      errors.push('password must be at least 8 characters');

    if (phone && !isValidPhone(phone)) errors.push('phone number is invalid');

    if (gender && !['Male', 'Female', 'Other'].includes(gender))
                                       errors.push('gender must be Male, Female, or Other');

    if (dob) {
        const date = new Date(dob);
        if (isNaN(date.getTime()))     errors.push('dob is invalid date');
        else if (date >= new Date())   errors.push('dob must be in the past');
    }

    if (errors.length) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};