import { getPool, sql } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Token helpers ──────────────────────────────────────────────────────────────
function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    });
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    });
}

function refreshTokenExpiryDate() {
    const days = parseInt(process.env.JWT_REFRESH_DAYS || '7', 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

// ── Build role-specific profile ────────────────────────────────────────────────
async function getRoleProfile(pool, userId, role) {
    if (role === 'Student') {
        const r = await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_GetStudentProfile');
        return r.recordset[0] ?? null;
    }
    if (role === 'Lecturer') {
        const r = await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_GetLecturerProfile');
        return r.recordset[0] ?? null;
    }
    return null; // Admin — no extra profile table
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/register-admin
// ══════════════════════════════════════════════════════════════════════════════
export const registerAdmin = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            gender,
            dob,
            address
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'name, email, password are required'
            });
        }

        const pool = await getPool();

        // 1. check email exists
        const exists = await pool.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT 1 FROM Users WHERE Email = @email');

        if (exists.recordset.length) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // 2. hash password
        const hash = await bcrypt.hash(password, 10);

        // 3. insert admin
        const result = await pool.request()
            .input('Email', sql.NVarChar(150), email)
            .input('PasswordHash', sql.NVarChar(255), hash)
            .input('Phone', sql.NVarChar(30), phone || null)
            .input('Name', sql.NVarChar(150), name)
            .input('Gender', sql.NVarChar(10), gender || null)
            .input('DOB', sql.Date, dob || null)
            .input('Address', sql.NVarChar(255), address || null)
            .input('AvatarCode', sql.NVarChar(5), 'AD')
            .input('Role', sql.NVarChar(20), 'Admin')
            .input('IsActive', sql.Bit, 1)
            .query(`
                INSERT INTO Users (
                    Email, PasswordHash, Phone, Name,
                    Gender, DOB, Address, AvatarCode,
                    Role, IsActive
                )
                OUTPUT INSERTED.UserID
                VALUES (
                    @Email, @PasswordHash, @Phone, @Name,
                    @Gender, @DOB, @Address, @AvatarCode,
                    @Role, @IsActive
                )
            `);

        const userId = result.recordset[0].UserID;

        return res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            userId
        });

    } catch (err) {
        console.error('registerAdmin:', err);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/login
// ══════════════════════════════════════════════════════════════════════════════
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const pool = await getPool();

        // 1. Fetch user
        const userResult = await pool.request()
            .input('email', sql.VarChar(255), email)
            .execute('sp_GetUserByEmail');

        if (!userResult.recordset.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = userResult.recordset[0];

        // 2. Check account active
        if (user.IsActive === 0) {
            return res.status(403).json({
                success: false,
                message: 'Account is not activated'
            });
        }

        // 3. Verify password
        const valid = await bcrypt.compare(password, user.PasswordHash);
        if (!valid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 4. Fetch role profile
        const profile = await getRoleProfile(pool, user.UserID, user.Role);

        // 5. Token payload
        const tokenPayload = {
            userId: user.UserID,
            email: user.Email,
            role: user.Role,
            ...(profile?.StudentID && { studentId: profile.StudentID }),
            ...(profile?.LecturerID && { lecturerId: profile.LecturerID }),
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ userId: user.UserID });

        // 6. Save refresh token
        await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .input('token', sql.VarChar(512), refreshToken)
            .input('expiresAt', sql.DateTime, refreshTokenExpiryDate())
            .execute('sp_StoreRefreshToken');

        // 7. Set cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // 8. Remove sensitive data
        const { PasswordHash, ...safeUser } = user;

        return res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            user: {
                ...safeUser,
                profile
            }
        });

    } catch (err) {
        console.error('login:', err);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message
        });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/refresh
// ══════════════════════════════════════════════════════════════════════════════
export const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token)
            return res.status(401).json({ success: false, message: 'No refresh token provided' });

        // 1. Verify JWT signature
        try {
            jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        // 2. Confirm token exists in DB and is not expired
        const pool = await getPool();
        const result = await pool.request()
            .input('token', sql.VarChar(512), token)
            .execute('sp_GetRefreshToken');

        if (!result.recordset.length)
            return res.status(401).json({ success: false, message: 'Refresh token revoked or expired' });

        const stored = result.recordset[0];

        // 3. Issue new access token
        const accessToken = generateAccessToken({
            userId: stored.UserID,
            email:  stored.email,
            role:   stored.role,
        });

        res.json({ success: true, accessToken });
    } catch (err) {
        console.error('refreshToken:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/logout
// ══════════════════════════════════════════════════════════════════════════════
export const logout = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;

        if (token) {
            const pool = await getPool();
            await pool.request()
                .input('token', sql.VarChar(512), token)
                .execute('sp_DeleteRefreshToken');
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure:   process.env.NODE_ENV === 'production',
        });
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('logout:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/logout-all   (revoke all sessions)
// ══════════════════════════════════════════════════════════════════════════════
export const logoutAll = async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });

        const pool = await getPool();
        await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_DeleteAllUserRefreshTokens');

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure:   process.env.NODE_ENV === 'production',
        });
        res.json({ success: true, message: 'Logged out from all devices' });
    } catch (err) {
        console.error('logoutAll:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /auth/me   (current user info)
// ══════════════════════════════════════════════════════════════════════════════
export const getMe = async (req, res) => {
    try {
        const userId = req.user?.userId;

        const pool = await getPool();
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_GetUserById');

        if (!result.recordset.length)
            return res.status(404).json({ success: false, message: 'User not found' });

        const user    = result.recordset[0];
        const profile = await getRoleProfile(pool, userId, user.role);

        res.json({ success: true, data: { ...user, profile } });
    } catch (err) {
        console.error('getMe:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/change-password
// ══════════════════════════════════════════════════════════════════════════════
export const changePassword = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword)
            return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });

        if (newPassword.length < 8)
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

        const pool = await getPool();
        
        // Inline check since the stored procedure for getting user does not return the hash for security
        const result = await pool.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT PasswordHash
                FROM Users
                WHERE UserID = @UserID
            `);
        if (!result.recordset.length)
            return res.status(404).json({ success: false, message: 'User not found' });

        const { PasswordHash } = result.recordset[0];
        const valid = await bcrypt.compare(
                currentPassword,
                PasswordHash
            );

        if (!valid)
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        const newHash = await bcrypt.hash(newPassword, 12);

        await pool.request()
            .input('UserID',       sql.Int,          userId)
            .input('passwordHash', sql.VarChar(255), newHash)
            .execute('sp_UpdatePassword');

        // Invalidate all other sessions
        await pool.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_DeleteAllUserRefreshTokens');

        res.json({ success: true, message: 'Password changed. Please log in again.' });
    } catch (err) {
        console.error('changePassword:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};


export const activateAccount = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'email and password required'
            });
        }

        const pool = await getPool();

        // check user
        const userResult = await pool.request()
            .input('email', sql.NVarChar(150), email)
            .query('SELECT * FROM Users WHERE Email = @email');

        if (!userResult.recordset.length) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.recordset[0];

        if (user.IsActive === 1) {
            return res.status(400).json({
                success: false,
                message: 'Account already activated'
            });
        }

        const hash = await bcrypt.hash(password, 10);

        await pool.request()
            .input('UserID', sql.Int, user.UserID)
            .input('PasswordHash', sql.NVarChar(255), hash)
            .query(`
                UPDATE Users
                SET PasswordHash = @PasswordHash,
                    IsActive = 1
                WHERE UserID = @UserID
            `);

        res.json({
            success: true,
            message: 'Account activated successfully'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};