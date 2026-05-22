/**
 * Public reference routes — no authentication required
 * GET /api/categories   → list all categories
 * GET /api/locations    → list all locations
 */
const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');

/**
 * @openapi
 * tags:
 *   - name: Reference
 *     description: Public reference data — categories and locations
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Reference]
 *     summary: List all categories (public)
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Category' }
 */
router.get('/categories', ctrl.listCategories);

/**
 * @openapi
 * /locations:
 *   get:
 *     tags: [Reference]
 *     summary: List all locations (public)
 *     responses:
 *       200:
 *         description: List of locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Location' }
 */
router.get('/locations',  ctrl.listLocations);

module.exports = router;
