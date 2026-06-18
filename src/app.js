import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import studentRoutes from './routes/student.routes.js';
import miscRoutes from './routes/misc.student.routes.js';
import financeRoutes from './routes/finance.routes.js';
import examinationRoutes from './routes/examination.routes.js';
import courseRoutes from './routes/course.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import lecturerRoutes from './routes/lecturer.routes.js';

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

app.use('/api/students', studentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api', miscRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);
app.use('/api/lecturers', lecturerRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date() })
);

app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);


export default app;