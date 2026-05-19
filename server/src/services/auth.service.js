const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const Joi     = require('joi');
const prisma  = require('../config/prisma');

// ── Campus email domain whitelist (from .env) ─────────────────────────────────
const getAllowedDomains = () =>
  (process.env.ALLOWED_EMAIL_DOMAINS || 'eleve.isep.fr,isep.fr')
    .split(',')
    .map(d => d.trim());

// ── Joi validation schemas ────────────────────────────────────────────────────

exports.registerSchema = Joi.object({
  username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required().messages({
    'string.pattern.base': "Le nom d'utilisateur ne doit contenir que des lettres, chiffres ou underscores",
    'string.min':          "Le nom d'utilisateur doit comporter au moins 3 caractères",
    'string.max':          "Le nom d'utilisateur ne peut pas dépasser 30 caractères",
    'any.required':        "Le nom d'utilisateur est requis",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .custom((value, helpers) => {
      const domain = value.split('@')[1];
      if (!getAllowedDomains().includes(domain)) {
        return helpers.error('email.domain');
      }
      return value;
    })
    .messages({
      'string.email':  'Adresse e-mail invalide',
      'any.required':  "L'adresse e-mail est requise",
      'email.domain':  `Seuls les emails institutionnels sont acceptés (${getAllowedDomains().join(', ')})`,
    }),
  password: Joi.string().min(8).required().messages({
    'string.min':   'Le mot de passe doit comporter au moins 8 caractères',
    'any.required': 'Le mot de passe est requis',
  }),
});

exports.loginSchema = Joi.object({
  email:    Joi.string().email({ tlds: { allow: false } }).required().messages({
    'string.email':  'Adresse e-mail invalide',
    'any.required':  "L'adresse e-mail est requise",
  }),
  password: Joi.string().required().messages({
    'any.required': 'Le mot de passe est requis',
  }),
});

// ── Campus email domain validator (used in controller) ───────────────────────
exports.validateEmailDomain = (email) => {
  const allowed = getAllowedDomains();
  const domain  = email.split('@')[1];
  if (!allowed.includes(domain)) {
    const err = new Error(`Seuls les emails campus sont autorisés (${allowed.join(', ')})`);
    err.statusCode = 403;
    throw err;
  }
};

// ── Password helpers ──────────────────────────────────────────────────────────
exports.hashPassword   = (plain) => bcrypt.hash(plain, 12);
exports.verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// ── JWT — Access token (15 min) ───────────────────────────────────────────────
exports.signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

exports.generateAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

// ── Refresh token (7 days, stored in DB) ─────────────────────────────────────
const REFRESH_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10);

exports.generateRefreshToken = async (userId) => {
  const token     = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
};

exports.rotateRefreshToken = async (oldToken) => {
  const existing = await prisma.refreshToken.findUnique({
    where:   { token: oldToken },
    include: { user: true },
  });

  if (!existing) {
    const err = new Error('Refresh token invalide');
    err.statusCode = 401;
    throw err;
  }
  if (existing.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token: oldToken } });
    const err = new Error('Refresh token expiré, veuillez vous reconnecter');
    err.statusCode = 401;
    throw err;
  }

  // Rotation : supprimer l'ancien, émettre un nouveau
  await prisma.refreshToken.delete({ where: { token: oldToken } });

  const newRefreshToken = await exports.generateRefreshToken(existing.userId);
  const newAccessToken  = exports.generateAccessToken(existing.user);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

exports.revokeRefreshToken = async (token) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};
