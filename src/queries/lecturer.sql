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
(
    @Name NVARCHAR(150),
    @Email NVARCHAR(150),
    @PasswordHash NVARCHAR(255),
    @Phone NVARCHAR(30) = NULL,
    @Gender NVARCHAR(10) = NULL,
    @DOB DATE = NULL,
    @Address NVARCHAR(255) = NULL,
    @AvatarCode NVARCHAR(5) = NULL,
    @FacultyID INT,
    @DepartmentID INT,
    @Specialization NVARCHAR(150) = NULL,
    @Rank NVARCHAR(50) = NULL,
    @JoinedDate DATE = NULL,
    @NewLecturerID VARCHAR(20) OUTPUT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT;
    DECLARE @NextNo INT;

    IF EXISTS (SELECT 1 FROM Users WHERE Email = @Email)
    BEGIN
        RAISERROR('Email already exists.',16,1);
        RETURN;
    END

    INSERT INTO Users
    (
        Email, PasswordHash, Phone, Name, Gender,
        DOB, Address, AvatarCode, Role
    )
    VALUES
    (
        @Email, @PasswordHash, @Phone, @Name, @Gender,
        @DOB, @Address, @AvatarCode, 'Lecturer'
    );

    SET @UserID = SCOPE_IDENTITY();

    SELECT @NextNo = COUNT(*) + 1 FROM Lecturers;

    SET @NewLecturerID =
        'LEC-' + RIGHT('000' + CAST(@NextNo AS VARCHAR(3)), 3);

    INSERT INTO Lecturers
    (
        LecturerID,
        UserID,
        FacultyID,
        DepartmentID,
        Specialization,
        Rank,
        JoinedDate
    )
    VALUES
    (
        @NewLecturerID,
        @UserID,
        @FacultyID,
        @DepartmentID,
        @Specialization,
        @Rank,
        @JoinedDate
    );
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
