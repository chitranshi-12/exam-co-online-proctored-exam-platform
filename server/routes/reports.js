import { Router } from 'express';
import { exportExamResultsCsv, exportAttemptPdfReport } from '../controllers/reportController.js';
import { teacherAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(teacherAuth);

router.get('/exams/:examId/results.csv', exportExamResultsCsv);
router.get('/attempts/:id/report.pdf', exportAttemptPdfReport);

export default router;
