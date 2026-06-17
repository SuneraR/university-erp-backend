USE UniversityERP;
GO

----------------------------------------------------
-- GET ALL LECTURERS
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_GetLecturers
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.LecturerID,
        u.Name,
        u.Email,
        u.Phone,
        f.Name AS Faculty,
        d.Name AS Department,
        l.Specialization,
        l.Rank,
        l.Rating,
        l.Publications,
        l.Status,
        l.JoinedDate
    FROM Lecturers l
    INNER JOIN Users u
        ON l.UserID = u.UserID
    INNER JOIN Faculties f
        ON l.FacultyID = f.FacultyID
    INNER JOIN Departments d
        ON l.DepartmentID = d.DepartmentID
    ORDER BY u.Name;
END;
GO

----------------------------------------------------
-- GET LECTURER BY ID
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_GetLecturerByID
    @LecturerID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.LecturerID,
        u.Name,
        u.Email,
        u.Phone,
        u.Gender,
        u.DOB,
        u.Address,
        f.Name AS Faculty,
        d.Name AS Department,
        l.Specialization,
        l.Rank,
        l.Status,
        l.JoinedDate
    FROM Lecturers l
    INNER JOIN Users u
        ON l.UserID = u.UserID
    INNER JOIN Faculties f
        ON l.FacultyID = f.FacultyID
    INNER JOIN Departments d
        ON l.DepartmentID = d.DepartmentID
    WHERE l.LecturerID = @LecturerID;
END;
GO

----------------------------------------------------
-- GET LECTURER By Faculty
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_GetLecturersByFaculty
    @FacultyID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.LecturerID,
        u.Name,
        u.Email,
        u.Phone,
        f.Name AS Faculty,
        d.Name AS Department,
        l.Specialization,
        l.Rank,
        l.Status
    FROM Lecturers l
    INNER JOIN Users u ON l.UserID = u.UserID
    INNER JOIN Faculties f ON l.FacultyID = f.FacultyID
    INNER JOIN Departments d ON l.DepartmentID = d.DepartmentID
    WHERE l.FacultyID = @FacultyID;
END;
GO

----------------------------------------------------
-- GET LECTURER By Department
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_GetLecturersByDepartment
    @DepartmentID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        l.LecturerID,
        u.Name,
        u.Email,
        d.Name AS Department,
        f.Name AS Faculty,
        l.Specialization,
        l.Rank,
        l.Status
    FROM Lecturers l
    INNER JOIN Users u ON l.UserID = u.UserID
    INNER JOIN Faculties f ON l.FacultyID = f.FacultyID
    INNER JOIN Departments d ON l.DepartmentID = d.DepartmentID
    WHERE l.DepartmentID = @DepartmentID;
END;
GO
----------------------------------------------------
-- REGISTER LECTURER
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_RegisterLecturer
    @UserID         INT,
    @FacultyID      INT,
    @DepartmentID   INT,
    @Specialization NVARCHAR(150) = NULL,
    @Rank           NVARCHAR(50)  = NULL,
    @JoinedDate     DATE          = NULL,
    @NewLecturerID  VARCHAR(20)   OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validate user exists and has Lecturer role
        IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = @UserID AND Role = 'Lecturer')
            THROW 50003, 'User not found or is not assigned the Lecturer role.', 1;

        -- Prevent double registration
        IF EXISTS (SELECT 1 FROM Lecturers WHERE UserID = @UserID)
            THROW 50004, 'User is already registered as a Lecturer.', 1;

        -- Validate Faculty
        IF NOT EXISTS (SELECT 1 FROM Faculties WHERE FacultyID = @FacultyID)
            THROW 50001, 'Invalid FacultyID.', 1;

        DECLARE @NextNo INT;
        SELECT @NextNo = COUNT(*) + 1 FROM Lecturers;

        SET @NewLecturerID = 'LEC-' + RIGHT('000' + CAST(@NextNo AS VARCHAR(3)), 3);

        INSERT INTO Lecturers (LecturerID, UserID, FacultyID, DepartmentID, Specialization, Rank, JoinedDate)
        VALUES (@NewLecturerID, @UserID, @FacultyID, @DepartmentID, @Specialization, @Rank,
                ISNULL(@JoinedDate, CAST(GETDATE() AS DATE)));

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

----------------------------------------------------
-- UPDATE LECTURER
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_UpdateLecturer
(
    @LecturerID VARCHAR(20),
    @Name NVARCHAR(150)=NULL,
    @Phone NVARCHAR(30)=NULL,
    @Gender NVARCHAR(10)=NULL,
    @DOB DATE=NULL,
    @Address NVARCHAR(255)=NULL,
    @AvatarCode NVARCHAR(5)=NULL,
    @FacultyID INT=NULL,
    @DepartmentID INT=NULL,
    @Specialization NVARCHAR(150)=NULL,
    @Rank NVARCHAR(50)=NULL,
    @Status NVARCHAR(20)=NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT;

    SELECT @UserID = UserID
    FROM Lecturers
    WHERE LecturerID = @LecturerID;

    UPDATE Users
    SET
        Name = ISNULL(@Name, Name),
        Phone = ISNULL(@Phone, Phone),
        Gender = ISNULL(@Gender, Gender),
        DOB = ISNULL(@DOB, DOB),
        Address = ISNULL(@Address, Address),
        AvatarCode = ISNULL(@AvatarCode, AvatarCode)
    WHERE UserID = @UserID;

    UPDATE Lecturers
    SET
        FacultyID = ISNULL(@FacultyID, FacultyID),
        DepartmentID = ISNULL(@DepartmentID, DepartmentID),
        Specialization = ISNULL(@Specialization, Specialization),
        Rank = ISNULL(@Rank, Rank),
        Status = ISNULL(@Status, Status)
    WHERE LecturerID = @LecturerID;
END;
GO

----------------------------------------------------
-- DELETE LECTURER
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_DeleteLecturer
(
    @LecturerID VARCHAR(20)
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT;

    IF EXISTS (
        SELECT 1
        FROM Courses
        WHERE LecturerID = @LecturerID
    )
    BEGIN
        RAISERROR('Lecturer is assigned to courses.',16,1);
        RETURN;
    END

    SELECT @UserID = UserID
    FROM Lecturers
    WHERE LecturerID = @LecturerID;

    DELETE FROM Lecturers
    WHERE LecturerID = @LecturerID;

    DELETE FROM Users
    WHERE UserID = @UserID;
END;
GO

----------------------------------------------------
-- GET LECTURER COURSES
----------------------------------------------------
CREATE OR ALTER PROCEDURE sp_GetLecturerCourses
(
    @LecturerID VARCHAR(20)
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CourseID,
        Title,
        Credits,
        Semester,
        Room,
        ScheduleDays,
        ScheduleTime,
        Status
    FROM Courses
    WHERE LecturerID = @LecturerID;
END;
GO
