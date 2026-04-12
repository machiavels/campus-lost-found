const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');

const ITEM_INCLUDE = {
  reporter:  { select: { id: true, username: true } },
  location:  true,
  category:  true,
  photos:    true,
  _count:    { select: { claimRequests: true, messages: true } },
};

/**
 * GET /api/items
 * Query params: keyword, type (LOST|FOUND), status, categoryId, locationId, from, to, page, limit
 *
 * Visibility rules:
 *   - ADMIN           → any status (filtered by ?status= param)
 *   - Authenticated   → VERIFIED items + their own items (any status)
 *   - Public/anon     → VERIFIED only
 */
exports.listItems = catchAsync(async (req, res) => {
  const {
    keyword, type, status, categoryId, locationId,
    from, to, page = 1, limit = 20,
  } = req.query;

  const where = {};

  if (req.user?.role === 'ADMIN') {
    // Admins can filter by any status; default shows all
    if (status) where.status = status;
  } else if (req.user) {
    // Authenticated non-admin: VERIFIED items + their own items of any status
    where.OR = [
      { status: 'VERIFIED' },
      { reporterId: req.user.id },
    ];
  } else {
    // Unauthenticated public: VERIFIED only
    where.status = 'VERIFIED';
  }

  if (type)       where.reportType = type;
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.locationId = locationId;

  if (keyword) {
    where.OR = [
      ...(where.OR ?? []),
      { name:        { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  if (from || to) {
    where.dateLostFound = {};
    if (from) where.dateLostFound.gte = new Date(from);
    if (to)   where.dateLostFound.lte = new Date(to);
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await prisma.item.count({ where });
  const items = await prisma.item.findMany({
    where,
    include: ITEM_INCLUDE,
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(limit),
  });

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

/**
 * GET /api/items/:id
 *
 * Visibility rules (same as listItems):
 *   - ADMIN           → always visible
 *   - Author          → always visible (own item)
 *   - Everyone else   → VERIFIED only
 */
exports.getItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({
    where:   { id: req.params.id },
    include: ITEM_INCLUDE,
  });

  if (!item) return res.status(404).json({ error: 'Item not found' });

  const isAdmin  = req.user?.role === 'ADMIN';
  const isAuthor = req.user?.id   === item.reporterId;

  if (item.status !== 'VERIFIED' && !isAdmin && !isAuthor) {
    return res.status(404).json({ error: 'Item not found' });
  }

  res.json({ item });
});

/**
 * POST /api/items
 * Body: name, description, reportType, locationId, categoryId, dateLostFound
 * Files: photos[] (multipart)
 */
exports.createItem = catchAsync(async (req, res) => {
  const { name, description, reportType, locationId, categoryId, dateLostFound } = req.body;

  const item = await prisma.item.create({
    data: {
      name, description, reportType, locationId, categoryId,
      dateLostFound: dateLostFound ? new Date(dateLostFound) : null,
      reporterId: req.user.id,
      // photos created in the same transaction
      photos: req.files?.length
        ? { create: req.files.map(f => ({ url: `/uploads/${f.filename}` })) }
        : undefined,
    },
    include: ITEM_INCLUDE,
  });

  res.status(201).json({ item });
});

/**
 * PUT /api/items/:id
 */
exports.updateItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.reporterId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { name, description, locationId, categoryId, dateLostFound } = req.body;
  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data: { name, description, locationId, categoryId,
            dateLostFound: dateLostFound ? new Date(dateLostFound) : undefined,
            status: 'PENDING' }, // back to moderation after edit
    include: ITEM_INCLUDE,
  });
  res.json({ item: updated });
});

/**
 * DELETE /api/items/:id
 */
exports.deleteItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.reporterId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.item.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

/**
 * PATCH /api/items/:id/close  — reporter marks their item as recovered
 */
exports.closeItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.reporterId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data:  { status: 'CLAIMED', claimedById: req.user.id, claimedAt: new Date() },
    include: ITEM_INCLUDE,
  });
  res.json({ item: updated });
});
