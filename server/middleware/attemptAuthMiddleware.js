import { verifyAttemptToken } from '../utils/token.js';
import { Attempt } from '../models/Attempt.js';

export async function attemptAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Assessment attempt token required',
        code: 'ATTEMPT_AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAttemptToken(token);

    // Verify requested param ID matches token ID strictly as mandated in §8
    const requestedAttemptId = req.params.id || req.body.attemptId;
    if (requestedAttemptId && requestedAttemptId !== decoded.attemptId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Attempt token does not match target candidate record',
        code: 'FORBIDDEN_ATTEMPT_MISMATCH',
      });
    }

    const attempt = await Attempt.findById(decoded.attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Candidate attempt record not found',
        code: 'ATTEMPT_NOT_FOUND',
      });
    }

    req.attempt = attempt;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired assessment session token',
      code: 'INVALID_ATTEMPT_TOKEN',
    });
  }
}
