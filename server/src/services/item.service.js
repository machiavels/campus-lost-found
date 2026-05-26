const prisma = require('../config/prisma');
const { parsePagination, buildMeta } = require('../utils/pagination');

// ── Shared include presets ────────────────────────────────────────────────────

/**
 * Full include: used for authenticated/admin responses.
 * Includes reporter info, category, location, photos, and counts.
 */
exports.ITEM_INCLUDE_FULL = {
  reporter: { select: { id: true, username: true, email: true } },
  category: true,
  location: true,
  photos:   true,
  _count:   { select: { claimRequests: true } },
};

/**
 * Public include: strips sensitive fields for unauthenticated responses.
 */
exports.ITEM_INCLUDE_PUBLIC = {
  category: true,
  location: true,
  photos:   true,
};

// ── Pagination helper (re-exported from pagination utils) ─────────────────────
exports.parsePagination = parsePagination;
exports.buildMeta       = buildMeta;

// ── Where-clause builder ──────────────────────────────────────────────────────

/**
 * Builds a Prisma `where` clause from query-string parameters.
 *
 * Supported params:
 *   keyword / q  — full-text search on name + description
 *   type         — LOST | FOUND
 *   categoryId   — UUID
 *   locationId   — UUID
 *   from / to    — ISO date range for dateLostFound
 *   status       — admin only: PENDING | VERIFIED | REJECTED
 *
 * @param {object} query  — req.query
 * @param {object} user   — req.user (may be undefined for public requests)
 * @returns {object}      Prisma where clause
 */
exports.buildItemWhere = function buildItemWhere(query, user) {
  const isAdmin = user?.role === 'ADMIN';

  // Default visibility: only show VERIFIED items to the public
  const where = {
    status: isAdmin ? undefined : 'VERIFIED',
  };

  // Allow admin to filter by status explicitly
  if (isAdmin && query.status) {
    where.status = query.status;
  }

  // Keyword search (supports both ?keyword= and ?q= aliases)
  const keyword = query.keyword || query.q;
  if (keyword) {
    where.OR = [
      { name:        { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  if (query.type) {
    where.reportType = query.type;
  }
  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }
  if (query.locationId) {
    where.locationId = query.locationId;
  }

  // Date range
  if (query.from || query.to) {
    where.dateLostFound = {};
    if (query.from) {
      where.dateLostFound.gte = new Date(query.from);
    }
    if (query.to) {
      where.dateLostFound.lte = new Date(query.to);
    }
  }

  return where;
};

// ── Query runner ──────────────────────────────────────────────────────────────

/**
 * Fetches items with pagination and include.
 *
 * @param {object} where      — Prisma where clause
 * @param {object} pagination — { page, limit, skip }
 * @param {object} include    — Prisma include clause
 * @returns {{ items: object[], meta: object }}
 */
exports.findItems = async function findItems(where, pagination, include) {
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
