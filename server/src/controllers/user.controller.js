const prisma  = require('../config/prisma');
const bcrypt  = require('bcryptjs');
const { catchAsync } = require('../middleware/error.middleware');

// Fields returned for the authenticated user's own profile
const ME_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  status: true,
  avatar: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
};

// Fields returned for a public user profile (no email, no sensitive data)
const PUBLIC_SELECT = {
  id: true,
  username: true,
  role: true,
  avatar: true,
  bio: true,
  createdAt: true,
};

/**
 * GET /api/users/me
 * Returns the full profile of the authenticated user.
 */
exports.getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: ME_SELECT,
  });
  res.json({ user });
});

/**
 * PUT /api/users/me
 * Update own profile: username, avatar, bio.
 * Validated upstream by updateMeSchema.
 */
exports.updateMe = catchAsync(async (req, res) => {
  const { username, avatar, bio } = req.body;

  // Check username uniqueness if being changed
  if (username && username !== req.user.username) {
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: req.user.id } },
    });
    if (taken) return res.status(409).json({ error: 'Username already taken' });
  }

  const data = {};
  if (username !== undefined) data.username = username;
  if (avatar   !== undefined) data.avatar   = avatar || null;
  if (bio      !== undefined) data.bio      = bio    || null;

  const updated = await prisma.user.update({
    where:  { id: req.user.id },
    data,
    select: ME_SELECT,
  });

  res.json({ user: updated });
});

/**
 * PATCH /api/users/me/password
 * Change own password. Requires current password verification.
 * Validated upstream by changePasswordSchema.
 */
exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch the full user (need passwordHash)
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user.id },
    data:  { passwordHash },
  });

  // Revoke all refresh tokens so active sessions are invalidated
  await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

  res.json({ message: 'Mot de passe mis à jour avec succès' });
});

/**
 * DELETE /api/users/me
 * RGPD — anonymise the user account:
 *   - Clears PII: username → anonymised, email → anonymised, avatar/bio → null
 *   - Sets status to INACTIVE
 *   - Revokes all refresh tokens
 * Hard delete is NOT performed to preserve referential integrity
 * (items, messages, claims reference the user id).
 */
exports.deleteMe = catchAsync(async (req, res) => {
  const anonymisedId = req.user.id.slice(0, 8);

  await prisma.$transaction([
    // Anonymise PII
    prisma.user.update({
      where: { id: req.user.id },
      data: {
        username:     `deleted_${anonymisedId}`,
        email:        `deleted_${anonymisedId}@deleted.invalid`,
        passwordHash: '',
        avatar:       null,
        bio:          null,
        status:       'INACTIVE',
      },
    }),
    // Revoke all sessions
    prisma.refreshToken.deleteMany({ where: { userId: req.user.id } }),
    // Remove personal notifications
    prisma.notification.deleteMany({ where: { userId: req.user.id } }),
  ]);

  res.status(204).send();
});

/**
 * GET /api/users/:id
 * Public profile of any user — no email, no passwordHash.
 */
exports.getPublicProfile = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.params.id },
    select: PUBLIC_SELECT,
  });

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.status === 'INACTIVE') return res.status(404).json({ error: 'Utilisateur introuvable' });

  res.json({ user });
});

// Keep backward-compat aliases used by old routes (profile → me)
exports.getProfile    = exports.getMe;
exports.updateProfile = exports.updateMe;
