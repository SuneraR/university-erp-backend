import sql from 'mssql';
import { getPool } from '../config/db.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function sqlErrToHttp(err) {
  const map = {
    50001: 400, 50002: 409, 50003: 404, 50004: 404, 50005: 409,
    50006: 404, 50007: 400, 50008: 404, 50009: 400, 50010: 404,
  };
  return map[err.number] || 500;
}

function handleError(res, err, context = '') {
  console.error(`[examinationController] ${context}`, err.message);
  const status = sqlErrToHttp(err);
  res.status(status).json({ success: false, message: err.message });
}

/**
 * Grade + GPA point lookup
 */
function gradeFromScore(score) {
  if (score >= 90) return { grade: 'A+', gpa_point: 4.0 };
  if (score >= 85) return { grade: 'A',  gpa_point: 4.0 };
  if (score >= 80) return { grade: 'A-', gpa_point: 3.7 };
  if (score >= 75) return { grade: 'B+', gpa_point: 3.3 };
  if (score >= 70) return { grade: 'B',  gpa_point: 3.0 };
  if (score >= 65) return { grade: 'B-', gpa_point: 2.7 };
  if (score >= 60) return { grade: 'C+', gpa_point: 2.3 };
  if (score >= 55) return { grade: 'C',  gpa_point: 2.0 };
  if (score >= 50) return { grade: 'C-', gpa_point: 1.7 };
  return { grade: 'F', gpa_point: 0.0 };
}

// ─── 1. EXAMINATIONS ─────────────────────────────────────────────────────────

export const getAllExams = async (req, res) => {
  try {
    const { status = null, course_id = null } = req.query;
    const pool = await getPool();

    const result = await pool.request()
      .input('Status', sql.VarChar(50), status)
      .input('CourseID', sql.VarChar(20), course_id)
      .execute('sp_GetExaminationsList');

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getAllExams');
  }
};

export const getExamStats = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().execute('sp_GetExaminationStats');
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    handleError(res, err, 'getExamStats');
  }
};

export const getExamById = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ExamID', sql.VarChar(20), req.params.exam_id)
      .execute('sp_GetExaminationByID');

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    handleError(res, err, 'getExamById');
  }
};

export const createExam = async (req, res) => {
  try {
    const { course_id, exam_date, exam_time, duration, hall, capacity, invigilator_id, status = 'Scheduled' } = req.body;

    if (!course_id || !exam_date || !exam_time || !hall) {
      return res.status(400).json({ success: false, message: 'course_id, exam_date, exam_time and hall are required' });
    }

    const pool = await getPool();

    // 1. Hall conflict check
    const conflict = await pool.request()
      .input('Hall', sql.VarChar(100), hall)
      .input('ExamDate', sql.Date, exam_date)
      .input('ExamTime', sql.VarChar(50), exam_time)
      .input('ExamID', sql.VarChar(20), '') // blank for create
      .execute('sp_CheckHallConflict');

    if (conflict.recordset.length) {
      return res.status(409).json({
        success: false,
        message: `Hall "${hall}" is already booked at that date and time`,
        conflict: conflict.recordset[0].exam_id,
      });
    }

    // 2. Create the Exam (ID is auto-generated inside the Stored Procedure)
    const result = await pool.request()
      .input('CourseID', sql.VarChar(20), course_id)
      .input('ExamDate', sql.Date, exam_date)
      .input('ExamTime', sql.VarChar(50), exam_time)
      .input('Duration', sql.VarChar(50), duration)
      .input('Hall', sql.VarChar(100), hall)
      .input('Capacity', sql.Int, capacity)
      .input('InvigilatorID', sql.VarChar(20), invigilator_id || null)
      .input('Status', sql.VarChar(50), status)
      .output('NewExamID', sql.VarChar(20))
      .execute('sp_CreateExamination');

    res.status(201).json({ 
      success: true, 
      message: 'Examination scheduled', 
      exam_id: result.output.NewExamID 
    });
  } catch (err) {
    handleError(res, err, 'createExam');
  }
};

