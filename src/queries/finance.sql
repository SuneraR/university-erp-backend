-- ============================================================================
-- FINANCE MODULE STORED PROCEDURES (UPDATED: ID CONVENTION FIXED)
-- ============================================================================

-- ─── 1. PAYMENTS ─────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_GetPaymentsList
    @Search NVARCHAR(200) = NULL,
    @Type NVARCHAR(20) = NULL,
    @Status NVARCHAR(20) = NULL,
    @Semester NVARCHAR(5) = NULL,
    @Page INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT 
        p.PaymentID,
        p.StudentID,
        u.Name AS StudentName,
        p.Amount,
        p.Type,
        p.Semester,
        p.PaymentDate,
        p.Method,
        p.Status,
        COUNT(*) OVER() AS TotalCount
    FROM Payments p
    INNER JOIN Students s ON s.StudentID = p.StudentID
    INNER JOIN Users u ON u.UserID = s.UserID
    WHERE (@Status IS NULL OR p.Status = @Status)
      AND (@Type IS NULL OR p.Type = @Type)
      AND (@Semester IS NULL OR p.Semester = @Semester)
      AND (@Search IS NULL OR 
           u.Name LIKE '%' + @Search + '%' OR 
           p.PaymentID LIKE '%' + @Search + '%' OR 
           p.StudentID LIKE '%' + @Search + '%')
    ORDER BY p.PaymentDate DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE sp_GetPaymentByID
    @PaymentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        p.*,
        u.Name AS StudentName,
        u.Email AS StudentEmail,
        u.Phone AS StudentPhone
    FROM Payments p
    INNER JOIN Students s ON s.StudentID = p.StudentID
    INNER JOIN Users u ON u.UserID = s.UserID
    WHERE p.PaymentID = @PaymentID;
END;
GO

CREATE OR ALTER PROCEDURE sp_CreatePayment
    @StudentID VARCHAR(20),
    @Amount DECIMAL(10, 2),
    @Type NVARCHAR(20),
    @Semester NVARCHAR(10) = NULL,
    @PaymentDate DATE = NULL,
    @Method NVARCHAR(50) = NULL,
    @Status NVARCHAR(20) = 'Pending',
    @NewPaymentID VARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Year INT = YEAR(GETDATE());
    DECLARE @Pattern NVARCHAR(20) = 'PAY-' + CAST(@Year AS NVARCHAR(4)) + '-%';
    DECLARE @Seq INT;

    SELECT @Seq = COUNT(*) FROM Payments WHERE PaymentID LIKE @Pattern;

    SET @NewPaymentID =
        'PAY-' + CAST(@Year AS NVARCHAR(4)) + '-' +
        RIGHT('0000' + CAST(@Seq + 1 AS NVARCHAR(4)), 4);

    INSERT INTO Payments
        (PaymentID, StudentID, Amount, Type, Semester, PaymentDate, Method, Status)
    VALUES
        (@NewPaymentID, @StudentID, @Amount, @Type, @Semester,
         COALESCE(@PaymentDate, GETDATE()), @Method, @Status);
END;
GO

CREATE OR ALTER PROCEDURE sp_UpdatePaymentDetails
    @PaymentID VARCHAR(20),
    @Amount DECIMAL(10, 2) = NULL,
    @Status NVARCHAR(20) = NULL,
    @PaymentDate DATE = NULL,
    @Method NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Payments
    SET 
        Amount = COALESCE(@Amount, Amount),
        Status = COALESCE(@Status, Status),
        PaymentDate = COALESCE(@PaymentDate, PaymentDate),
        Method = COALESCE(@Method, Method)
    WHERE PaymentID = @PaymentID;
END;
GO

CREATE OR ALTER PROCEDURE sp_DeletePayment
    @PaymentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Payments WHERE PaymentID = @PaymentID;
END;
GO

CREATE OR ALTER PROCEDURE sp_GetStudentPayments
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM Payments
    WHERE StudentID = @StudentID
    ORDER BY PaymentDate DESC;
END;
GO

