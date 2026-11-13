import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'examco_teacher_default_jwt_secret_2026';
const ATTEMPT_JWT_SECRET = process.env.ATTEMPT_JWT_SECRET || 'examco_attempt_default_jwt_secret_2026';

export function signTeacherToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyTeacherToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function signAttemptToken(payload, expiresIn = '6h') {
  return jwt.sign(payload, ATTEMPT_JWT_SECRET, { expiresIn });
}

export function verifyAttemptToken(token) {
  return jwt.verify(token, ATTEMPT_JWT_SECRET);
}
