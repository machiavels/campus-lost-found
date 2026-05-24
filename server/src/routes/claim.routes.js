const express = require('express');
const router  = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  submitClaim,
  getClaims,
  getMyClaims,
  reviewClaim,
} = require('../controllers/claim.controller');

/**
 * @openapi
 * tags:
 *   name: Claims
 *   description: Demandes de réclamation d'objets
 */

/**
 * @openapi
 * /claims:
 *   post:
 *     tags: [Claims]
 *     summary: Soumettre une réclamation
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, description]
 *             properties:
 *               itemId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *                 example: "C'est mon portefeuille, il contient ma carte étudiante n°12345"
 *     responses:
 *       201:
 *         description: Réclamation soumise
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 claim:
 *                   $ref: '#/components/schemas/Claim'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       409:
 *         description: Réclamation déjà existante sur cet item
 *   get:
 *     tags: [Claims]
 *     summary: Liste des réclamations
 *     description: Admin — toutes les réclamations. Utilisateur — uniquement les siennes.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste retournée
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Claim'
 *       401:
 *         description: Non authentifié
 */
router.post('/', authenticate, submitClaim);
router.get('/',  authenticate, getClaims);

/**
 * @openapi
 * /claims/my:
 *   get:
 *     tags: [Claims]
 *     summary: Mes réclamations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Réclamations de l'utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Claim'
 *       401:
 *         description: Non authentifié
 */
router.get('/my', authenticate, getMyClaims);

/**
 * @openapi
 * /claims/{id}/review:
 *   patch:
 *     tags: [Claims]
 *     summary: Approuver ou rejeter une réclamation (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *               note:
 *                 type: string
 *                 description: Note facultative de modération
 *     responses:
 *       200:
 *         description: Décision enregistrée, notification envoyée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Réclamation introuvable
 */
router.patch('/:id/review', authenticate, requireAdmin, reviewClaim);

module.exports = router;
