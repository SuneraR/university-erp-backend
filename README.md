# University ERP Backend

Backend API for a university ERP system built with Node.js, Express, and Microsoft SQL Server. The application exposes role-based endpoints for authentication, user management, students, lecturers, courses, examinations, finance, attendance, results, payments, and scholarships.

## Features

- JWT-based authentication with access and refresh tokens
- Role-based access control for Admin, Lecturer, and Student accounts
- Admin onboarding and account activation flow
- User lifecycle management for students and lecturers
- Student registration, profile management, enrollments, attendance, results, payments, and scholarships
- Lecturer CRUD plus lecturer course lookups
- Course management with enrollment, exam, and statistics subresources
- Examination scheduling, status updates, result entry, and result lookup
- Finance management for payments, scholarships, dashboard summary, and monthly revenue
- Health check endpoint for service monitoring

## Tech Stack

- Node.js
- Express 5
- Microsoft SQL Server via `mssql`
- JWT for authentication
- `bcrypt` / `bcryptjs` for password hashing
- `cors`, `cookie-parser`, `morgan`, and `dotenv`

## Project Structure

- `server.js` - application entry point
- `src/app.js` - Express app configuration and route mounting
- `src/config/db.js` - SQL Server connection pool
- `src/controllers/` - request handlers for each feature area
- `src/middleware/` - authentication and validation middleware
- `src/routes/` - API route definitions
- `src/queries/` - SQL query files used by the data layer

## Requirements

- Node.js 18+ recommended
- Microsoft SQL Server database
- Database stored procedures and tables expected by the controllers

## Environment Variables

Create a `.env` file in the project root with at least the following values:

```env
PORT=5050

DB_SERVER=localhost
DB_NAME=university_erp
DB_USER=sa
DB_PASS=your_password
DB_PORT=1433

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
JWT_REFRESH_DAYS=7
NODE_ENV=development
```

## Installation

```bash
npm install
```

## Running the App

```bash
npm run dev
```

For production:

```bash
npm start
```

The server connects to the database before starting and listens on `PORT` or `5050` by default.

## API Overview

Base URL examples assume the server is running locally.

### Health

- `GET /health` - service status check

### Authentication

Mounted under `/api/auth`.

- `POST /login` - authenticate a user
- `POST /refresh` - rotate refresh token and issue a new access token
- `POST /logout` - revoke the current session
- `POST /logout-all` - revoke all sessions for the current user
- `GET /me` - get the current user profile
- `POST /change-password` - update password
- `POST /activate` - activate a pending account
- `POST /register-admin` - create an admin account
- `GET /users` - list users, optional `?role=Student|Lecturer|Admin`
- `GET /users/:id` - get a user and role-specific profile
- `POST /users/create` - create a base user account for student or lecturer onboarding
- `POST /users/:id/register-student` - register an existing user as a student
- `POST /users/:id/register-lecturer` - register an existing user as a lecturer
- `PATCH /users/:id/toggle-active` - activate or deactivate a user

### Students

Mounted under `/api/students`.

- `GET /` - list students
- `POST /` - register a student
- `GET /stats` - student dashboard stats
- `GET /by-user/:user_id` - get student by user id
- `GET /:id` - get a student by id
- `PATCH /:id` - update student details
- `DELETE /:id` - delete a student
- `GET /:id/summary` - student summary dashboard
- `GET /:id/enrollments` - list enrollments
- `POST /:id/enrollments` - enroll student in a course
- `DELETE /:id/enrollments` - drop an enrollment
- `GET /:id/attendance` - attendance history
- `GET /:id/results` - academic results
- `GET /:id/payments` - payment history
- `POST /:id/payments` - create a payment
- `GET /:id/scholarships` - scholarships for the student
- `POST /:id/scholarships` - award a scholarship to the student

### Student Utilities

Mounted under `/api`.

- `POST /attendance` - mark attendance
- `POST /results` - upsert a result
- `PATCH /payments/:paymentId` - update payment status

### Finance

Mounted under `/api/finance`.

- `GET /summary` - finance dashboard summary
- `GET /revenue/monthly` - monthly revenue chart data
- `GET /payments` - list payments with filters
- `POST /payments` - create payment
- `GET /payments/:paymentId` - get a payment
- `PATCH /payments/:paymentId` - update a payment
- `DELETE /payments/:paymentId` - delete a payment
- `GET /scholarships` - list scholarships
- `POST /scholarships` - create scholarship
- `GET /scholarships/:scholarshipId` - get a scholarship
- `PATCH /scholarships/:scholarshipId` - update a scholarship
- `DELETE /scholarships/:scholarshipId` - delete a scholarship
- `GET /student/:studentId/payments` - student payment history
- `GET /student/:studentId/scholarships` - student scholarship history

### Courses

Mounted under `/api/courses`.

- `GET /` - list courses
- `POST /` - create a course
- `GET /:id` - get a course by id
- `PUT /:id` - update a course
- `DELETE /:id` - delete a course
- `GET /:id/enrollments` - list course enrollments
- `GET /:id/exams` - list course exams
- `GET /:id/stats` - course statistics

### Examinations

Mounted under `/api/examinations`.

- `GET /` - list examinations
- `GET /stats` - exam dashboard stats
- `GET /:exam_id` - get an examination
- `POST /` - schedule an examination
- `PUT /:exam_id` - update an examination
- `PATCH /:exam_id/status` - update exam status
- `DELETE /:exam_id` - delete an examination
- `GET /:exam_id/results` - get results for an examination
- `POST /:exam_id/results` - enter or update results
- `DELETE /:exam_id/results/:student_id` - delete one exam result
- `GET /student/:student_id/results` - get all results for a student

### Lecturers

Mounted under `/api/lecturers`.

- `GET /` - list lecturers
- `POST /` - register a lecturer
- `GET /:id` - get lecturer details
- `PATCH /:id` - update lecturer details
- `DELETE /:id` - delete a lecturer
- `GET /faculty/:facultyId` - list lecturers by faculty
- `GET /department/:departmentId` - list lecturers by department
- `GET /:id/courses` - list courses assigned to a lecturer

## Notes

- CORS is configured for `http://localhost:5173`, which matches a typical local frontend dev server.
- Authentication uses HTTP-only refresh token cookies plus bearer access tokens.
- Most business logic is implemented through SQL Server stored procedures, so the database schema must match the controller expectations.
- The app returns a JSON 404 response for unknown routes.

## License

ISC
