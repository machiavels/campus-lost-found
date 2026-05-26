'use strict';

/**
 * HTTP status -> RFC 7807 title mapping
 * https://www.rfc-editor.org/rfc/rfc7807
 */
const STATUS_TITLES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/**
 * catchAsync — wraps an async route handler and forwards errors to next()
 */
exports.catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * createError — creates an RFC-7807-aware Error
 * @param {number} statusCode
 * @param {string} detail      — human-readable explanation
 * @param {string} [type]      — URI identifying the error type (default: 'about:blank')
 */
exports.createError = (statusCode, detail, type = 'about:blank') => {
  const err      = new Error(detail);
  err.statusCode = statusCode;
  err.detail     = detail;
  err.type       = type;
  return err;
};

/**
 * errorHandler — global error handler (RFC 7807 Problem Details)
 *
 * Response shape:
 *   Content-Type: application/problem+json
 *   {
 *     type:     string  (URI, default 'about:blank'),
 *     title:    string  (HTTP status phrase),
 *     status:   number,
 *     detail:   string  (human-readable message),
 *     instance: string  (request path)
 *   }
 */
exports.errorHandler = (err, req, res, _next) => {
  // ── Joi validation error ───────────────────────────────────────────────────
  if (err.isJoi) {
    return res
      .status(422)
      .type('application/problem+json')
      .json({
        type:     'about:blank',
        title:    'Unprocessable Entity',
        status:   422,
        detail:   err.details.map((d) => d.message).join('; '),
        instance: req.path,
      });
  }

  // ── Prisma unique-constraint ──────────────────────────────────────────────
  if (err.code === 'P2002') {
    return res
      .status(409)
      .type('application/problem+json')
      .json({
        type:     'about:blank',
        title:    'Conflict',
        status:   409,
        detail:   'Resource already exists',
        instance: req.path,
      });
  }

  // ── Prisma record-not-found ───────────────────────────────────────────────
  if (err.code === 'P2025') {
    return res
      .status(404)
      .type('application/problem+json')
      .json({
        type:     'about:blank',
        title:    'Not Found',
        status:   404,
        detail:   'Resource not found',
        instance: req.path,
      });
  }

  // ── Generic / unhandled error ───────────────────────────────────────────────
  const statusCode = err.statusCode || err.status || 500;
  const title      = STATUS_TITLES[statusCode] || 'Internal Server Error';
  const detail     = err.detail || err.message || title;
  const type       = err.type   || 'about:blank';

  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  res
    .status(statusCode)
    .type('application/problem+json')
    .json({
      type,
      title,
      status:   statusCode,
      detail,
      instance: req.path,
    });
};