export const updateExam = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { exam_date, exam_time, duration, hall, capacity, invigilator_id, status } = req.body;

    const pool = await getPool();

    // 1. Existence check
    const exists = await pool.request()
      .input('ExamID', sql.VarChar(20), exam_id)
      .execute('sp_GetExaminationByID');
      
    if (!exists.recordset.length) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }

    // 2. Hall conflict check (excluding itself)
    if (hall && exam_date && exam_time) {
      const conflict = await pool.request()
        .input('Hall', sql.VarChar(100), hall)
        .input('ExamDate', sql.Date, exam_date)
        .input('ExamTime', sql.VarChar(50), exam_time)
        .input('ExamID', sql.VarChar(20), exam_id)
        .execute('sp_CheckHallConflict');
        
      if (conflict.recordset.length) {
        return res.status(409).json({
          success: false,
          message: `Hall "${hall}" is already booked at that date and time`,
          conflict: conflict.recordset[0].exam_id,
        });
      }
    }

    // 3. Perform update
    await pool.request()
      .input('ExamID', sql.VarChar(20), exam_id)
      .input('ExamDate', sql.Date, exam_date)
      .input('ExamTime', sql.VarChar(50), exam_time)
      .input('Duration', sql.VarChar(50), duration)
      .input('Hall', sql.VarChar(100), hall)
      .input('Capacity', sql.Int, capacity)
      .input('InvigilatorID', sql.VarChar(20), invigilator_id || null)
      .input('Status', sql.VarChar(50), status)
      .execute('sp_UpdateExamination');

    res.json({ success: true, message: 'Examination updated' });
  } catch (err) {
    handleError(res, err, 'updateExam');
  }
};

export const updateExamStatus = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const { status } = req.body;

    const allowed = ['Scheduled', 'Completed', 'Cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }

    const pool = await getPool();
    await pool.request()
      .input('ExamID', sql.VarChar(20), exam_id)
      .input('Status', sql.VarChar(50), status)
      .execute('sp_UpdateExaminationStatus');

    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    handleError(res, err, 'updateExamStatus');
  }
};

export const deleteExam = async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('ExamID', sql.VarChar(20), req.params.exam_id)
      .execute('sp_DeleteExamination');

    res.json({ success: true, message: 'Examination deleted' });
  } catch (err) {
    handleError(res, err, 'deleteExam');
  }
};

// ─── 2. RESULTS ──────────────────────────────────────────────────────────────

export const getResultsByExam = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('ExamID', sql.VarChar(20), req.params.exam_id)
      .execute('sp_GetResultsByExam');
      
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getResultsByExam');
  }
};

export const getResultsByStudent = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('StudentID', sql.VarChar(20), req.params.student_id)
      .execute('sp_GetResultsByStudent');
      
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    handleError(res, err, 'getResultsByStudent');
  }
};

export const upsertResult = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    if (!payload.length) {
      return res.status(400).json({ success: false, message: 'No result data provided' });
    }

    const pool = await getPool();

    // Verify exam exists and is Completed
    const exam = await pool.request()
      .input('ExamID', sql.VarChar(20), exam_id)
      .execute('sp_GetExaminationByID');

    if (!exam.recordset.length) {
      return res.status(404).json({ success: false, message: 'Examination not found' });
    }
    if (exam.recordset[0].status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Results can only be entered for Completed examinations' });
    }

    // Begin bulk transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const row of payload) {
        const { student_id, score } = row;
        if (!student_id || score == null) continue;

        const { grade, gpa_point } = gradeFromScore(Number(score));
        
        // Use a new Request per iteration mapped to the transaction
        const request = new sql.Request(transaction);
        await request
          .input('ExamID', sql.VarChar(20), exam_id)
          .input('StudentID', sql.VarChar(20), student_id)
          .input('Score', sql.Decimal(5, 2), score)
          .input('Grade', sql.VarChar(5), grade)
          .input('GpaPoint', sql.Decimal(3, 2), gpa_point)
          .execute('sp_UpsertExamResult');
      }
      await transaction.commit();
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }

    res.status(201).json({ success: true, message: `${payload.length} result(s) saved` });
  } catch (err) {
    handleError(res, err, 'upsertResult');
  }
};

export const deleteResult = async (req, res) => {
  try {
    const { exam_id, student_id } = req.params;
    const pool = await getPool();
    
    await pool.request()
      .input('ExamID', sql.VarChar(20), exam_id)
      .input('StudentID', sql.VarChar(20), student_id)
      .execute('sp_DeleteExamResult');

    res.json({ success: true, message: 'Result deleted' });
  } catch (err) {
    handleError(res, err, 'deleteResult');
  }
};