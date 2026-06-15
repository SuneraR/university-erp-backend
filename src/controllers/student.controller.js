import { getPool, sql } from "../config/db.js";

export const getStudents = async (req, res, next) => {
  try {
    const { faculty, status, search, page = 1, limit = 6 } = req.query;

    const pool = await getPool(); 

    const offset = (page - 1) * limit;

    let query = `
      SELECT s.StudentID, u.Name, u.Email, u.Phone, f.Name AS Faculty,
             s.Program, s.Level, s.GPA, s.Status, u.AvatarCode
      FROM Students s
      JOIN Users u ON s.UserID = u.UserID
      JOIN Faculties f ON s.FacultyID = f.FacultyID
      WHERE 1=1
    `;

    if (faculty) query += ` AND f.Name = @faculty`;
    if (status) query += ` AND s.Status = @status`;
    if (search)
      query += ` AND (u.Name LIKE @search OR s.StudentID LIKE @search OR u.Email LIKE @search)`;

    query += ` ORDER BY s.StudentID OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

    const request = pool.request()
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, parseInt(limit));

    if (faculty) request.input("faculty", sql.NVarChar, faculty);
    if (status) request.input("status", sql.NVarChar, status);
    if (search) request.input("search", sql.NVarChar, `%${search}%`);

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset,
    });

  } catch (err) {
    next(err);
  }
};