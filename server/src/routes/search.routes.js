const router     = require('express').Router();
const ctrl       = require('../controllers/search.controller');
const { optionalAuth } = require('../middleware/optionalAuth.middleware');
const validate   = require('../middleware/validate.middleware');
const { searchQuerySchema } = require('../middleware/validators/search.validator');

/**
 * @openapi
 * tags:
 *   - name: Search
 *     description: Full-text search across items
 */

/**
 * @openapi
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Search items (public, auth optional for enriched results)
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Free-text keyword search
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [LOST, FOUND] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: locationId
 *         schema: { type: integer }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Filter items created after this date
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: Filter items created before this date
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACTIVE, CLAIMED, REJECTED] }
 *         description: Admins only
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Item' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get(
  '/',
  optionalAuth,
  validate(searchQuerySchema, 'query'),
  ctrl.searchItems,
);

module.exports = router;
