const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * optionalAuth — tries to authenticate the request but never blocks it.
 * If a valid Bearer token is present, attaches req.user (just like authenticate()).
 * If the token is missing, invalid, or expired, req.user stays undefined and
 * the request continues unauthenticated.
 *
 * Use this on public endpoints that need context-aware responses
 * (e.g. admins see more fields, guests see only public data).
 */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(); // no token — continue as guest
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (user && user.status !== 'INACTIVE') {
      req.user = user;
    }
  } catch {
    // invalid / expired token — treat as unauthenticated, don't block
  }

  next();
}

module.exports = { optionalAuth };
