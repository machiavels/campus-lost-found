const { catchAsync } = require('../middleware/error.middleware');
const authService    = require('../services/auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

/** POST /api/auth/register */
exports.register = catchAsync(async (req, res) => {
  const user  = await authService.register(req.body);
  const token = authService.generateAccessToken(user);
  res.status(201).json({ user, token });
});

/** POST /api/auth/login */
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const prisma = require('../config/prisma');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
  if (user.status === 'INACTIVE') return res.status(403).json({ error: 'Compte d\u00e9sactiv\u00e9' });

  const valid = await authService.verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

  const accessToken  = authService.generateAccessToken(user);
  const refreshToken = await authService.generateRefreshToken(user.id);

  // Cookie pour les clients web
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  const { passwordHash: _, ...safeUser } = user;
  // refreshToken aussi dans le body pour les clients mobiles (pas de cookie auto)
  res.json({ user: safeUser, token: accessToken, accessToken, refreshToken });
});

/** POST /api/auth/refresh
 * Accepte le refresh token depuis le cookie (web) OU depuis le body/header (mobile)
 */
exports.refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken
             || req.body?.refreshToken
             || req.headers['x-refresh-token'];

  if (!token) return res.status(401).json({ error: 'Refresh token manquant' });

  const { accessToken, refreshToken } = await authService.rotateRefreshToken(token);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken, refreshToken });
});

/** POST /api/auth/logout */
exports.logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken
             || req.body?.refreshToken
             || req.headers['x-refresh-token'];
  if (token) await authService.revokeRefreshToken(token);
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
  res.status(204).send();
});

/** GET /api/auth/me */
exports.me = catchAsync(async (req, res) => {
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});
