const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { parsePagination, buildMeta } = require('../utils/pagination');

const PUBLIC_INCLUDE = {
  location: true,
  category: true,
  photos:   true,
  reporter: { select: { id: true, username: true } },
};

const ADMIN_INCLUDE = {
  ...PUBLIC_INCLUDE,
  _count: { select: { claimRequests: true, messages: true } },
};

function sanitizeForPublic(item) {
  // eslint-disable-next-line no-unused-vars
  const { _count, ...rest } = item;
  return rest;
}

/**
 * GET /api/search
 * Query params: q, type, categoryId, locationId, from, to, status (admin), page, limit
 */
exports.searchItems = catchAsync(async (req, res) => {
  const isAdmin = req.user?.role === 'ADMIN';

  const { q, type, categoryId, locationId, from, to, status } = req.query;

  const { page, limit, skip } = parsePagination(req.query);

  const where = {};

  if (isAdmin && status) {
    where.status = status;
  } else {
    where.status = 'VERIFIED';
  }

  if (type)       where.reportType = type;
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.locationId = locationId;

  if (q) {
    where.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (from || to) {
    where.dateLostFound = {};
    if (from) where.dateLostFound.gte = new Date(from);
    if (to)   where.dateLostFound.lte = new Date(to);
  }

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      include:  isAdmin ? ADMIN_INCLUDE : PUBLIC_INCLUDE,
      orderBy:  { createdAt: 'desc' },
      skip,
      take:     limit,
    }),
  ]);

  const results = isAdmin ? items : items.map(sanitizeForPublic);

  res.json({ results, meta: buildMeta(total, page, limit) });
});
