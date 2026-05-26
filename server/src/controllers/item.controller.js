const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const {
  buildItemWhere,
  findItems,
  parsePagination,
  ITEM_INCLUDE_FULL,
} = require('../services/item.service');

// ── List items ────────────────────────────────────────────────────────────────
exports.listItems = catchAsync(async (req, res) => {
  const pagination = parsePagination(req.query);
  const where      = buildItemWhere(req.query, req.user);
  const { items, meta } = await findItems(where, pagination, ITEM_INCLUDE_FULL);
  res.json({ items, meta });
});

// ── Get one item ──────────────────────────────────────────────────────────────
exports.getItem = catchAsync(async (req, res) => {
  const item = await prisma.item.findUnique({
    where:   { id: req.params.id },
    include: ITEM_INCLUDE_FULL,
  });
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json({ item });
});

// ── Create item ───────────────────────────────────────────────────────────────
exports.createItem = catchAsync(async (req, res) => {
  const { name, description, reportType, categoryId, locationId, dateLostFound } = req.body;
  const item = await prisma.item.create({
    data: {
      name,
      description,
      reportType,
      categoryId:    categoryId    || null,
      locationId:    locationId    || null,
      dateLostFound: dateLostFound ? new Date(dateLostFound) : null,
      reporterId:    req.user.id,
      status:        req.user.role === 'ADMIN' ? 'VERIFIED' : 'PENDING',
    },
    include: ITEM_INCLUDE_FULL,
  });
  res.status(201).json({ item });
});

// ── Update item ───────────────────────────────────────────────────────────────
exports.updateItem = catchAsync(async (req, res) => {
  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin && existing.reporterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { name, description, reportType, categoryId, locationId, dateLostFound } = req.body;
  const item = await prisma.item.update({
    where: { id: req.params.id },
    data: {
      name,
      description,
      reportType,
      categoryId:    categoryId    || null,
      locationId:    locationId    || null,
      dateLostFound: dateLostFound ? new Date(dateLostFound) : null,
      status:        isAdmin ? existing.status : 'PENDING',
    },
    include: ITEM_INCLUDE_FULL,
  });
  res.json({ item });
});

// ── Delete item ───────────────────────────────────────────────────────────────
exports.deleteItem = catchAsync(async (req, res) => {
  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin && existing.reporterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.item.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ── Close item ────────────────────────────────────────────────────────────────
// PATCH /api/items/:id/close — marks the item as CLAIMED (owner only)
exports.closeItem = catchAsync(async (req, res) => {
  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin && existing.reporterId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const item = await prisma.item.update({
    where: { id: req.params.id },
    data:  { status: 'CLAIMED' },
    include: ITEM_INCLUDE_FULL,
  });
  res.json({ item });
});
