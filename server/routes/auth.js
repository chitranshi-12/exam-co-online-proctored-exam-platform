import { Router } from 'express';
import { googleAuth, getMe } from '../controllers/authController.js';
import { teacherAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/google', googleAuth);
router.get('/me', teacherAuth, getMe);

export default router;
