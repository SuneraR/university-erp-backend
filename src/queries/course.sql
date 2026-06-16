-- =============================================
-- COURSE STORED PROCEDURES (MS SQL SERVER / T-SQL)
-- =============================================

-- =============================================
-- GET_ALL_COURSES
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetAllCourses
    @FacultyID VARCHAR(20) = NULL,
    @DepartmentID VARCHAR(20) = NULL,
    @status VARCHAR(20) = NULL,
    @mode VARCHAR(20) = NULL,
    @search VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        courses.CourseID,
        courses.title,
        courses.credits,
        courses.level,
        courses.semester,
        courses.room,
        courses.ScheduleDays,
        courses.ScheduleTime,
        courses.description,
        courses.status,
        courses.mode,
        faculties.name,
        departments.name,
        lecturers.LecturerID,
        users.name,
        lecturers.rank
    FROM courses
    JOIN faculties ON courses.FacultyID = faculties.FacultyID
    JOIN departments ON courses.DepartmentID = departments.DepartmentID
    LEFT JOIN lecturers ON courses.LecturerID = lecturers.LecturerID
    LEFT JOIN users ON lecturers.UserID = users.UserID
    WHERE
        (@FacultyID IS NULL OR courses.FacultyID = @FacultyID)
        AND (@DepartmentID IS NULL OR courses.DepartmentID = @DepartmentID)
        AND (@status IS NULL OR courses.status = @status)
        AND (@mode IS NULL OR courses.mode = @mode)
        AND (
            @search IS NULL
            OR courses.title LIKE '%' + @search + '%'
            OR courses.CourseID LIKE '%' + @search + '%'
        )
    ORDER BY courses.CourseID;
END;
GO


-- =============================================
-- GET_COURSE_BY_ID
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetCourseById
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        courses.CourseID,
        courses.title,
        courses.credits,
        courses.level,
        courses.semester,
        courses.room,
        courses.ScheduleDays,
        courses.ScheduleTime,
        courses.description,
        courses.status,
        courses.mode,
        courses.FacultyID,
        courses.DepartmentID,
        faculties.name,
        departments.name,
        courses.LecturerID,
        users.name,
        lecturers.rank,
        lecturers.specialization
    FROM courses
    JOIN faculties ON courses.FacultyID = faculties.FacultyID
    JOIN departments ON courses.DepartmentID = departments.DepartmentID
    LEFT JOIN lecturers ON courses.LecturerID = lecturers.LecturerID
    LEFT JOIN users ON lecturers.UserID = users.UserID
    WHERE courses.CourseID = @CourseID;
END;
GO


-- =============================================
-- GET_COURSE_ENROLLMENTS
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetCourseEnrollments
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        enrollments.EnrollmentID,
        enrollments.StudentID,
        users.name,
        students.program,
        students.level,
        enrollments.semester,
        enrollments.EnrolledDate
    FROM enrollments
    JOIN students ON enrollments.StudentID = students.StudentID
    JOIN users ON students.UserID = users.UserID
    WHERE enrollments.CourseID = @CourseID
    ORDER BY users.name;
END;
GO


-- =============================================
-- GET_COURSE_EXAMS
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetCourseExams
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        examinations.ExamID,
        examinations.ExamDate,
        examinations.ExamTime,
        examinations.duration,
        examinations.hall,
        examinations.capacity,
        examinations.status,
        users.name
    FROM examinations
    LEFT JOIN lecturers ON examinations.InvigilatorID = lecturers.LecturerID
    LEFT JOIN users ON lecturers.UserID = users.UserID
    WHERE examinations.CourseID = @CourseID
    ORDER BY examinations.ExamDate;
END;
GO


-- =============================================
-- CREATE_COURSE
-- =============================================
CREATE OR ALTER PROCEDURE sp_CreateCourse
    @CourseID VARCHAR(20),
    @title VARCHAR(255),
    @FacultyID VARCHAR(20),
    @DepartmentID VARCHAR(20),
    @credits INT,
    @level INT,
    @semester INT,
    @LecturerID VARCHAR(20) = NULL,
    @room VARCHAR(50),
    @scheduleDays VARCHAR(100),
    @scheduleTime VARCHAR(50),
    @description VARCHAR(MAX),
    @status VARCHAR(20),
    @mode VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO courses (
        CourseID,
        title,
        FacultyID,
        DepartmentID,
        credits,
        level,
        semester,
        LecturerID,
        room,
        ScheduleDays,
        ScheduleTime,
        description,
        status,
        mode
    )
    VALUES (
        @CourseID,
        @title,
        @FacultyID,
        @DepartmentID,
        @credits,
        @level,
        @semester,
        @LecturerID,
        @room,
        @scheduleDays,
        @scheduleTime,
        @description,
        @status,
        @mode
    );
END;
GO


-- =============================================
-- UPDATE_COURSE
-- =============================================
CREATE OR ALTER PROCEDURE sp_UpdateCourse
    @CourseID VARCHAR(20),
    @title VARCHAR(255),
    @FacultyID VARCHAR(20),
    @DepartmentID VARCHAR(20),
    @credits INT,
    @level INT,
    @semester INT,
    @LecturerID VARCHAR(20) = NULL,
    @room VARCHAR(50),
    @scheduleDays VARCHAR(100),
    @scheduleTime VARCHAR(50),
    @description VARCHAR(MAX),
    @status VARCHAR(20),
    @mode VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE courses
    SET
        title = @title,
        FacultyID = @FacultyID,
        DepartmentID = @DepartmentID,
        credits = @credits,
        level = @level,
        semester = @semester,
        LecturerID = @LecturerID,
        room = @room,
        ScheduleDays = @scheduleDays,
        ScheduleTime = @scheduleTime,
        description = @description,
        status = @status,
        mode = @mode
    WHERE CourseID = @CourseID;
END;
GO


-- =============================================
-- DELETE_COURSE
-- =============================================
CREATE OR ALTER PROCEDURE sp_DeleteCourse
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM courses
    WHERE CourseID = @CourseID;
END;
GO


-- =============================================
-- CHECK_COURSE_EXISTS
-- =============================================
CREATE OR ALTER PROCEDURE sp_CheckCourseExists
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*)
    FROM courses
    WHERE CourseID = @CourseID;
END;
GO


-- =============================================
-- CHECK_COURSE_HAS_DEPENDENCIES
-- =============================================
CREATE OR ALTER PROCEDURE sp_CheckCourseDependencies
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*)
         FROM enrollments
         WHERE CourseID = @CourseID),

        (SELECT COUNT(*)
         FROM examinations
         WHERE CourseID = @CourseID);
END;
GO


-- =============================================
-- GET_COURSE_STATS
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetCourseStats
    @CourseID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*)
         FROM enrollments
         WHERE CourseID = @CourseID),

        (SELECT COUNT(*)
         FROM examinations
         WHERE CourseID = @CourseID
           AND status = 'Scheduled'),

        (SELECT COUNT(*)
         FROM examinations
         WHERE CourseID = @CourseID
           AND status = 'Completed'),

        (
            SELECT AVG(CAST(results.score AS DECIMAL(10,2)))
            FROM results
            INNER JOIN examinations
                ON results.ExamID = examinations.ExamID
            WHERE examinations.CourseID = @CourseID
        );
END;
GO