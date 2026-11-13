import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';
import { signAttemptToken } from '../utils/token.js';

export async function getPublicExam(req, res, next) {
  try {
    const exam = await Exam.findById(req.params.examId).select(
      'title institute description durationMinutes requireFullscreen startTime endTime status'
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination not found',
        code: 'EXAM_NOT_FOUND',
      });
    }

    if (exam.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This examination is currently not active',
        code: 'EXAM_INACTIVE',
      });
    }

    res.json({
      success: true,
      exam: {
        id: exam._id,
        title: exam.title,
        institute: exam.institute,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        requireFullscreen: exam.requireFullscreen,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function enroll(req, res, next) {
  try {
    const { examId } = req.params;
    const { name, rollNo, institute, email, examCode } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination not found',
        code: 'EXAM_NOT_FOUND',
      });
    }

    // 1. Validate exam is active
    if (exam.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This examination is not accepting candidate submissions at this time',
        code: 'EXAM_INACTIVE',
      });
    }

    // 2. Validate time window if set
    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      return res.status(403).json({
        success: false,
        message: `This examination opens on ${exam.startTime.toLocaleString()}`,
        code: 'EXAM_NOT_STARTED',
      });
    }
    if (exam.endTime && now > exam.endTime) {
      return res.status(403).json({
        success: false,
        message: 'This examination has already closed',
        code: 'EXAM_CLOSED',
      });
    }

    // 3. Validate exam access code
    if (exam.examCode && exam.examCode.toUpperCase() !== examCode?.trim().toUpperCase()) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Exam Access Code provided',
        code: 'INVALID_EXAM_CODE',
      });
    }

    // 4. Validate duplicate enrollment
    const existing = await Attempt.findOne({
      examId: exam._id,
      $or: [
        { rollNo: rollNo.trim().toUpperCase() },
        { email: email.trim().toLowerCase() },
      ],
    });

    let attempt;
    if (existing) {
      if (existing.status === 'submitted' || existing.status === 'auto_submitted') {
        return res.status(409).json({
          success: false,
          message: 'Candidate with this Roll Number or Email has already completed this examination',
          code: 'ALREADY_SUBMITTED',
        });
      }
      attempt = existing;
    } else {
      // Create new candidate attempt
      attempt = await Attempt.create({
        examId: exam._id,
        name: name.trim(),
        rollNo: rollNo.trim().toUpperCase(),
        institute: institute.trim(),
        email: email.trim().toLowerCase(),
        status: 'enrolled',
        answers: [],
        totalMarks: exam.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      });
    }

    // Sign attempt JWT (valid for exam duration + 2 hours)
    const token = signAttemptToken({
      attemptId: attempt._id.toString(),
      examId: exam._id.toString(),
      rollNo: attempt.rollNo,
    });

    // Sanitize questions: NEVER return correctIndex to the student client
    let questions = exam.questions.map((q) => ({
      id: q._id,
      text: q.text,
      options: q.options,
      marks: q.marks,
    }));

    // Shuffle questions if enabled
    if (exam.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    res.json({
      success: true,
      token,
      attempt: {
        id: attempt._id,
        name: attempt.name,
        rollNo: attempt.rollNo,
        institute: attempt.institute,
        email: attempt.email,
        status: attempt.status,
        deadlineAt: attempt.deadlineAt,
        answers: attempt.answers,
      },
      questions,
    });
  } catch (error) {
    next(error);
  }
}