-- ─── 2. SCHOLARSHIPS ─────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_GetScholarshipsList
    @Type NVARCHAR(20) = NULL,
    @Status NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        sc.ScholarshipID,
        sc.Name,
        sc.StudentID,
        u.Name AS StudentName,
        f.Name AS Faculty,
        s.GPA,
        sc.Amount,
        sc.Type,
        sc.Status
    FROM Scholarships sc
    INNER JOIN Students s ON s.StudentID = sc.StudentID
    INNER JOIN Users u ON u.UserID = s.UserID
    INNER JOIN Faculties f ON f.FacultyID = s.FacultyID
    WHERE (@Type IS NULL OR sc.Type = @Type)
      AND (@Status IS NULL OR sc.Status = @Status)
    ORDER BY sc.Amount DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_GetScholarshipByID
    @ScholarshipID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        sc.*,
        u.Name AS StudentName,
        u.Email AS StudentEmail,
        f.Name AS Faculty,
        s.GPA
    FROM Scholarships sc
    INNER JOIN Students s ON s.StudentID = sc.StudentID
    INNER JOIN Users u ON u.UserID = s.UserID
    INNER JOIN Faculties f ON f.FacultyID = s.FacultyID
    WHERE sc.ScholarshipID = @ScholarshipID;
END;
GO

CREATE OR ALTER PROCEDURE sp_CreateScholarship
    @Name NVARCHAR(150),
    @StudentID VARCHAR(20),
    @Amount DECIMAL(10, 2),
    @Type NVARCHAR(20),
    @Status NVARCHAR(20) = 'Active',
    @NewID INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Scholarships (Name, StudentID, Amount, Type, Status)
    VALUES (@Name, @StudentID, @Amount, @Type, @Status);

    SET @NewID = SCOPE_IDENTITY();
END;
GO

CREATE OR ALTER PROCEDURE sp_UpdateScholarship
    @ScholarshipID INT,
    @Name NVARCHAR(150) = NULL,
    @Amount DECIMAL(10, 2) = NULL,
    @Type NVARCHAR(20) = NULL,
    @Status NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Scholarships
    SET 
        Name = COALESCE(@Name, Name),
        Amount = COALESCE(@Amount, Amount),
        Type = COALESCE(@Type, Type),
        Status = COALESCE(@Status, Status)
    WHERE ScholarshipID = @ScholarshipID;
END;
GO

CREATE OR ALTER PROCEDURE sp_DeleteScholarship
    @ScholarshipID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Scholarships WHERE ScholarshipID = @ScholarshipID;
END;
GO

CREATE OR ALTER PROCEDURE sp_GetStudentScholarships
    @StudentID VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM Scholarships
    WHERE StudentID = @StudentID
    ORDER BY Amount DESC;
END;
GO

-- ─── 3. DASHBOARD / ANALYTICS ────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_GetFinanceSummaryDashboard
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COALESCE(SUM(Amount), 0) AS TotalRevenue
    FROM Payments
    WHERE Status = 'Paid';

    SELECT COALESCE(SUM(Amount), 0) AS PendingAmount
    FROM Payments
    WHERE Status IN ('Pending', 'Overdue');

    SELECT COALESCE(SUM(Amount), 0) AS ScholarshipTotal
    FROM Scholarships
    WHERE Status = 'Active';

    SELECT Status, COUNT(*) AS Count
    FROM Payments
    GROUP BY Status;

    SELECT Type, COALESCE(SUM(Amount), 0) AS Total
    FROM Payments
    WHERE Status = 'Paid'
    GROUP BY Type;
END;
GO

CREATE OR ALTER PROCEDURE sp_GetMonthlyRevenue
    @Year INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        MONTH(PaymentDate) AS Month,
        DATENAME(MONTH, PaymentDate) AS MonthName,
        COALESCE(SUM(CASE WHEN Type = 'Tuition' THEN Amount END), 0) AS Tuition,
        COALESCE(SUM(CASE WHEN Type = 'Hostel' THEN Amount END), 0) AS Hostel,
        COALESCE(SUM(CASE WHEN Type = 'Library' THEN Amount END), 0) AS Library,
        COALESCE(SUM(CASE WHEN Type = 'Other' THEN Amount END), 0) AS Other
    FROM Payments
    WHERE Status = 'Paid'
      AND YEAR(PaymentDate) = @Year
    GROUP BY MONTH(PaymentDate), DATENAME(MONTH, PaymentDate)
    ORDER BY Month;
END;
GO