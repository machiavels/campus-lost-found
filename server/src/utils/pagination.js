'use strict';

/**
 * Parse and validate pagination query params.
 * @param {object} query  – req.query
 * @param {number} maxLimit – hard cap (default 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, maxLimit = 100) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
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
