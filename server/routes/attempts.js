import { Router } from 'express';
import multer from 'multer';
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  heartbeat,
  logViolation,
  uploadEvidence,
} from '../controllers/attemptController.js';
import { attemptAuth } from '../middleware/attemptAuthMiddleware.js';
import { getGridFSBucket } from '../config/db.js';

const router = Router();

// Multer memory storage with 200 KB max and jpeg/webp filter as strictly required in §7
const upload = multer({
  limits: { fileSize: 200 * 1024 }, // 200 KB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/webp') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and WebP images are allowed for evidence storage.'));
    }
  },
});

// Middleware to stream memory buffer directly to GridFS bucket "evidence"
const storeToGridFS = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const bucket = getGridFSBucket();
    if (!bucket) {
      req.file.id = new Date().getTime().toString();
      return next();
    }
    const filename = `evidence_${req.params.id}_${Date.now()}.jpg`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: { attemptId: req.params.id },
    });

    uploadStream.end(req.file.buffer);
    uploadStream.on('finish', () => {
      req.file.id = uploadStream.id;
      req.file.filename = filename;
      next();
    });
    uploadStream.on('error', (err) => next(err));
  } catch (err) {
    next(err);
  }
};

router.use('/:id', attemptAuth);

router.post('/:id/start', startAttempt);
router.patch('/:id/answer', saveAnswer);
router.post('/:id/submit', submitAttempt);
router.post('/:id/heartbeat', heartbeat);
router.post('/:id/violations', logViolation);
router.post('/:id/evidence', upload.single('image'), storeToGridFS, uploadEvidence);

export default router;
