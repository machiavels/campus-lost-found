'use strict';

/**
 * Parse and validate pagination query params.
 * @param {object} query    – req.query
 * @param {number} maxLimit – hard cap (default 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, maxLimit = 100) {
  const rawPage  = parseInt(query.page,  10);
  const rawLimit = parseInt(query.limit, 10);

  const page  = Math.max(1, Number.isNaN(rawPage)  ? 1  : rawPage);
  const limit = Math.min(maxLimit, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a standard meta object.
 */
function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { parsePagination, buildMeta };
