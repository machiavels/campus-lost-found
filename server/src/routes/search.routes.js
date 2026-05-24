const express = require('express');
const router  = express.Router();
const { optionalAuth } = require('../middleware/auth.middleware');
const { search } = require('../controllers/search.controller');

/**
 * @openapi
 * tags:
 *   name: Search
 *   description: Recherche multi-critères d'annonces
 */

/**
 * @openapi
 * /search:
 *   get:
 *     tags: [Search]
 *     summary: Recherche avancée
 *     description: Recherche full-text dans les titres et descriptions, avec filtres cumulatifs.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *         example: portefeuille
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOST, FOUND]
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-12-31"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Résultats paginés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', optionalAuth, search);

module.exports = router;
