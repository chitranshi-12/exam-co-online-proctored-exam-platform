import { Router } from 'express';
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  updateExamStatus,
  getExamLink,
  importQuestionsCsv,
} from '../controllers/examController.js';
import { teacherAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(teacherAuth);

router.post('/', createExam);
router.get('/', getExams);
router.get('/:id', getExamById);
router.put('/:id', updateExam);
router.delete('/:id', deleteExam);
router.patch('/:id/status', updateExamStatus);
router.get('/:id/link', getExamLink);
router.post('/:id/import-csv', importQuestionsCsv);

export default router;
