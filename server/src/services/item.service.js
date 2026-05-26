const prisma = require('../config/prisma');
const { parsePagination, buildMeta } = require('../utils/pagination');

// ── Shared include presets ────────────────────────────────────────────────────

/** Full include used by authenticated / admin responses (item routes). */
const ITEM_INCLUDE_FULL = {
  reporter: { select: { id: true, username: true } },
  location: true,
  category: true,
  photos:   true,
  _count:   { select: { claimRequests: true, messages: true } },
};

/** Public include: same as full but without _count (search route). */
const ITEM_INCLUDE_PUBLIC = {
  reporter: { select: { id: true, username: true } },
  location: true,
  category: true,
  photos:   true,
};

exports.ITEM_INCLUDE_FULL   = ITEM_INCLUDE_FULL;
exports.ITEM_INCLUDE_PUBLIC = ITEM_INCLUDE_PUBLIC;

// ── buildItemWhere ────────────────────────────────────────────────────────────

/**
 * Build the Prisma `where` clause for item listings and searches.
 *
 * Visibility rules (applied automatically when `user` is provided):
 *   ADMIN         → any status (caller may further filter with `status`)
 *   Authenticated → VERIFIED items + own items (any status)
 *   Anonymous     → VERIFIED only
 *
 * @param {object} filters
 * @param {string} [filters.keyword]    - full-text search on name / description
 * @param {string} [filters.q]          - alias for keyword (search route uses ?q=)
 * @param {string} [filters.type]       - LOST | FOUND
 * @param {string} [filters.status]     - admin-only status filter
 * @param {string} [filters.categoryId]
 * @param {string} [filters.locationId]
 * @param {string} [filters.from]       - ISO date, lower bound on dateLostFound
 * @param {string} [filters.to]         - ISO date, upper bound on dateLostFound
 * @param {object} [user]               - req.user (may be undefined for anon)
 * @returns {object} Prisma where object
 */
exports.buildItemWhere = (filters = {}, user) => {
  const {
    keyword, q, type, status,
    categoryId, locationId, from, to,
  } = filters;

  const searchTerm = keyword || q;
  const where = {};

  // ── Visibility ────────────────────────────────────────────────────────────
  if (user?.role === 'ADMIN') {
    if (status) where.status = status;
  } else if (user) {
    where.OR = [
      { status: 'VERIFIED' },
      { reporterId: user.id },
    ];
  } else {
    where.status = 'VERIFIED';
  }

  // ── Scalar filters ────────────────────────────────────────────────────────
  if (type)       where.reportType = type;
  if (categoryId) where.categoryId = categoryId;
  if (locationId) where.locationId = locationId;

  // ── Full-text search ──────────────────────────────────────────────────────
  if (searchTerm) {
    const textFilter = [
      { name:        { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
    ];
    // Merge with existing OR (visibility) if present
    where.OR = [...(where.OR ?? []), ...textFilter];
  }

  // ── Date range ────────────────────────────────────────────────────────────
  if (from || to) {
    where.dateLostFound = {};
    if (from) where.dateLostFound.gte = new Date(from);
    if (to)   where.dateLostFound.lte = new Date(to);
  }

  return where;
};

// ── findItems ─────────────────────────────────────────────────────────────────

/**
 * Execute a paginated Prisma query for items.
 *
 * @param {object} where       - Prisma where clause (from buildItemWhere)
 * @param {object} pagination  - { page, limit, skip } from parsePagination
 * @param {object} include     - Prisma include preset
 * @returns {{ items: object[], meta: object }}
 */
exports.findItems = async (where, pagination, include) => {
  const { page, limit, skip } = pagination;

  const [total, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
};

// ── parsePagination re-export (convenience) ───────────────────────────────────
exports.parsePagination = parsePagination;
