import { Router } from 'express';
import mongoose from 'mongoose';
import { getGridFSBucket } from '../config/db.js';
import { teacherAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:fileId', teacherAuth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const bucket = getGridFSBucket();
    if (!bucket) {
      return res.status(503).json({ success: false, message: 'GridFS storage is not available' });
    }

    const _id = new mongoose.Types.ObjectId(fileId);
    const downloadStream = bucket.openDownloadStream(_id);

    downloadStream.on('file', (file) => {
      res.setHeader('Content-Type', file.contentType || 'image/jpeg');
    });

    downloadStream.on('error', (err) => {
      return res.status(404).json({ success: false, message: 'Evidence file not found' });
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
