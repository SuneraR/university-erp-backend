-- ============================================================
--  University ERP – Student-Related Stored Procedures
--  Database: UniversityERP
-- ============================================================
USE UniversityERP;
GO

-- ============================================================
-- 1. LIST ALL STUDENTS  (search + filter + pagination)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudents
    @Search      NVARCHAR(200) = NULL,
    @Faculty     NVARCHAR(100) = NULL,
    @Status      NVARCHAR(20)  = NULL,
    @Page        INT           = 1,
    @PageSize    INT           = 10
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT
        s.StudentID,
        u.Name,
        u.Email,
        u.Phone,
        u.Gender,
        u.DOB,
        u.Address,
        u.AvatarCode,
        f.Name   AS Faculty,
        d.Name   AS Department,
        s.Program,
        s.Level,
        s.GPA,
        s.Status,
        s.EnrolledDate,
        COUNT(*) OVER () AS TotalCount
    FROM Students s
    JOIN Users       u ON u.UserID       = s.UserID
    JOIN Faculties   f ON f.FacultyID    = s.FacultyID
    LEFT JOIN Departments d ON d.DepartmentID = s.DepartmentID
    WHERE
        (@Search  IS NULL OR u.Name      LIKE '%' + @Search + '%'
                          OR s.StudentID LIKE '%' + @Search + '%'
                          OR u.Email     LIKE '%' + @Search + '%')
        AND (@Faculty IS NULL OR f.Name  = @Faculty)
        AND (@Status  IS NULL OR s.Status = @Status)
    ORDER BY s.StudentID
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

-- ============================================================
-- 2. GET SINGLE STUDENT BY ID
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentByID
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.StudentID,
        u.Name,
        u.Email,
        u.Phone,
        u.Gender,
        u.DOB,
        u.Address,
        u.AvatarCode,
        f.Name   AS Faculty,
        d.Name   AS Department,
        s.Program,
        s.Level,
        s.GPA,
        s.Status,
        s.EnrolledDate,
        u.CreatedAt
    FROM Students s
    JOIN Users       u ON u.UserID       = s.UserID
    JOIN Faculties   f ON f.FacultyID    = s.FacultyID
    LEFT JOIN Departments d ON d.DepartmentID = s.DepartmentID
    WHERE s.StudentID = @StudentID;
END;
GO

-- ============================================================
-- 3. REGISTER NEW STUDENT
--    Creates a Users row then a Students row inside a transaction.
--    Auto-generates StudentID: STU-YYYY-NNNN
-- ============================================================
CREATE OR ALTER PROCEDURE sp_RegisterStudent
    @UserID        INT,
    @FacultyID     INT,
    @DepartmentID  INT          = NULL,
    @Program       NVARCHAR(150) = NULL,
    @Level         INT           = 100,
    @EnrolledDate  DATE         = NULL,
    @NewStudentID  VARCHAR(20)  OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validate user exists and has Student role
        IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID AND Role = 'Student')
            THROW 50003, 'User not found or is not assigned the Student role.', 1;

        -- Prevent double registration
        IF EXISTS (SELECT 1 FROM Students WHERE UserID = @UserID)
            THROW 50004, 'User is already registered as a Student.', 1;

        -- Validate Faculty
        IF NOT EXISTS (SELECT 1 FROM Faculties WHERE FacultyID = @FacultyID)
            THROW 50001, 'Invalid FacultyID.', 1;

        DECLARE @Year CHAR(4) = CAST(YEAR(GETDATE()) AS CHAR(4));
        DECLARE @Seq  INT;

        SELECT @Seq = ISNULL(MAX(CAST(RIGHT(StudentID, 4) AS INT)), 0) + 1
        FROM Students
        WHERE StudentID LIKE 'STU-' + @Year + '-%';

        SET @NewStudentID = 'STU-' + @Year + '-' + RIGHT('0000' + CAST(@Seq AS VARCHAR), 4);

        INSERT INTO Students (StudentID, UserID, FacultyID, DepartmentID, Program, Level, Status, EnrolledDate)
        VALUES (@NewStudentID, @UserID, @FacultyID, @DepartmentID, @Program, @Level, 'Active',
                ISNULL(@EnrolledDate, CAST(GETDATE() AS DATE)));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 4. UPDATE STUDENT PROFILE
