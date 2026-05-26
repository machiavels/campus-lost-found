const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const {
  buildItemWhere,
  findItems,
  parsePagination,
  ITEM_INCLUDE_FULL,
} = require('../services/item.service');

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
  const pagination = parsePagination(req.query);
  const where      = buildItemWhere(req.query, req.user);

  const { items, meta } = await findItems(where, pagination, ITEM_INCLUDE_FULL);

  res.json({ items, meta });
});

/**
 * GET /api/items/:id
 */
exports.getItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({
    where:   { id: req.params.id },
    include: ITEM_INCLUDE_FULL,
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
 */
exports.createItem = catchAsync(async (req, res) => {
  const { name, description, reportType, locationId, categoryId, dateLostFound } = req.body;

  const item = await prisma.item.create({
    data: {
      name, description, reportType, locationId, categoryId,
      dateLostFound: dateLostFound ? new Date(dateLostFound) : null,
      reporterId: req.user.id,
      photos: req.files?.length
        ? { create: req.files.map(f => ({ url: `/uploads/${f.filename}` })) }
        : undefined,
    },
    include: ITEM_INCLUDE_FULL,
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
            status: 'PENDING' },
    include: ITEM_INCLUDE_FULL,
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
 * PATCH /api/items/:id/close
 */
exports.closeItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.reporterId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.item.update({
    where: { id: req.params.id },
    data:  { status: 'CLAIMED', claimedById: req.user.id, claimedAt: new Date() },
    include: ITEM_INCLUDE_FULL,
  });
  res.json({ item: updated });
});
