const prisma  = require('../config/prisma');
const bcrypt  = require('bcryptjs');
const { catchAsync } = require('../middleware/error.middleware');

// Fields returned for the authenticated user's own profile
const ME_SELECT = {
  id: true, username: true, email: true, role: true,
  status: true, bio: true, avatarUrl: true,
  createdAt: true, updatedAt: true,
};

// Fields returned for a public profile
const PUBLIC_SELECT = {
  id: true, username: true, bio: true, avatarUrl: true, createdAt: true,
};

exports.getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }, select: ME_SELECT,
  });
  res.json({ user });
});

exports.updateMe = catchAsync(async (req, res) => {
  const allowed  = ['username', 'bio', 'avatarUrl'];
  const data     = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) { data[key] = req.body[key]; }
  }

  if (data.username !== undefined) {
    if (typeof data.username !== 'string') { return res.status(400).json({ error: 'username must be a string' }); }
    if (data.username.length < 3)          { return res.status(400).json({ error: 'username must be at least 3 characters' }); }
    if (data.username.length > 30)         { return res.status(400).json({ error: 'username must be at most 30 characters' }); }
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id }, data, select: ME_SELECT,
  });
  res.json({ user: updated });
});

exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: hash } });
  res.status(204).send();
});

exports.deleteMe = catchAsync(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data:  {
      email:        `deleted_${req.user.id}@deleted.invalid`,
      username:     `deleted_${req.user.id.slice(0, 8)}`,
      passwordHash: '',
      bio:          null,
      avatarUrl:    null,
      status:       'INACTIVE',
    },
  });
  res.status(204).send();
});

exports.getPublicProfile = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }, select: PUBLIC_SELECT,
  });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// ── Admin-scoped helpers ──────────────────────────────────────────────────────

exports.listUsers = catchAsync(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
});

exports.banUser = catchAsync(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data:  { status: 'INACTIVE' },
    select: { id: true, username: true, status: true },
  });
  res.json({ user });
});

exports.unbanUser = catchAsync(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data:  { status: 'ACTIVE' },
    select: { id: true, username: true, status: true },
  });
  res.json({ user });
});
