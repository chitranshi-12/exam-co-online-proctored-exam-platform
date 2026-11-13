import { Attempt } from '../models/Attempt.js';
import { Exam } from '../models/Exam.js';
import { emitToExamRoom } from '../sockets/socketHandler.js';

export function startAutoSubmitJob(intervalMs = 15000) {
  setInterval(async () => {
    try {
      const now = new Date();
      // Find all in_progress attempts whose deadline has passed
      const expiredAttempts = await Attempt.find({
        status: 'in_progress',
        deadlineAt: { $lt: now },
      });

      for (const attempt of expiredAttempts) {
        const exam = await Exam.findById(attempt.examId);
        let score = 0;
        let totalMarks = 0;

        if (exam && exam.questions) {
          totalMarks = exam.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
          attempt.answers.forEach((ans) => {
            const q = exam.questions.id(ans.questionId);
            if (q && q.correctIndex === ans.selectedIndex) {
              score += q.marks || 1;
            }
          });
        }

        attempt.status = 'auto_submitted';
        attempt.submittedAt = now;
        attempt.score = score;
        attempt.totalMarks = totalMarks || 10;
        await attempt.save();

        console.log(`[AUTO-SUBMIT] Exam ${attempt.examId} attempt ${attempt._id} for ${attempt.name} auto-submitted.`);

        emitToExamRoom(attempt.examId.toString(), 'attempt_status', {
          id: attempt._id,
          status: 'auto_submitted',
          score: attempt.score,
          totalMarks: attempt.totalMarks,
          submittedAt: attempt.submittedAt,
        });
      }
    } catch (err) {
      console.error('Error running autoSubmitJob:', err.message);
    }
  }, intervalMs);

  console.log('✅ Auto-submit job running every 15s.');
}
