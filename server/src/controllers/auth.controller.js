const prisma      = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const authService = require('../services/auth.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 * Body: { username, email, password, role? }
 */
exports.register = catchAsync(async (req, res) => {
  const { username, email, password, role } = req.body;

  const { user, accessToken, refreshToken } = await authService.register({
    username,
    email,
    password,
    role,
  });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.status(201).json({
    user: {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
    },
    accessToken,
  });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.login(email, password);

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.json({
    user: {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
    },
    accessToken,
  });
});

/**
 * POST /api/auth/refresh
 * Lit le cookie refreshToken, retourne un nouvel accessToken
 */
exports.refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;

  const { accessToken, refreshToken: newRefresh } = await authService.rotateRefreshToken(token);

  res.cookie('refreshToken', newRefresh, COOKIE_OPTIONS);
  res.json({ accessToken });
});

/**
 * POST /api/auth/logout
 * Invalide le refresh token en base et vide le cookie
 */
exports.logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await authService.revokeRefreshToken(token);
  }

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict' });
  res.status(204).send();
});

/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur connecté
 */
exports.me = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
  res.json({ user });
});
