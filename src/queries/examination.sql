-- ============================================================================
-- EXAMINATION MODULE STORED PROCEDURES (PASCALE CASE VERSION)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. EXAMINATIONS - LIST
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_GetExaminationsList
    @Status VARCHAR(50) = NULL,
    @CourseID VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.ExamID,
        e.CourseID,
        c.Title AS CourseTitle,
        e.ExamDate,
        e.ExamTime,
        e.Duration,
        e.Hall,
        e.Capacity,
        e.Status,
        e.InvigilatorID,
        u.Name AS InvigilatorName,
        l.Rank AS InvigilatorRank,
        f.Name AS FacultyName,
        d.Name AS DepartmentName,
        (
            SELECT COUNT(*)
            FROM enrollments en
            WHERE en.CourseID = e.CourseID
              AND en.Semester = c.Semester
        ) AS EnrolledCount
    FROM examinations e
    JOIN courses c ON c.CourseID = e.CourseID
    JOIN faculties f ON f.FacultyID = c.FacultyID
    JOIN departments d ON d.DepartmentID = c.DepartmentID
    LEFT JOIN lecturers l ON l.LecturerID = e.InvigilatorID
    LEFT JOIN users u ON u.UserID = l.UserID
    WHERE (@Status IS NULL OR e.Status = @Status)
      AND (@CourseID IS NULL OR e.CourseID = @CourseID)
    ORDER BY e.ExamDate ASC, e.ExamTime ASC;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 2. EXAMINATION STATS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_GetExaminationStats
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        COUNT(*) AS TotalExams,
        SUM(CASE WHEN Status = 'Scheduled' THEN 1 ELSE 0 END) AS Upcoming,
        SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS Completed,
        SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END) AS Cancelled,
        SUM(CASE WHEN Status = 'Scheduled' THEN Capacity ELSE 0 END) AS TotalScheduledSeats
    FROM examinations;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 3. EXAMINATION BY ID
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_GetExaminationByID
    @ExamID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.ExamID,
        e.CourseID,
        c.Title AS CourseTitle,
        e.ExamDate,
        e.ExamTime,
        e.Duration,
        e.Hall,
        e.Capacity,
        e.Status,
        e.InvigilatorID,
        u.Name AS InvigilatorName,
        l.Rank AS InvigilatorRank,
        f.Name AS FacultyName,
        d.Name AS DepartmentName,
        (
            SELECT COUNT(*)
            FROM enrollments en
            WHERE en.CourseID = e.CourseID
              AND en.Semester = c.Semester
        ) AS EnrolledCount
    FROM examinations e
    JOIN courses c ON c.CourseID = e.CourseID
    JOIN faculties f ON f.FacultyID = c.FacultyID
    JOIN departments d ON d.DepartmentID = c.DepartmentID
    LEFT JOIN lecturers l ON l.LecturerID = e.InvigilatorID
    LEFT JOIN users u ON u.UserID = l.UserID
    WHERE e.ExamID = @ExamID;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 4. HALL CONFLICT CHECK
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_CheckHallConflict
    @Hall VARCHAR(100),
    @ExamDate DATE,
    @ExamTime VARCHAR(50),
    @ExamID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ExamID 
    FROM examinations 
    WHERE Hall = @Hall 
      AND ExamDate = @ExamDate 
      AND ExamTime = @ExamTime 
      AND Status <> 'Cancelled' 
      AND ExamID <> @ExamID;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 5. CREATE EXAMINATION
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_CreateExamination
    @CourseID VARCHAR(20),
    @ExamDate DATE,
    @ExamTime VARCHAR(50),
    @Duration VARCHAR(50),
    @Hall VARCHAR(100),
    @Capacity INT,
    @InvigilatorID VARCHAR(20) = NULL,
    @Status VARCHAR(50) = 'Scheduled',
    @NewExamID VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Year INT = YEAR(GETDATE());
    DECLARE @Pattern VARCHAR(20) = 'EX-' + CAST(@Year AS VARCHAR(4)) + '-%';
    DECLARE @LastID VARCHAR(20);
    DECLARE @Seq INT;

    SELECT TOP 1 @LastID = ExamID 
    FROM examinations 
    WHERE ExamID LIKE @Pattern 
    ORDER BY ExamID DESC;

    IF @LastID IS NULL
        SET @Seq = 1;
    ELSE
        SET @Seq = CAST(RIGHT(@LastID, 3) AS INT) + 1;

    SET @NewExamID = 'EX-' + CAST(@Year AS VARCHAR(4)) + '-' + RIGHT('000' + CAST(@Seq AS VARCHAR(3)), 3);

    INSERT INTO examinations 
        (ExamID, CourseID, ExamDate, ExamTime, Duration, Hall, Capacity, InvigilatorID, Status)
    VALUES 
        (@NewExamID, @CourseID, @ExamDate, @ExamTime, @Duration, @Hall, @Capacity, @InvigilatorID, @Status);
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 6. UPDATE EXAMINATION
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_UpdateExamination
    @ExamID VARCHAR(20),
    @ExamDate DATE,
    @ExamTime VARCHAR(50),
    @Duration VARCHAR(50),
    @Hall VARCHAR(100),
    @Capacity INT,
    @InvigilatorID VARCHAR(20) = NULL,
    @Status VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE examinations
    SET 
        ExamDate = @ExamDate,
        ExamTime = @ExamTime,
        Duration = @Duration,
        Hall = @Hall,
        Capacity = @Capacity,
        InvigilatorID = @InvigilatorID,
        Status = @Status
    WHERE ExamID = @ExamID;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 7. UPDATE EXAM STATUS
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_UpdateExaminationStatus
    @ExamID VARCHAR(20),
    @Status VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE examinations 
    SET Status = @Status 
    WHERE ExamID = @ExamID;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 8. DELETE EXAMINATION
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_DeleteExamination
    @ExamID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM examinations 
    WHERE ExamID = @ExamID;
