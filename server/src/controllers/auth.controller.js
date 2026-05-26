const { catchAsync } = require('../middleware/error.middleware');
const authService    = require('../services/auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 jours en ms
};

/**
 * POST /api/auth/register
 * Inscription avec email institutionnel + mot de passe
 */
exports.register = catchAsync(async (req, res) => {
  const user  = await authService.register(req.body);
  const token = authService.generateAccessToken(user);
  res.status(201).json({ user, token });
});

/**
 * POST /api/auth/login
 * Authentification par email + mot de passe
 * Retourne un access token (15min) + pose un refresh token en cookie HttpOnly
 */
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const prisma = require('../config/prisma');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  if (user.status === 'INACTIVE') {
    return res.status(403).json({ error: 'Compte désactivé' });
  }

  const valid = await authService.verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const accessToken  = authService.generateAccessToken(user);
  const refreshToken = await authService.generateRefreshToken(user.id);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  const { passwordHash: _, ...safeUser } = user;
  // token conservé pour la rétro-compatibilité des tests existants
  res.json({ user: safeUser, token: accessToken, accessToken });
});

/**
 * POST /api/auth/refresh
 * Échange un refresh token valide contre un nouvel access token + refresh token rotatif
 */
exports.refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'Refresh token manquant' });
  }

  const { accessToken, refreshToken } = await authService.rotateRefreshToken(token);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken });
});

/**
 * POST /api/auth/logout
 * Invalide le refresh token en base et vide le cookie
 */
exports.logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) await authService.revokeRefreshToken(token);

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
  res.status(204).send();
});

/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur authentifié (sans le hash)
 */
exports.me = catchAsync(async (req, res) => {
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});
