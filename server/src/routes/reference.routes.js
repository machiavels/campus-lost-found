const express = require('express');
const router  = express.Router();
const { getCategories } = require('../controllers/admin.category.controller');
const { getLocations }  = require('../controllers/admin.location.controller');

/**
 * @openapi
 * tags:
 *   name: Reference
 *   description: Référentiels publics (catégories, lieux)
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Reference]
 *     summary: Liste publique des catégories
 *     responses:
 *       200:
 *         description: Catégories disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.get('/categories', getCategories);

/**
 * @openapi
 * /locations:
 *   get:
 *     tags: [Reference]
 *     summary: Liste publique des lieux
 *     responses:
 *       200:
 *         description: Lieux disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Location'
 */
router.get('/locations', getLocations);

module.exports = router;