END;
GO

-- ============================================================================
-- RESULTS MODULE
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 9. RESULTS BY EXAM
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_GetResultsByExam
    @ExamID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        r.ResultID,
        r.ExamID,
        r.StudentID,
        u.Name AS StudentName,
        r.Score,
        r.Grade,
        r.GpaPoint,
        e.ExamDate,
        c.Title AS CourseTitle,
        c.CourseID
    FROM results r
    JOIN students s ON s.StudentID = r.StudentID
    JOIN users u ON u.UserID = s.UserID
    JOIN examinations e ON e.ExamID = r.ExamID
    JOIN courses c ON c.CourseID = e.CourseID
    WHERE r.ExamID = @ExamID
    ORDER BY r.Score DESC;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 10. RESULTS BY STUDENT
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_GetResultsByStudent
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        r.ResultID,
        r.ExamID,
        r.Score,
        r.Grade,
        r.GpaPoint,
        c.CourseID,
        c.Title AS CourseTitle,
        e.ExamDate
    FROM results r
    JOIN examinations e ON e.ExamID = r.ExamID
    JOIN courses c ON c.CourseID = e.CourseID
    WHERE r.StudentID = @StudentID
    ORDER BY e.ExamDate DESC;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 11. UPSERT RESULT
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_UpsertExamResult
    @ExamID VARCHAR(20),
    @StudentID VARCHAR(20),
    @Score DECIMAL(5,2),
    @Grade VARCHAR(5),
    @GpaPoint DECIMAL(3,2)
AS
BEGIN
    SET NOCOUNT ON;

    MERGE INTO results AS target
    USING (SELECT @ExamID AS ExamID, @StudentID AS StudentID) AS src
    ON target.ExamID = src.ExamID AND target.StudentID = src.StudentID
    WHEN MATCHED THEN
        UPDATE SET Score = @Score, Grade = @Grade, GpaPoint = @GpaPoint
    WHEN NOT MATCHED THEN
        INSERT (ExamID, StudentID, Score, Grade, GpaPoint)
        VALUES (@ExamID, @StudentID, @Score, @Grade, @GpaPoint);
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 12. DELETE RESULT
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_DeleteExamResult
    @ExamID VARCHAR(20),
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM results 
    WHERE ExamID = @ExamID AND StudentID = @StudentID;
END;
GO