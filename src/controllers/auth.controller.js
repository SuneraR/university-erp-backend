import { getPool, sql } from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ── Token helpers ──────────────────────────────────────────────────────────────
function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
}

function refreshTokenExpiryDate() {
  const days = parseInt(process.env.JWT_REFRESH_DAYS || "7", 10);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:
      parseInt(process.env.JWT_REFRESH_DAYS || "7", 10) * 24 * 60 * 60 * 1000, // ← synced with env
  };
}

// ── Build role-specific profile ────────────────────────────────────────────────
async function getRoleProfile(pool, userId, role) {
  if (role === "Student") {
    const r = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_GetStudentProfile");
    return r.recordset[0] ?? null;
  }
  if (role === "Lecturer") {
    const r = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_GetLecturerProfile");
    return r.recordset[0] ?? null;
  }
  return null; // Admin — no extra profile table
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/register-admin
//  Now uses sp_CreateAdminUser instead of inline INSERT
// ══════════════════════════════════════════════════════════════════════════════
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, gender, dob, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const pool = await getPool();
    const hash = await bcrypt.hash(password, 12); // ← consistent cost factor

    const result = await pool
      .request()
      .input("Email", sql.NVarChar(150), email)
      .input("PasswordHash", sql.NVarChar(255), hash)
      .input("Name", sql.NVarChar(150), name)
      .input("Phone", sql.NVarChar(30), phone || null)
      .input("Gender", sql.NVarChar(10), gender || null)
      .input("DOB", sql.Date, dob || null)
      .input("Address", sql.NVarChar(255), address || null)
      .execute("sp_CreateAdminUser"); // ← SP handles email check + INSERT

    const userId = result.recordset[0].UserID;

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      userId,
    });
  } catch (err) {
    // sp_CreateAdminUser raises 'Email already exists' as error
    if (err.message?.includes("Email already exists")) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }
    console.error("registerAdmin:", err);
    return res.status(500).json({ success: false, message: "Server error" });
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
        message: "Email and password are required",
      });
    }

    const pool = await getPool();

    const userResult = await pool
      .request()
      .input("email", sql.VarChar(255), email)
      .execute("sp_GetUserByEmail");

    if (!userResult.recordset.length) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const user = userResult.recordset[0];

    if (!user.IsActive) {
      return res
        .status(403)
        .json({ success: false, message: "Account is not activated" });
    }

    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const profile = await getRoleProfile(pool, user.UserID, user.role);

    const tokenPayload = {
      userId: user.UserID,
      name: user.Name,
      email: user.email, // ← lowercase: matches sp_GetUserByEmail column
      role: user.role, // ← lowercase: matches sp_GetUserByEmail column
      ...(profile?.StudentID && { studentId: profile.StudentID }),
      ...(profile?.LecturerID && { lecturerId: profile.LecturerID }),
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user.UserID });

    await pool
      .request()
      .input("UserID", sql.Int, user.UserID)
      .input("token", sql.VarChar(512), refreshToken)
      .input("expiresAt", sql.DateTime, refreshTokenExpiryDate())
      .execute("sp_StoreRefreshToken");

    res.cookie("refreshToken", refreshToken, cookieOptions()); // ← shared helper

    const { PasswordHash, ...safeUser } = user;

    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
      user: { ...safeUser, profile },
    });
  } catch (err) {
    console.error("login:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/refresh
//  Now rotates the refresh token on every call
// ══════════════════════════════════════════════════════════════════════════════
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No refresh token provided" });

    // 1. Verify JWT signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }

    // 2. Confirm token exists in DB
    const pool = await getPool();
    const result = await pool
      .request()
      .input("token", sql.VarChar(512), token)
      .execute("sp_GetRefreshToken");

    if (!result.recordset.length)
      return res
        .status(401)
        .json({ success: false, message: "Refresh token revoked or expired" });

    const stored = result.recordset[0];

    // 3. Issue new access token
    const accessToken = generateAccessToken({
      userId: stored.UserID,
      name: stored.Name,
      email: stored.email,
      role: stored.role,
    });

    // 4. Rotate refresh token ← new
    const newRefreshToken = generateRefreshToken({ userId: stored.UserID });

    await pool
      .request()
      .input("oldToken", sql.VarChar(512), token)
      .input("newToken", sql.VarChar(512), newRefreshToken)
      .input("UserID", sql.Int, stored.UserID)
      .input("expiresAt", sql.DateTime, refreshTokenExpiryDate())
      .execute("sp_RotateRefreshToken");

    res.cookie("refreshToken", newRefreshToken, cookieOptions()); // ← set new cookie

    return res.json({ success: true, accessToken });
  } catch (err) {
    console.error("refreshToken:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
      await pool
        .request()
        .input("token", sql.VarChar(512), token)
        .execute("sp_DeleteRefreshToken");
    }

    res.clearCookie("refreshToken", cookieOptions());
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("logout:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/logout-all
// ══════════════════════════════════════════════════════════════════════════════
export const logoutAll = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const pool = await getPool();
    await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_DeleteAllUserRefreshTokens");

    res.clearCookie("refreshToken", cookieOptions());
    res.json({ success: true, message: "Logged out from all devices" });
  } catch (err) {
    console.error("logoutAll:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  GET /auth/me
// ══════════════════════════════════════════════════════════════════════════════
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const pool = await getPool();
    const result = await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_GetUserById");

    if (!result.recordset.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const user = result.recordset[0];
    const profile = await getRoleProfile(pool, userId, user.role);

    return res.json({ success: true, data: { ...user, profile } });
  } catch (err) {
    console.error("getMe:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });

    if (newPassword.length < 8)
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });

    if (currentPassword === newPassword)
      return res.status(400).json({
        success: false,
        message: "New password must differ from current password",
      }); // ← new

    const pool = await getPool();

    const result = await pool
      .request()
      .input("email", sql.VarChar(255), req.user.email)
      .execute("sp_GetUserByEmail"); // ← reuse SP instead of inline query

    if (!result.recordset.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const valid = await bcrypt.compare(
      currentPassword,
      result.recordset[0].PasswordHash,
    );
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 12);

    await pool
      .request()
      .input("UserID", sql.Int, userId)
      .input("passwordHash", sql.VarChar(255), newHash)
      .execute("sp_UpdatePassword");

    await pool
      .request()
      .input("UserID", sql.Int, userId)
      .execute("sp_DeleteAllUserRefreshTokens");

    res.clearCookie("refreshToken", cookieOptions());
    return res.json({
      success: true,
      message: "Password changed. Please log in again.",
    });
  } catch (err) {
    console.error("changePassword:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  POST /auth/activate
// ══════════════════════════════════════════════════════════════════════════════
export const activateAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "email and password are required" });

    if (password.length < 8)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });

    const pool = await getPool();

    // Reuse sp_GetUserByEmail instead of SELECT *
    const userResult = await pool
      .request()
      .input("email", sql.VarChar(255), email)
      .execute("sp_GetUserByEmail");

    if (!userResult.recordset.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const user = userResult.recordset[0];

    // if (user.IsActive)
    //     return res.status(400).json({ success: false, message: 'Account already activated' });

    const hash = await bcrypt.hash(password, 12); // ← consistent cost factor

    await pool
      .request()
      .input("UserID", sql.Int, user.UserID)
      .input("passwordHash", sql.VarChar(255), hash)
      .execute("sp_UpdatePassword"); // ← reuse SP + separate IsActive update below

    // Activate the account
    await pool
      .request()
      .input("UserID", sql.Int, user.UserID)
      .query("UPDATE Users SET IsActive = 1 WHERE UserID = @UserID");

    return res.json({
      success: true,
      message: "Account activated successfully",
    });
  } catch (err) {
    console.error("activateAccount:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
