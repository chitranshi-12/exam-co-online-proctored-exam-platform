export function errorHandler(err, req, res, next) {
  console.error(`[EXAM.CO ERROR] ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected. This student Roll Number or Email has already enrolled in this exam.',
      code: 'DUPLICATE_ENTRY',
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication session expired or invalid',
      code: 'AUTH_EXPIRED',
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred',
    code: err.code || 'INTERNAL_ERROR',
  });
}
