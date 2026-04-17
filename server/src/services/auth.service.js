const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Joi    = require('joi');

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

// ── JWT helpers ───────────────────────────────────────────────────────────────
exports.signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
