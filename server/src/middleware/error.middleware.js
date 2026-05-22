/**
 * catchAsync — encapsule un handler async pour transmettre les erreurs à next()
 */
exports.catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * createError — crée une Error enrichie compatible RFC 7807
 * @param {number} statusCode  HTTP status (ex: 404, 422)
 * @param {string} detail      Message lisible (detail RFC 7807)
 * @param {string} [type]      URI de type d'erreur (défaut: about:blank)
 */
exports.createError = (statusCode, detail, type = 'about:blank') => {
  const err = new Error(detail);
  err.statusCode = statusCode;
  err.detail     = detail;
  err.type       = type;
  return err;
};

// Mapping status → title RFC 7807
const STATUS_TITLES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/**
 * errorHandler — gestionnaire d'erreurs global Express, conforme RFC 7807
 * Content-Type: application/problem+json
 *
 * Format de réponse :
 * {
 *   type:     string  (URI identifiant le type d'erreur)
 *   title:    string  (libellé court du statut HTTP)
 *   status:   number  (code HTTP)
 *   detail:   string  (message explicatif)
 *   instance: string  (path de la requête)
 * }
 */
exports.errorHandler = (err, req, res, _next) => {
  const status  = err.statusCode || err.status || 500;
  const detail  = err.detail || err.message || 'Erreur interne du serveur';
  const type    = err.type || 'about:blank';
  const title   = STATUS_TITLES[status] || 'Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${new Date().toISOString()}] ${status} — ${detail}`);
    if (err.stack) console.error(err.stack);
  }

  const body = {
    type,
    title,
    status,
    detail,
    instance: req.originalUrl,
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  res
    .status(status)
    .set('Content-Type', 'application/problem+json')
    .json(body);
};
