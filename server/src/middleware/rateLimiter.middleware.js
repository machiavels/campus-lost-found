const rateLimit = require('express-rate-limit');

const IS_TEST = process.env.NODE_ENV === 'test';

/**
 * Réponse JSON standardisée pour les 429.
 */
const rateLimitHandler = (req, res) => {
  const retryAfter = Math.ceil(
    req.rateLimit.resetTime
      ? (req.rateLimit.resetTime - Date.now()) / 1000
      : 60
  );
  res.status(429).json({
    error:      'Too Many Requests',
    message:    'Trop de requêtes, veuillez réessayer plus tard.',
    retryAfter,
  });
};

/**
 * Limiteur global — protège toute l'API contre les abus massifs.
 * Skip automatique en NODE_ENV=test pour ne pas polluer les suites de tests.
 */
exports.globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             IS_TEST ? 0 : (parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10) || 200),
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => IS_TEST,
  handler:         rateLimitHandler,
});

/**
 * Limiteur auth — protège /api/auth contre le brute-force.
 * Skip automatique en NODE_ENV=test.
 */
exports.authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             IS_TEST ? 0 : (parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 20),
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => IS_TEST,
  handler:         rateLimitHandler,
});
