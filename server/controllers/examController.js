import { Exam } from '../models/Exam.js';
import { Attempt } from '../models/Attempt.js';

export async function createExam(req, res, next) {
  try {
    const {
      title,
      institute,
      description,
      examCode,
      durationMinutes,
      startTime,
      endTime,
      requireFullscreen,
      shuffleQuestions,
      status,
      questions,
    } = req.body;

    const exam = await Exam.create({
      teacherId: req.teacher._id,
      title,
      institute,
      description,
      examCode: (examCode || Math.random().toString(36).substring(2, 8)).toUpperCase(),
      durationMinutes: durationMinutes || 60,
      startTime,
      endTime,
      requireFullscreen: requireFullscreen ?? true,
      shuffleQuestions: shuffleQuestions ?? false,
      status: status || 'draft',
      questions: questions || [],
    });

    res.status(201).json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function getExams(req, res, next) {
  try {
    const exams = await Exam.find({ teacherId: req.teacher._id }).sort({ createdAt: -1 });
    res.json({ success: true, exams });
  } catch (error) {
    next(error);
  }
}

export async function getExamById(req, res, next) {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      teacherId: req.teacher._id,
    });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination not found or unauthorized access',
        code: 'EXAM_NOT_FOUND',
      });
    }
    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function updateExam(req, res, next) {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.teacher._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or you are not the owner',
        code: 'EXAM_NOT_FOUND',
      });
    }
    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function deleteExam(req, res, next) {
  try {
    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.teacher._id,
    });
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or you are not the owner',
        code: 'EXAM_NOT_FOUND',
      });
    }
    // Clean up associated attempts
    await Attempt.deleteMany({ examId: req.params.id });
    res.json({ success: true, message: 'Exam and attempts deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateExamStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be draft, active, or closed.',
        code: 'INVALID_STATUS',
      });
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.teacher._id },
      { $set: { status } },
      { new: true }
    );
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or unauthorized',
        code: 'EXAM_NOT_FOUND',
      });
    }
    res.json({ success: true, exam });
  } catch (error) {
    next(error);
  }
}

export async function getExamLink(req, res, next) {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      teacherId: req.teacher._id,
    });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const link = `${clientUrl}/exam/${exam._id}`;

    res.json({
      success: true,
      link,
      examCode: exam.examCode,
      qrData: link,
    });
  } catch (error) {
    next(error);
  }
}

export async function importQuestionsCsv(req, res, next) {
  try {
    const { csvContent } = req.body;
    if (!csvContent) {
      return res.status(400).json({ success: false, message: 'csvContent is required' });
    }

    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedQuestions = [];

    // Columns: question, optionA, optionB, optionC, optionD, correct, marks
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 6) {
        let correctIdx = 0;
        const correctVal = cols[5].toUpperCase();
        if (correctVal === 'B' || correctVal === '1') correctIdx = 1;
        else if (correctVal === 'C' || correctVal === '2') correctIdx = 2;
        else if (correctVal === 'D' || correctVal === '3') correctIdx = 3;

        parsedQuestions.push({
          text: cols[0],
          options: [cols[1], cols[2], cols[3], cols[4]],
          correctIndex: correctIdx,
          marks: cols[6] ? parseInt(cols[6], 10) || 1 : 1,
        });
      }
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.teacher._id },
      { $push: { questions: { $each: parsedQuestions } } },
      { new: true }
    );

    res.json({ success: true, count: parsedQuestions.length, exam });
  } catch (error) {
    next(error);
  }
}