-- ============================================================
CREATE OR ALTER PROCEDURE sp_UpdateStudent
    @StudentID    VARCHAR(20),
    @Name         NVARCHAR(150) = NULL,
    @Phone        NVARCHAR(30)  = NULL,
    @Gender       NVARCHAR(10)  = NULL,
    @DOB          DATE          = NULL,
    @Address      NVARCHAR(255) = NULL,
    @AvatarCode   NVARCHAR(5)   = NULL,
    @FacultyID    INT           = NULL,
    @DepartmentID INT           = NULL,
    @Program      NVARCHAR(150) = NULL,
    @Level        INT           = NULL,
    @Status       NVARCHAR(20)  = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @UserID INT;
        SELECT @UserID = UserID FROM Students WHERE StudentID = @StudentID;
        IF @UserID IS NULL THROW 50003, 'Student not found.', 1;

        -- Update Users table
        UPDATE Users SET
            Name       = ISNULL(@Name,       Name),
            Phone      = ISNULL(@Phone,      Phone),
            Gender     = ISNULL(@Gender,     Gender),
            DOB        = ISNULL(@DOB,        DOB),
            Address    = ISNULL(@Address,    Address),
            AvatarCode = ISNULL(@AvatarCode, AvatarCode)
        WHERE UserID = @UserID;

        -- Update Students table
        UPDATE Students SET
            FacultyID    = ISNULL(@FacultyID,    FacultyID),
            DepartmentID = ISNULL(@DepartmentID, DepartmentID),
            Program      = ISNULL(@Program,      Program),
            Level        = ISNULL(@Level,        Level),
            Status       = ISNULL(@Status,       Status)
        WHERE StudentID = @StudentID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 5. DELETE STUDENT  (cascades via FK – hard delete)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_DeleteStudent
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @UserID INT;
        SELECT @UserID = UserID FROM Students WHERE StudentID = @StudentID;
        IF @UserID IS NULL THROW 50003, 'Student not found.', 1;

        -- Child rows first (ordered by FK dependency)
        DELETE FROM Scholarships WHERE StudentID = @StudentID;
        DELETE FROM Payments     WHERE StudentID = @StudentID;
        DELETE FROM Results      WHERE StudentID = @StudentID;

        DELETE att FROM Attendance att
        JOIN Enrollments e ON e.EnrollmentID = att.EnrollmentID
        WHERE e.StudentID = @StudentID;

        DELETE FROM Enrollments WHERE StudentID = @StudentID;
        DELETE FROM Students    WHERE StudentID = @StudentID;
        DELETE FROM Users       WHERE UserID    = @UserID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 6. STUDENT ENROLLMENTS  (courses the student is enrolled in)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentEnrollments
    @UserID INT,  -- Changed from @StudentID VARCHAR(20)
    @Semester INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        SELECT
        e.EnrollmentID,
        e.CourseID,
        c.Title       AS title,       -- Changed to lowercase 'title'
        c.Credits     AS credits,     -- Changed to lowercase 'credits'
        c.Level       AS level,       -- Changed to lowercase 'level'
        c.Mode        AS mode,        -- Changed to lowercase 'mode'
        c.ScheduleDays,
        c.ScheduleTime,
        c.Room        AS room,        -- Changed to lowercase 'room'
        f.Name        AS FacultyName, -- React expects FacultyName
        d.Name        AS DepartmentName, -- React expects DepartmentName
        l_u.Name      AS LecturerName, 
        e.Semester    AS semester,    -- Changed to lowercase 'semester'
        e.EnrolledDate
    FROM Enrollments e
    JOIN Students    s ON s.StudentID    = e.StudentID  -- NEW: Bridge the Enrollment to the Student
    JOIN Courses     c ON c.CourseID     = e.CourseID
    JOIN Faculties   f ON f.FacultyID    = c.FacultyID
    JOIN Departments d ON d.DepartmentID = c.DepartmentID
    LEFT JOIN Lecturers lec ON lec.LecturerID = c.LecturerID
    LEFT JOIN Users l_u     ON l_u.UserID     = lec.UserID
    WHERE s.UserID = @UserID                            -- CHANGED: Filter by the UserID instead
      AND (@Semester IS NULL OR e.Semester = @Semester)
    ORDER BY e.Semester DESC, c.CourseID;
END;
GO

