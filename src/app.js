import express from 'express';
import cors from 'cors';
import studentroutes from "./routes/student.routes.js";


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/students', studentroutes);

export default app;