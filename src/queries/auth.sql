-- =============================================
-- AUTH STORED PROCEDURES (MS SQL / T-SQL)
-- =============================================


-- =============================================
-- GET_USER_BY_EMAIL
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUserByEmail
    @email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        users.UserID,
        users.email,
        users.name,
        users.phone,
        users.gender,
        users.dob,
        users.address,
        users.AvatarCode,
        users.role,
        users.IsActive,
        users.PasswordHash
    FROM users
    WHERE users.email = @email;
END;
GO

-- =============================================
-- GET_USER_BY_ID
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetUserById
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        users.UserID,
        users.email,
        users.name,
        users.phone,
        users.gender,
        users.dob,
        users.address,
        users.AvatarCode,
        users.role,
        users.IsActive
    FROM users
    WHERE users.UserID = @UserID;
END;
GO

-- =============================================
-- GET_STUDENT_PROFILE
-- Fixed: aliased duplicate 'name' columns from JOINs
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetStudentProfile
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        students.StudentID,
        students.FacultyID,
        students.DepartmentID,
        students.program,
        students.level,
        students.gpa,
        students.status,
        students.EnrolledDate,
        faculties.name    AS FacultyName,      -- ← aliased
        departments.name  AS DepartmentName    -- ← aliased
    FROM students
    JOIN faculties    ON students.FacultyID    = faculties.FacultyID
    LEFT JOIN departments ON students.DepartmentID = departments.DepartmentID
    WHERE students.UserID = @UserID;
END;
GO

-- =============================================
-- GET_LECTURER_PROFILE
-- Fixed: aliased duplicate 'name' columns from JOINs
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetLecturerProfile
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        lecturers.LecturerID,
        lecturers.FacultyID,
        lecturers.DepartmentID,
        lecturers.specialization,
        lecturers.rank,
        lecturers.rating,
        lecturers.publications,
        lecturers.status,
        lecturers.JoinedDate,
        faculties.name    AS FacultyName,      -- ← aliased
        departments.name  AS DepartmentName    -- ← aliased
    FROM lecturers
    JOIN faculties    ON lecturers.FacultyID    = faculties.FacultyID
    JOIN departments  ON lecturers.DepartmentID = departments.DepartmentID
    WHERE lecturers.UserID = @UserID;
END;
GO

-- =============================================
-- CHECK_EMAIL_EXISTS
-- Fixed: named the COUNT column for reliable access in code
-- =============================================
CREATE OR ALTER PROCEDURE sp_CheckEmailExists
    @email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS EmailCount     -- ← named column
    FROM users
    WHERE users.email = @email;
END;
GO

-- =============================================
-- UPDATE_PASSWORD
-- =============================================
CREATE OR ALTER PROCEDURE sp_UpdatePassword
    @UserID       INT,
    @passwordHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE users
    SET PasswordHash = @passwordHash
    WHERE UserID = @UserID;
END;
GO

-- =============================================
-- STORE_REFRESH_TOKEN
-- =============================================
CREATE OR ALTER PROCEDURE sp_StoreRefreshToken
    @UserID    INT,
    @token     VARCHAR(512),
    @expiresAt DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO refresh_tokens (UserID, token, expires_at, created_at)
    VALUES (@UserID, @token, @expiresAt, GETDATE());
END;
GO

-- =============================================
-- GET_REFRESH_TOKEN
-- =============================================
CREATE OR ALTER PROCEDURE sp_GetRefreshToken
    @token VARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        refresh_tokens.token,
        refresh_tokens.UserID,
        refresh_tokens.expires_at,
        users.role,
        users.email,
        users.name
    FROM refresh_tokens
    JOIN users ON refresh_tokens.UserID = users.UserID
    WHERE refresh_tokens.token     = @token
      AND refresh_tokens.expires_at > GETDATE();
END;
GO