-- ============================================================
-- 7. ENROLL STUDENT IN COURSE
-- ============================================================
CREATE OR ALTER PROCEDURE sp_EnrollStudent
    @StudentID VARCHAR(20),
    @CourseID  VARCHAR(20),
    @Semester  INT,
    @NewEnrollmentID INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @StudentID)
            THROW 50003, 'Student not found.', 1;

        IF NOT EXISTS (SELECT 1 FROM Courses WHERE CourseID = @CourseID AND Status = 'Active')
            THROW 50004, 'Course not found or inactive.', 1;

        IF EXISTS (SELECT 1 FROM Enrollments WHERE StudentID = @StudentID AND CourseID = @CourseID AND Semester = @Semester)
            THROW 50005, 'Student already enrolled in this course for this semester.', 1;

        INSERT INTO Enrollments (StudentID, CourseID, Semester)
        VALUES (@StudentID, @CourseID, @Semester);

        SET @NewEnrollmentID = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 8. DROP ENROLLMENT
-- ============================================================
CREATE OR ALTER PROCEDURE sp_DropEnrollment
    @StudentID   VARCHAR(20),
    @CourseID    VARCHAR(20),
    @Semester    INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @EnrollmentID INT;
        SELECT @EnrollmentID = EnrollmentID
        FROM Enrollments
        WHERE StudentID = @StudentID AND CourseID = @CourseID AND Semester = @Semester;

        IF @EnrollmentID IS NULL
            THROW 50006, 'Enrollment record not found.', 1;

        DELETE FROM Attendance   WHERE EnrollmentID = @EnrollmentID;
        DELETE FROM Enrollments  WHERE EnrollmentID = @EnrollmentID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 9. GET STUDENT ATTENDANCE  (per-course breakdown)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentAttendance
    @StudentID VARCHAR(20),
    @Semester  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CourseID,
        c.Title AS CourseName,
        e.Semester,
        SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) AS Present,
        SUM(CASE WHEN a.Status = 'Absent'  THEN 1 ELSE 0 END) AS Absent,
        COUNT(a.AttendanceID) AS TotalSessions,
        CASE
            WHEN COUNT(a.AttendanceID) = 0 THEN 0
            ELSE CAST(
                100.0 * SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END)
                / COUNT(a.AttendanceID)
                AS DECIMAL(5,2))
        END AS AttendancePct
    FROM Enrollments e
    JOIN Courses     c  ON c.CourseID     = e.CourseID
    LEFT JOIN Attendance a ON a.EnrollmentID = e.EnrollmentID
    WHERE e.StudentID = @StudentID
      AND (@Semester IS NULL OR e.Semester = @Semester)
    GROUP BY c.CourseID, c.Title, e.Semester
    ORDER BY e.Semester DESC, c.CourseID;
END;
GO

-- ============================================================
-- 10. MARK ATTENDANCE SESSION
-- ============================================================
CREATE OR ALTER PROCEDURE sp_MarkAttendance
    @EnrollmentID INT,
    @SessionDate  DATE,
    @Status       NVARCHAR(10)      -- 'Present' | 'Absent'
AS
BEGIN
    SET NOCOUNT ON;

    IF @Status NOT IN ('Present','Absent')
        THROW 50007, 'Status must be Present or Absent.', 1;

    IF NOT EXISTS (SELECT 1 FROM Enrollments WHERE EnrollmentID = @EnrollmentID)
        THROW 50006, 'Enrollment not found.', 1;

    -- Upsert pattern
    IF EXISTS (SELECT 1 FROM Attendance WHERE EnrollmentID = @EnrollmentID AND SessionDate = @SessionDate)
        UPDATE Attendance
        SET Status = @Status
        WHERE EnrollmentID = @EnrollmentID AND SessionDate = @SessionDate;
    ELSE
        INSERT INTO Attendance (EnrollmentID, SessionDate, Status)
        VALUES (@EnrollmentID, @SessionDate, @Status);
END;
GO

-- ============================================================
-- 11. GET STUDENT RESULTS
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentResults
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        r.ResultID,
        r.ExamID,
        ex.CourseID,
        c.Title  AS CourseTitle,
        ex.ExamDate,
        r.Score,
        r.Grade,
        r.GpaPoint
    FROM Results r
    JOIN Examinations ex ON ex.ExamID  = r.ExamID
    JOIN Courses      c  ON c.CourseID = ex.CourseID
    WHERE r.StudentID = @StudentID
    ORDER BY ex.ExamDate DESC;
