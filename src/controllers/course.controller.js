import sql from "mssql";

// ── Helper ─────────────────────────────────────────────────────────────────────
function addOptionalParam(request, name, value, type) {
  if (value !== undefined && value !== null && value !== "") {
    request.input(name, type, value);
  } else {
    request.input(name, type, null);
  }
}

//  GET /courses

export const getAllCourses = async (req, res) => {
  try {
    const { facultyId, departmentId, status, mode, search } = req.query;
    const pool = req.app.get("db");

    const request = pool.request();

    // Note: Changed from sql.Int to sql.VarChar(20) to match your SP parameters
    addOptionalParam(request, "FacultyID", facultyId, sql.VarChar(20));
    addOptionalParam(request, "DepartmentID", departmentId, sql.VarChar(20));
    addOptionalParam(request, "status", status, sql.VarChar(20));
    addOptionalParam(request, "mode", mode, sql.VarChar(20));
    addOptionalParam(request, "search", search, sql.VarChar(100));

    const result = await request.execute("sp_GetAllCourses");

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (err) {
    console.error("getAllCourses:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  GET /courses/:id

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.get("db");

    const result = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_GetCourseById");

    if (!result.recordset.length) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error("getCourseById:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  GET /courses/:id/enrollments

export const getCourseEnrollments = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.get("db");

    const result = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_GetCourseEnrollments");

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (err) {
    console.error("getCourseEnrollments:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  GET /courses/:id/exams

export const getCourseExams = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.get("db");

    const result = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_GetCourseExams");

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (err) {
    console.error("getCourseExams:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  GET /courses/:id/stats

export const getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.get("db");

    const result = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_GetCourseStats");

    // Because aliases were removed from the SP, we rely on value order
    const values = Object.values(result.recordset[0] || {});

    res.json({
      success: true,
      data: {
        total_enrolled: values[0] || 0,
        upcoming_exams: values[1] || 0,
        completed_exams: values[2] || 0,
        average_score: values[3] || null,
      },
    });
  } catch (err) {
    console.error("getCourseStats:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  POST /courses

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

    if (!course_id || !title || !faculty_id || !department_id) {
      return res.status(400).json({
        success: false,
        message: "course_id, title, faculty_id and department_id are required",
      });
    }

    const pool = req.app.get("db");

    const exists = await pool
      .request()
      .input("CourseID", sql.VarChar(20), course_id)
      .execute("sp_CheckCourseExists");

    // Extracting value since alias was removed
    const existsCount = Object.values(exists.recordset[0])[0];
    if (existsCount > 0) {
      return res
        .status(409)
        .json({ success: false, message: "Course ID already exists" });
    }

    await pool
      .request()
      .input("CourseID", sql.VarChar(20), course_id)
      .input("title", sql.VarChar(255), title)
      .input("FacultyID", sql.VarChar(20), faculty_id)
      .input("DepartmentID", sql.VarChar(20), department_id)
      .input("credits", sql.Int, credits ?? null)
      .input("level", sql.Int, level ?? null)
      .input("semester", sql.Int, semester ?? null)
      .input("LecturerID", sql.VarChar(20), lecturer_id ?? null)
      .input("room", sql.VarChar(50), room ?? null)
      .input("scheduleDays", sql.VarChar(100), schedule_days ?? null)
      .input("scheduleTime", sql.VarChar(50), schedule_time ?? null)
      .input("description", sql.VarChar(sql.MAX), description ?? null)
      .input("status", sql.VarChar(20), status ?? "Active")
      .input("mode", sql.VarChar(20), mode ?? "In-person")
      .execute("sp_CreateCourse");

    res
      .status(201)
      .json({ success: true, message: "Course created", course_id });
  } catch (err) {
    console.error("createCourse:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  PUT /courses/:id

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

    if (!title || !faculty_id || !department_id) {
      return res.status(400).json({
        success: false,
        message: "title, faculty_id and department_id are required",
      });
    }

    const pool = req.app.get("db");

    const exists = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_CheckCourseExists");

    const existsCount = Object.values(exists.recordset[0])[0];
    if (existsCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .input("title", sql.VarChar(255), title)
      .input("FacultyID", sql.VarChar(20), faculty_id)
      .input("DepartmentID", sql.VarChar(20), department_id)
      .input("credits", sql.Int, credits ?? null)
      .input("level", sql.Int, level ?? null)
      .input("semester", sql.Int, semester ?? null)
      .input("LecturerID", sql.VarChar(20), lecturer_id ?? null)
      .input("room", sql.VarChar(50), room ?? null)
      .input("scheduleDays", sql.VarChar(100), schedule_days ?? null)
      .input("scheduleTime", sql.VarChar(50), schedule_time ?? null)
      .input("description", sql.VarChar(sql.MAX), description ?? null)
      .input("status", sql.VarChar(20), status ?? "Active")
      .input("mode", sql.VarChar(20), mode ?? "In-person")
      .execute("sp_UpdateCourse");

    res.json({ success: true, message: "Course updated" });
  } catch (err) {
    console.error("updateCourse:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

//  DELETE /courses/:id

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.app.get("db");

    const exists = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_CheckCourseExists");

    const existsCount = Object.values(exists.recordset[0])[0];
    if (existsCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const deps = await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_CheckCourseDependencies");

    // Extracting values without aliases
    const depValues = Object.values(deps.recordset[0]);
    const enrollment_count = depValues[0];
    const exam_count = depValues[1];

    if (enrollment_count > 0 || exam_count > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete course with existing enrollments or exams",
        details: { enrollment_count, exam_count },
      });
    }

    await pool
      .request()
      .input("CourseID", sql.VarChar(20), id)
      .execute("sp_DeleteCourse");

    res.json({ success: true, message: "Course deleted" });
  } catch (err) {
    console.error("deleteCourse:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
