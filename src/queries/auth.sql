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
        users.PasswordHash
    FROM users
    WHERE users.email = @email;
END;
GO

-- =============================================
-- GET_STUDENT_PROFILE
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
        faculties.name,
        departments.name
    FROM students
    JOIN faculties ON students.FacultyID = faculties.FacultyID
    LEFT JOIN departments ON students.DepartmentID = departments.DepartmentID
    WHERE students.UserID = @UserID;
END;
GO

-- =============================================
-- GET_LECTURER_PROFILE
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
        faculties.name,
        departments.name
    FROM lecturers
    JOIN faculties ON lecturers.FacultyID = faculties.FacultyID
    JOIN departments ON lecturers.DepartmentID = departments.DepartmentID
    WHERE lecturers.UserID = @UserID;
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
        users.role
    FROM users
    WHERE users.UserID = @UserID;
END;
GO

-- =============================================
-- CHECK_EMAIL_EXISTS
-- =============================================
CREATE OR ALTER PROCEDURE sp_CheckEmailExists
    @email VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*)
    FROM users
    WHERE users.email = @email;
END;
GO

-- =============================================
-- UPDATE_PASSWORD
-- =============================================
CREATE OR ALTER PROCEDURE sp_UpdatePassword
    @UserID INT,
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
    @UserID INT,
    @token VARCHAR(512),
    @expiresAt DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO refresh_tokens (
        UserID, 
        token, 
        expires_at, 
        created_at
    )
    VALUES (
        @UserID, 
        @token, 
        @expiresAt, 
        GETDATE()
    );
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
    WHERE refresh_tokens.token = @token
      AND refresh_tokens.expires_at > GETDATE();
END;
GO

-- =============================================
-- REFRESH_TOKENS TABLE SCHEMA (Updated for NameID)
-- =============================================
/*
CREATE TABLE refresh_tokens (
    TokenID     INT PRIMARY KEY IDENTITY(1,1),
    UserID      INT NOT NULL,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES users(UserID) ON DELETE CASCADE
);

ALTER TABLE users ADD password_hash VARCHAR(255);
*/