-- =============================================
-- ROTATE_REFRESH_TOKEN
-- New: deletes old token and inserts new one atomically
-- Used by POST /auth/refresh for token rotation
-- =============================================
CREATE OR ALTER PROCEDURE sp_RotateRefreshToken
    @oldToken  VARCHAR(512),
    @newToken  VARCHAR(512),
    @UserID    INT,
    @expiresAt DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        DELETE FROM refresh_tokens
        WHERE token = @oldToken;

        INSERT INTO refresh_tokens (UserID, token, expires_at, created_at)
        VALUES (@UserID, @newToken, @expiresAt, GETDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- =============================================
-- DELETE_REFRESH_TOKEN
-- =============================================
CREATE OR ALTER PROCEDURE sp_DeleteRefreshToken
    @token VARCHAR(512)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM refresh_tokens
    WHERE token = @token;
END;
GO

-- =============================================
-- DELETE_ALL_USER_REFRESH_TOKENS
-- =============================================
CREATE OR ALTER PROCEDURE sp_DeleteAllUserRefreshTokens
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM refresh_tokens
    WHERE UserID = @UserID;
END;
GO

-- =============================================
-- CREATE_ADMIN_USER
-- Replaces the inline INSERT in registerAdmin controller
-- =============================================
CREATE OR ALTER PROCEDURE sp_CreateAdminUser
    @Email        NVARCHAR(150),
    @PasswordHash NVARCHAR(255),
    @Name         NVARCHAR(150),
    @Phone        NVARCHAR(30)  = NULL,
    @Gender       NVARCHAR(10)  = NULL,
    @DOB          DATE          = NULL,
    @Address      NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM users WHERE email = @Email)
    BEGIN
        RAISERROR('Email already exists', 16, 1);
        RETURN;
    END

    INSERT INTO users (
        Email, PasswordHash, Name, Phone,
        Gender, DOB, Address, AvatarCode,
        Role, IsActive
    )
    OUTPUT INSERTED.UserID
    VALUES (
        @Email, @PasswordHash, @Name, @Phone,
        @Gender, @DOB, @Address, 'AD',
        'Admin', 1
    );
END;
GO

-- =============================================
-- CREATE_STUDENT
-- Creates Users row + Students row atomically
-- IsActive = 0 until student activates via /auth/activate
-- =============================================
CREATE OR ALTER PROCEDURE sp_CreateStudent
    @Email        NVARCHAR(150),
    @Name         NVARCHAR(150),
    @Phone        NVARCHAR(30)  = NULL,
    @Gender       NVARCHAR(10)  = NULL,
    @DOB          DATE          = NULL,
    @Address      NVARCHAR(255) = NULL,
    @FacultyID    INT,
    @DepartmentID INT           = NULL,
    @Program      NVARCHAR(100),
    @Level        NVARCHAR(20)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM users WHERE email = @Email)
    BEGIN
        RAISERROR('Email already exists', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @UserID INT;

        INSERT INTO users (
            Email, PasswordHash, Name, Phone,
            Gender, DOB, Address, AvatarCode,
            Role, IsActive
        )
        VALUES (
            @Email, '', @Name, @Phone,
            @Gender, @DOB, @Address, 'ST',
            'Student', 0
        );

        SET @UserID = SCOPE_IDENTITY();

        INSERT INTO students (
            UserID, FacultyID, DepartmentID,
            Program, Level, GPA,
            Status, EnrolledDate
        )
        VALUES (
            @UserID, @FacultyID, @DepartmentID,
            @Program, @Level, 0.00,
            'Active', GETDATE()
        );

        SELECT @UserID AS UserID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- =============================================
-- CREATE_LECTURER
-- Creates Users row + Lecturers row atomically
-- IsActive = 0 until lecturer activates via /auth/activate
-- =============================================
CREATE OR ALTER PROCEDURE sp_CreateLecturer
    @Email          NVARCHAR(150),
    @Name           NVARCHAR(150),
    @Phone          NVARCHAR(30)  = NULL,
    @Gender         NVARCHAR(10)  = NULL,
    @DOB            DATE          = NULL,
    @Address        NVARCHAR(255) = NULL,
    @FacultyID      INT,
    @DepartmentID   INT,
    @Specialization NVARCHAR(150) = NULL,
    @Rank           NVARCHAR(50)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM users WHERE email = @Email)
    BEGIN
        RAISERROR('Email already exists', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @UserID INT;

        INSERT INTO users (
            Email, PasswordHash, Name, Phone,
            Gender, DOB, Address, AvatarCode,
            Role, IsActive
        )
        VALUES (
            @Email, '', @Name, @Phone,
            @Gender, @DOB, @Address, 'LC',
            'Lecturer', 0
        );

        SET @UserID = SCOPE_IDENTITY();

        INSERT INTO lecturers (
            UserID, FacultyID, DepartmentID,
            Specialization, Rank, Rating,
            Publications, Status, JoinedDate
        )
        VALUES (
            @UserID, @FacultyID, @DepartmentID,
            @Specialization, @Rank, 0.00,
            0, 'Active', GETDATE()
        );

        SELECT @UserID AS UserID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- =============================================
-- TABLE SCHEMAS (reference)
-- =============================================
/*
CREATE TABLE refresh_tokens (
    TokenID    INT PRIMARY KEY IDENTITY(1,1),
    UserID     INT NOT NULL,
    token      VARCHAR(512) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE
);
*/