END;
GO

-- ============================================================
-- 12. SAVE / UPDATE EXAM RESULT FOR A STUDENT
-- ============================================================
CREATE OR ALTER PROCEDURE sp_UpsertResult
    @ExamID    VARCHAR(20),
    @StudentID VARCHAR(20),
    @Score     DECIMAL(5,2),
    @Grade     NVARCHAR(5)  = NULL,
    @GpaPoint  DECIMAL(3,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Examinations WHERE ExamID = @ExamID)
            THROW 50008, 'Exam not found.', 1;

        IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @StudentID)
            THROW 50003, 'Student not found.', 1;

        IF EXISTS (SELECT 1 FROM Results WHERE ExamID = @ExamID AND StudentID = @StudentID)
            UPDATE Results SET Score = @Score, Grade = @Grade, GpaPoint = @GpaPoint
            WHERE ExamID = @ExamID AND StudentID = @StudentID;
        ELSE
            INSERT INTO Results (ExamID, StudentID, Score, Grade, GpaPoint)
            VALUES (@ExamID, @StudentID, @Score, @Grade, @GpaPoint);

        -- Recalculate cumulative GPA for the student
        UPDATE Students
        SET GPA = (
            SELECT ISNULL(AVG(r2.GpaPoint), 0)
            FROM Results r2
            WHERE r2.StudentID = @StudentID AND r2.GpaPoint IS NOT NULL
        )
        WHERE StudentID = @StudentID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 13. GET STUDENT PAYMENTS
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentPayments
    @StudentID VARCHAR(20),
    @Status    NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.PaymentID,
        p.Amount,
        p.Type,
        p.Semester,
        p.PaymentDate,
        p.Method,
        p.Status
    FROM Payments p
    WHERE p.StudentID = @StudentID
      AND (@Status IS NULL OR p.Status = @Status)
    ORDER BY p.PaymentDate DESC;
END;
GO

-- ============================================================
-- 14. CREATE PAYMENT RECORD
-- ============================================================
CREATE OR ALTER PROCEDURE sp_CreatePayment
    @StudentID    VARCHAR(20),
    @Amount       DECIMAL(10,2),
    @Type         NVARCHAR(20),
    @Semester     NVARCHAR(5)  = NULL,
    @PaymentDate  DATE         = NULL,
    @Method       NVARCHAR(50) = NULL,
    @Status       NVARCHAR(20) = 'Pending',
    @NewPaymentID VARCHAR(20)  OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @StudentID)
            THROW 50003, 'Student not found.', 1;

        -- Generate PaymentID: PAY-YYYY-NNNN
        DECLARE @Year CHAR(4) = CAST(YEAR(GETDATE()) AS CHAR(4));
        DECLARE @Seq  INT;

        SELECT @Seq = ISNULL(MAX(CAST(RIGHT(PaymentID, 4) AS INT)), 0) + 1
        FROM Payments
        WHERE PaymentID LIKE 'PAY-' + @Year + '-%';

        SET @NewPaymentID = 'PAY-' + @Year + '-' + RIGHT('0000' + CAST(@Seq AS VARCHAR), 4);

        INSERT INTO Payments (PaymentID, StudentID, Amount, Type, Semester, PaymentDate, Method, Status)
        VALUES (@NewPaymentID, @StudentID, @Amount, @Type, @Semester, @PaymentDate, @Method, @Status);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

-- ============================================================
-- 15. UPDATE PAYMENT STATUS
-- ============================================================
CREATE OR ALTER PROCEDURE sp_UpdatePaymentStatus
    @PaymentID   VARCHAR(20),
    @Status      NVARCHAR(20),
    @PaymentDate DATE         = NULL,
    @Method      NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @Status NOT IN ('Paid','Pending','Overdue')
        THROW 50009, 'Invalid payment status.', 1;

    IF NOT EXISTS (SELECT 1 FROM Payments WHERE PaymentID = @PaymentID)
        THROW 50010, 'Payment record not found.', 1;

    UPDATE Payments SET
        Status      = @Status,
        PaymentDate = ISNULL(@PaymentDate, PaymentDate),
        Method      = ISNULL(@Method, Method)
    WHERE PaymentID = @PaymentID;
