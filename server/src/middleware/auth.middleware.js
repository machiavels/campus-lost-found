const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * authenticate — vérifie le JWT Bearer et attache req.user
 * Le payload JWT doit contenir { sub: userId, role }
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user || user.status === 'INACTIVE') {
    return res.status(401).json({ error: 'User not found or inactive' });
  }

  req.user = user;
  next();
}

/**
 * requireRole — middleware factory: vérifie que req.user possède l'un des rôles autorisés
 * @param {...string} roles - rôles autorisés (e.g. 'ADMIN', 'STAFF')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * requireOwnerOrAdmin — vérifie que req.user est le propriétaire de la ressource ou un admin
 * @param {Function} getOwnerId - function(req) => ownerId string
 */
function requireOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const ownerId = await getOwnerId(req);
    if (req.user.id !== ownerId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requireOwnerOrAdmin };
