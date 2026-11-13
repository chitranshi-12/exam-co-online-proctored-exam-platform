import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { Violation } from '../models/Violation.js';
import { Notification } from '../models/Notification.js';
import { emitToExamRoom } from '../sockets/socketHandler.js';

export function startHeartbeatJob(intervalMs = 10000) {
  setInterval(async () => {
    try {
      const threshold = new Date(Date.now() - 15000); // 15 seconds threshold

      // Find candidates who are marked online but haven't pulsed a heartbeat in >15s
      const stalledAttempts = await Attempt.find({
        status: 'in_progress',
        isOnline: true,
        lastHeartbeat: { $lt: threshold },
      });

      for (const attempt of stalledAttempts) {
        attempt.isOnline = false;
        await attempt.save();

        const exam = await Exam.findById(attempt.examId);

        const violation = await Violation.create({
          attemptId: attempt._id,
          examId: attempt.examId,
          type: 'offline',
          occurredAt: new Date(),
          details: 'Socket heartbeat missed for over 15 seconds',
        });

        attempt.violationCount = (attempt.violationCount || 0) + 1;
        await attempt.save();

        if (exam) {
          const notif = await Notification.create({
            teacherId: exam.teacherId,
            examId: exam._id,
            attemptId: attempt._id,
            violationId: violation._id,
            message: `${attempt.name} went offline (Heartbeat timeout >15s)`,
          });

          emitToExamRoom(exam._id.toString(), 'attempt_status', {
            id: attempt._id,
            isOnline: false,
          });

          emitToExamRoom(exam._id.toString(), 'violation_created', {
            id: violation._id,
            attemptId: attempt._id,
            studentName: attempt.name,
            rollNo: attempt.rollNo,
            type: 'offline',
            occurredAt: violation.occurredAt,
            details: violation.details,
          });

          emitToExamRoom(exam._id.toString(), 'notification', notif);
        }
      }
    } catch (err) {
      console.error('Error running heartbeatJob:', err.message);
    }
  }, intervalMs);

  console.log('✅ Heartbeat monitor job running every 10s.');
}
