import { verifyTeacherToken } from '../utils/token.js';
import { Teacher } from '../models/Teacher.js';

export async function teacherAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyTeacherToken(token);

    // Support demo teacher token
    if (decoded.teacherId === 'demo_teacher_vance') {
      req.teacher = {
        _id: 'demo_teacher_vance',
        id: 'demo_teacher_vance',
        name: 'Dr. Eleanor Vance',
        email: 'e.vance@stanford.edu',
      };
      return next();
    }

    const teacher = await Teacher.findById(decoded.teacherId);
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Teacher profile not found or expired',
        code: 'USER_NOT_FOUND',
      });
    }

    req.teacher = teacher;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token',
      code: 'INVALID_TOKEN',
    });
  }
}
