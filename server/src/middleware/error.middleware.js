/**
 * catchAsync — encapsule un handler async pour transmettre les erreurs à next()
 */
exports.catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * createError — crée une erreur avec un status HTTP
 */
exports.createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * errorHandler — gestionnaire d'erreurs global
 */
exports.errorHandler = (err, req, res, _next) => {
  // Erreurs de validation Joi
  if (err.isJoi) {
    return res.status(422).json({
      error:   'Validation error',
      details: err.details.map((d) => d.message),
    });
  }

  // Prisma P2002: unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // Prisma P2025: record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ error: message });
};