END;
GO

-- ============================================================
-- 16. GET STUDENT SCHOLARSHIPS
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentScholarships
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ScholarshipID, Name, Amount, Type, Status
    FROM Scholarships
    WHERE StudentID = @StudentID
    ORDER BY ScholarshipID DESC;
END;
GO

-- ============================================================
-- 17. ADD SCHOLARSHIP TO STUDENT
-- ============================================================
CREATE OR ALTER PROCEDURE sp_AddScholarship
    @StudentID VARCHAR(20),
    @Name      NVARCHAR(150),
    @Amount    DECIMAL(10,2) = NULL,
    @Type      NVARCHAR(20)  = NULL,
    @Status    NVARCHAR(20)  = 'Active',
    @NewID     INT           OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @StudentID)
        THROW 50003, 'Student not found.', 1;

    INSERT INTO Scholarships (Name, StudentID, Amount, Type, Status)
    VALUES (@Name, @StudentID, @Amount, @Type, @Status);

    SET @NewID = SCOPE_IDENTITY();
END;
GO

-- ============================================================
-- 18. STUDENT DASHBOARD SUMMARY  (counts + latest data)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentSummary
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Basic student info + GPA
    SELECT
        s.StudentID,
        u.Name,
        s.GPA,
        s.Status,
        s.Level,
        s.Program,
        f.Name AS Faculty
    FROM Students s
    JOIN Users u     ON u.UserID    = s.UserID
    JOIN Faculties f ON f.FacultyID = s.FacultyID
    WHERE s.StudentID = @StudentID;

    -- Active enrollments count
    SELECT COUNT(*) AS ActiveEnrollments
    FROM Enrollments
    WHERE StudentID = @StudentID;

    -- Overall attendance percentage
    SELECT
        CASE WHEN COUNT(a.AttendanceID) = 0 THEN 0
             ELSE CAST(100.0 * SUM(CASE WHEN a.Status='Present' THEN 1 ELSE 0 END)
                  / COUNT(a.AttendanceID) AS DECIMAL(5,2))
        END AS OverallAttendancePct
    FROM Enrollments e
    LEFT JOIN Attendance a ON a.EnrollmentID = e.EnrollmentID
    WHERE e.StudentID = @StudentID;

    -- Outstanding payments
    SELECT COUNT(*) AS OutstandingPayments, ISNULL(SUM(Amount), 0) AS OutstandingAmount
    FROM Payments
    WHERE StudentID = @StudentID AND Status IN ('Pending','Overdue');
END;
GO

-- ============================================================
-- 19. AGGREGATE STATS  (for admin dashboard)
-- ============================================================
CREATE OR ALTER PROCEDURE sp_GetStudentStats
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(*)                                                              AS Total,
        SUM(CASE WHEN Status = 'Active'    THEN 1 ELSE 0 END)               AS Active,
        SUM(CASE WHEN Status = 'Pending'   THEN 1 ELSE 0 END)               AS Pending,
        SUM(CASE WHEN Status = 'Suspended' THEN 1 ELSE 0 END)               AS Suspended,
        SUM(CASE WHEN Status = 'Graduated' THEN 1 ELSE 0 END)               AS Graduated,
        CAST(AVG(GPA) AS DECIMAL(3,2))                                       AS AvgGPA
    FROM Students;

    -- Count by faculty
    SELECT f.Name AS Faculty, COUNT(s.StudentID) AS StudentCount
    FROM Students s
    JOIN Faculties f ON f.FacultyID = s.FacultyID
    GROUP BY f.Name
    ORDER BY StudentCount DESC;
END;
GO
CREATE OR ALTER PROCEDURE sp_GetStudentByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        s.StudentID,
        u.Name          AS FullName,
        u.Email,
        u.Phone,
        u.Gender,
        u.DOB,
        u.Address,
        u.AvatarCode,
        f.Name          AS Faculty,
        d.Name          AS Department,
        s.Program,
        s.Level,
        s.GPA,
        s.Status,
        s.EnrolledDate,
        u.CreatedAt
    FROM Students s
    JOIN Users        u ON u.UserID      = s.UserID
    JOIN Faculties    f ON f.FacultyID   = s.FacultyID
    LEFT JOIN Departments d ON d.DepartmentID = s.DepartmentID
    WHERE s.UserID = @UserID;
END;