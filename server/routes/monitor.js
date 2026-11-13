import { Router } from 'express';
import {
  getMonitoredAttempts,
  getMonitoredAttemptDetail,
  getNotifications,
  markAllNotificationsRead,
} from '../controllers/monitorController.js';
import { teacherAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(teacherAuth);

router.get('/exams/:examId/attempts', getMonitoredAttempts);
router.get('/attempts/:id', getMonitoredAttemptDetail);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);

export default router;
