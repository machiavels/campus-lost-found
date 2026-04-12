const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');

// ── Items ─────────────────────────────────────────────────────────────────────

exports.listPendingItems = catchAsync(async (_req, res) => {
  const items = await prisma.item.findMany({
    where:   { status: 'PENDING' },
    include: { reporter: { select: { id: true, username: true, email: true } }, category: true, location: true, photos: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ items });
});

/**
 * PATCH /api/admin/items/:id/moderate
 * Body: { status: 'VERIFIED' | 'REJECTED', moderationNote?: string }
 */
exports.moderateItem = catchAsync(async (req, res) => {
  const { status, moderationNote } = req.body;

  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    return res.status(422).json({ error: 'status must be VERIFIED or REJECTED' });
  }

  const item = await prisma.item.update({
    where:   { id: req.params.id },
    data:    { status, moderatorId: req.user.id, moderationNote: moderationNote ?? null },
    include: {
      reporter: { select: { id: true, username: true, email: true } },
      category: true,
      location: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId:  item.reporterId,
      type:    status === 'VERIFIED' ? 'ITEM_VERIFIED' : 'ITEM_REJECTED',
      message: status === 'VERIFIED'
        ? `Your item "${item.name}" has been approved and is now publicly visible.`
        : `Your item "${item.name}" was rejected.${
            moderationNote ? ` Reason: ${moderationNote}` : ''
          }`,
      itemId:  item.id,
    },
  });

  res.json({ item });
});

exports.verifyItem = catchAsync(async (req, res) => {
  const { moderationNote } = req.body;
  const item = await prisma.item.update({
    where: { id: req.params.id },
    data:  { status: 'VERIFIED', moderatorId: req.user.id, moderationNote },
    include: { category: true, location: true },
  });
  res.json({ item });
});

exports.rejectItem = catchAsync(async (req, res) => {
  const { moderationNote } = req.body;
  const item = await prisma.item.update({
    where: { id: req.params.id },
    data:  { status: 'REJECTED', moderatorId: req.user.id, moderationNote },
    include: { category: true, location: true },
  });
  res.json({ item });
});

// ── Users ─────────────────────────────────────────────────────────────────────

exports.listUsers = catchAsync(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
});

exports.toggleUserStatus = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data:  { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    select: { id: true, username: true, email: true, role: true, status: true },
  });
  res.json({ user: updated });
});

exports.changeUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (!['STUDENT', 'STAFF', 'ADMIN'].includes(role)) {
    return res.status(422).json({ error: 'Invalid role' });
  }
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data:  { role },
    select: { id: true, username: true, email: true, role: true },
  });
  res.json({ user: updated });
});

// ── Categories ────────────────────────────────────────────────────────────────

/**
 * GET /api/categories          — public (via reference.routes.js)
 * GET /api/admin/categories    — admin alias
 */
exports.listCategories = catchAsync(async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json({ categories });
});

/**
 * POST /api/admin/categories
 * Body: { name: string, description?: string }
 */
exports.createCategory = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(422).json({ error: 'name is required' });
  }
  const cat = await prisma.category.create({ data: { name: name.trim(), description } });
  res.status(201).json({ category: cat });
});

/**
 * PUT /api/admin/categories/:id
 * Body: { name?: string, description?: string }
 */
exports.updateCategory = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  if (name !== undefined && !name.trim()) {
    return res.status(422).json({ error: 'name cannot be empty' });
  }
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  const cat = await prisma.category.update({
    where: { id: req.params.id },
    data:  { name: name ? name.trim() : undefined, description },
  });
  res.json({ category: cat });
});

/**
 * DELETE /api/admin/categories/:id
 */
exports.deleteCategory = catchAsync(async (req, res) => {
  const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ── Locations ─────────────────────────────────────────────────────────────────

/**
 * GET /api/locations           — public (via reference.routes.js)
 * GET /api/admin/locations     — admin alias
 */
exports.listLocations = catchAsync(async (_req, res) => {
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
  res.json({ locations });
});

/**
 * POST /api/admin/locations
 * Body: { name: string, description?: string }
 */
exports.createLocation = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(422).json({ error: 'name is required' });
  }
  const loc = await prisma.location.create({ data: { name: name.trim(), description } });
  res.status(201).json({ location: loc });
});

/**
 * PUT /api/admin/locations/:id
 * Body: { name?: string, description?: string }
 */
exports.updateLocation = catchAsync(async (req, res) => {
  const { name, description } = req.body;
  if (name !== undefined && !name.trim()) {
    return res.status(422).json({ error: 'name cannot be empty' });
  }
  const existing = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Location not found' });
  const loc = await prisma.location.update({
    where: { id: req.params.id },
    data:  { name: name ? name.trim() : undefined, description },
  });
  res.json({ location: loc });
});

/**
 * DELETE /api/admin/locations/:id
 */
exports.deleteLocation = catchAsync(async (req, res) => {
  const existing = await prisma.location.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Location not found' });
  await prisma.location.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
