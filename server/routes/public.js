import { Router } from 'express';
import { getPublicExam, enroll } from '../controllers/publicController.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limit on enrollments to prevent brute-forcing
const enrollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many enrollment requests from this IP. Please wait 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

router.get('/exams/:examId', getPublicExam);
router.post('/exams/:examId/enroll', enrollLimiter, enroll);

export default router;
