import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    success: true,
    service: 'exam.co backend engine',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

export default router;
