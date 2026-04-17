const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');

/**
 * Fields included for everyone
 */
const PUBLIC_INCLUDE = {
  location: true,
  category: true,
  photos:   true,
  reporter: { select: { id: true, username: true } },
};

/**
 * Extra fields visible only to admins
 */
const ADMIN_INCLUDE = {
  ...PUBLIC_INCLUDE,
  _count: { select: { claimRequests: true, messages: true } },
};

/**
 * Strip fields that must not be exposed to regular users.
 */
function sanitizeForPublic(item) {
  // eslint-disable-next-line no-unused-vars
  const { _count, ...rest } = item;
  return rest;
}

/**
 * GET /api/search
 * Query params:
 *   q           – full-text search in name + description (required)
 *   type        – LOST | FOUND
 *   categoryId  – UUID
 *   locationId  – UUID
 *   from        – ISO date (dateLostFound >=)
 *   to          – ISO date (dateLostFound <=)
 *   status      – PENDING | VERIFIED | REJECTED  (admin only)
 *   page        – default 1
 *   limit       – default 20, max 100
 */
exports.searchItems = catchAsync(async (req, res) => {
  const isAdmin = req.user?.role === 'ADMIN';

  const {
    q,
    type,
    categoryId,
    locationId,
    from,
    to,
    status,
    page  = 1,
    limit = 20,
  } = req.query;

  const where = {};

  // ── Status visibility ──────────────────────────────────────────────────
  if (isAdmin && status) {
    where.status = status;
  } else {
    where.status = 'VERIFIED';
  }

  // ── Type filter ──────────────────────────────────────────────────────
  if (type) where.reportType = type;

  // ── Category & location ───────────────────────────────────────────────
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.locationId = locationId;

  // ── Keyword full-text search ───────────────────────────────────────────
  if (q) {
    where.OR = [
      { name:        { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  // ── Date range ──────────────────────────────────────────────────────
  if (from || to) {
    where.dateLostFound = {};
    if (from) where.dateLostFound.gte = new Date(from);
    if (to)   where.dateLostFound.lte = new Date(to);
  }

  // ── Pagination ──────────────────────────────────────────────────────
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip     = (pageNum - 1) * limitNum;

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      include:  isAdmin ? ADMIN_INCLUDE : PUBLIC_INCLUDE,
      orderBy:  { createdAt: 'desc' },
      skip,
      take:     limitNum,
    }),
  ]);

  const results = isAdmin ? items : items.map(sanitizeForPublic);

  res.json({
    results,
    total,
    page:  pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
});
