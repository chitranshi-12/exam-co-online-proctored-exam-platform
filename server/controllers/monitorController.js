import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { Violation } from '../models/Violation.js';
import { Notification } from '../models/Notification.js';

export async function getMonitoredAttempts(req, res, next) {
  try {
    const { examId } = req.params;
    const exam = await Exam.findOne({ _id: examId, teacherId: req.teacher._id });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination not found or unauthorized',
        code: 'EXAM_UNAUTHORIZED',
      });
    }

    const attempts = await Attempt.find({ examId }).sort({ createdAt: -1 });
    res.json({ success: true, attempts });
  } catch (error) {
    next(error);
  }
}

export async function getMonitoredAttemptDetail(req, res, next) {
  try {
    const { id } = req.params;
    const attempt = await Attempt.findById(id);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Candidate attempt not found' });
    }

    // Verify teacher owns the exam
    const exam = await Exam.findOne({ _id: attempt.examId, teacherId: req.teacher._id });
    if (!exam) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to attempt' });
    }

    const violations = await Violation.find({ attemptId: id }).sort({ occurredAt: 1 });

    res.json({
      success: true,
      attempt,
      violations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getNotifications(req, res, next) {
  try {
    const { unread } = req.query;
    const query = { teacherId: req.teacher._id };
    if (unread === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ teacherId: req.teacher._id, read: false }, { $set: { read: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
}
