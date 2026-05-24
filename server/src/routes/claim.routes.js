const router = require('express').Router();
const ctrl   = require('../controllers/claim.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Claims
 *     description: Claim requests — submit, list, review (admin)
 */

/**
 * @openapi
 * /claims:
 *   post:
 *     tags: [Claims]
 *     summary: Submit a claim request on an item
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, message]
 *             properties:
 *               itemId:  { type: string, format: uuid }
 *               message: { type: string, example: 'I lost this on Monday near building A' }
 *     responses:
 *       201:
 *         description: Claim submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 claim: { $ref: '#/components/schemas/Claim' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/',                 ctrl.submitClaim);

/**
 * @openapi
 * /claims:
 *   get:
 *     tags: [Claims]
 *     summary: List claims (admin sees all, user sees own)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of claims
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Claim' }
 */
router.get('/',                  ctrl.listClaims);

/**
 * @openapi
 * /claims/my:
 *   get:
 *     tags: [Claims]
 *     summary: Get own claims
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user's claims
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Claim' }
 */
router.get('/my',                ctrl.myClaims);

/**
 * @openapi
 * /claims/{id}/review:
 *   patch:
 *     tags: [Claims]
 *     summary: Review a claim — approve or reject (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: Claim reviewed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 claim: { $ref: '#/components/schemas/Claim' }
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id/review',      requireRole('ADMIN'), ctrl.reviewClaim);

// Legacy routes kept for compatibility
router.patch('/:id/approve',     requireRole('ADMIN'), ctrl.approveClaim);
router.patch('/:id/reject',      requireRole('ADMIN'), ctrl.rejectClaim);

module.exports = router;
