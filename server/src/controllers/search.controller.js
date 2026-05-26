const { catchAsync } = require('../middleware/error.middleware');
const {
  buildItemWhere,
  findItems,
  parsePagination,
  ITEM_INCLUDE_FULL,
  ITEM_INCLUDE_PUBLIC,
} = require('../services/item.service');

/**
 * GET /api/search
 * Query params: q, type, categoryId, locationId, from, to, status (admin), page, limit
 */
exports.searchItems = catchAsync(async (req, res) => {
  const isAdmin    = req.user?.role === 'ADMIN';
  const pagination = parsePagination(req.query);

  // Remap ?q= to ?keyword= so buildItemWhere handles both aliases
  const where = buildItemWhere(req.query, req.user);

  const include = isAdmin ? ITEM_INCLUDE_FULL : ITEM_INCLUDE_PUBLIC;
  const { items, meta } = await findItems(where, pagination, include);

  // Strip _count from public results
  const results = isAdmin
    ? items
    : items.map(({ _count, ...rest }) => rest); // eslint-disable-line no-unused-vars

  res.json({ results, meta });
});
