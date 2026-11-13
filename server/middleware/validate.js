export function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message).join(', ');
      return res.status(400).json({
        success: false,
        message: details,
        code: 'VALIDATION_ERROR',
      });
    }
    next();
  };
}
