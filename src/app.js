import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import studentRoutes from './routes/student.routes.js';
import miscRoutes from './routes/misc.student.routes.js';
import financeRoutes from './routes/finance.routes.js';
import examinationRoutes from './routes/examination.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/students', studentRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api', miscRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date() })
);

app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

export default app;