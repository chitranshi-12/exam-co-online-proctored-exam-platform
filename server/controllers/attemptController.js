import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { Violation } from '../models/Violation.js';
import { Notification } from '../models/Notification.js';
import { getGridFSBucket } from '../config/db.js';
import { emitToExamRoom } from '../sockets/socketHandler.js';

export async function startAttempt(req, res, next) {
  try {
    const attempt = req.attempt;
    const exam = await Exam.findById(attempt.examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (attempt.status === 'enrolled') {
      const now = new Date();
      const deadlineAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);

      attempt.status = 'in_progress';
      attempt.startedAt = now;
      attempt.deadlineAt = deadlineAt;
      attempt.lastHeartbeat = now;
      attempt.isOnline = true;
      await attempt.save();

      // Notify teacher room
      emitToExamRoom(exam._id.toString(), 'attempt_status', {
        id: attempt._id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        isOnline: true,
      });
    }

    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

export async function saveAnswer(req, res, next) {
  try {
    const attempt = req.attempt;
    const { questionId, selectedIndex } = req.body;

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Assessment is not in active progress state',
        code: 'EXAM_NOT_ACTIVE',
      });
    }

    // Verify deadlineAt
    if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
      attempt.status = 'auto_submitted';
      await attempt.save();
      return res.status(403).json({
        success: false,
        message: 'Exam duration has expired. Responses can no longer be modified.',
        code: 'DEADLINE_EXPIRED',
      });
    }

    const existingAnsIndex = attempt.answers.findIndex(
      (a) => a.questionId.toString() === questionId
    );

    if (existingAnsIndex >= 0) {
      attempt.answers[existingAnsIndex].selectedIndex = selectedIndex;
      attempt.answers[existingAnsIndex].answeredAt = new Date();
    } else {
      attempt.answers.push({
        questionId: new mongoose.Types.ObjectId(questionId),
        selectedIndex,
        answeredAt: new Date(),
      });
    }

    attempt.lastHeartbeat = new Date();
    await attempt.save();

    // Broadcast candidate progress update to teacher
    emitToExamRoom(attempt.examId.toString(), 'progress_update', {
      id: attempt._id,
      answeredCount: attempt.answers.length,
    });

    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

export async function submitAttempt(req, res, next) {
  try {
    const attempt = req.attempt;
    const exam = await Exam.findById(attempt.examId);

    // Idempotent: if already submitted, return current record
    if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
      return res.json({ success: true, attempt });
    }

    // Server-side scoring as strictly mandated in §7 & §8
    let calculatedScore = 0;
    let totalExamMarks = 0;

    if (exam && exam.questions) {
      totalExamMarks = exam.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

      attempt.answers.forEach((ans) => {
        const question = exam.questions.id(ans.questionId);
        if (question && question.correctIndex === ans.selectedIndex) {
          calculatedScore += question.marks || 1;
        }
      });
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.score = calculatedScore;
    attempt.totalMarks = totalExamMarks || 10;
    await attempt.save();

    emitToExamRoom(attempt.examId.toString(), 'attempt_status', {
      id: attempt._id,
      status: 'submitted',
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      submittedAt: attempt.submittedAt,
    });

    res.json({ success: true, attempt });
  } catch (error) {
    next(error);
  }
}

export async function heartbeat(req, res, next) {
  try {
    const attempt = req.attempt;
    const { isOnline } = req.body;

    attempt.lastHeartbeat = new Date();
    if (typeof isOnline === 'boolean') {
      attempt.isOnline = isOnline;
    }
    await attempt.save();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function logViolation(req, res, next) {
  try {
    const attempt = req.attempt;
    const { examId, type, details, occurredAt, screenshotFileId, webcamFileId } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const eventTime = occurredAt ? new Date(occurredAt) : new Date();

    // Deduplicate identical violation within 3 seconds
    const duplicate = await Violation.findOne({
      attemptId: attempt._id,
      type,
      occurredAt: {
        $gte: new Date(eventTime.getTime() - 3000),
        $lte: new Date(eventTime.getTime() + 3000),
      },
    });

    if (duplicate) {
      return res.json({ success: true, violation: duplicate, duplicate: true });
    }

    const violation = await Violation.create({
      attemptId: attempt._id,
      examId: exam._id,
      type,
      occurredAt: eventTime,
      receivedAt: new Date(),
      details: details || '',
      screenshotFileId: screenshotFileId ? new mongoose.Types.ObjectId(screenshotFileId) : null,
      webcamFileId: webcamFileId ? new mongoose.Types.ObjectId(webcamFileId) : null,
    });

    // Increment attempt violation count
    attempt.violationCount = (attempt.violationCount || 0) + 1;
    await attempt.save();

    // Create teacher notification
    const notification = await Notification.create({
      teacherId: exam.teacherId,
      examId: exam._id,
      attemptId: attempt._id,
      violationId: violation._id,
      message: `${attempt.name} (${attempt.rollNo}) triggered ${type.replace(/_/g, ' ')}`,
      read: false,
    });

    // Real-time socket emission to teacher room
    emitToExamRoom(exam._id.toString(), 'violation_created', {
      id: violation._id,
      attemptId: attempt._id,
      studentName: attempt.name,
      rollNo: attempt.rollNo,
      type: violation.type,
      occurredAt: violation.occurredAt,
      details: violation.details,
    });

    emitToExamRoom(exam._id.toString(), 'notification', notification);

    res.status(201).json({ success: true, violation });
  } catch (error) {
    next(error);
  }
}

export async function uploadEvidence(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    res.json({
      success: true,
      fileId: req.file.id,
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
}
