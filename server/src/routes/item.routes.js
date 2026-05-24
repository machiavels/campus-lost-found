const express = require('express');
const router  = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  closeItem,
} = require('../controllers/item.controller');

/**
 * @openapi
 * tags:
 *   name: Items
 *   description: Annonces d'objets perdus et trouvés
 */

/**
 * @openapi
 * /items:
 *   get:
 *     tags: [Items]
 *     summary: Liste des annonces
 *     description: Retourne une liste paginée d'annonces avec filtres optionnels.
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOST, FOUND]
 *         description: Filtrer par type
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filtrer par catégorie
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filtrer par lieu
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, RESOLVED, PENDING]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Recherche par mot-clé
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
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Liste paginée
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
 *   post:
 *     tags: [Items]
 *     summary: Créer une annonce
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, categoryId, locationId, date]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Sac à dos bleu
 *               description:
 *                 type: string
 *                 example: Trouvé près de la bibliothèque
 *               type:
 *                 type: string
 *                 enum: [LOST, FOUND]
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               locationId:
 *                 type: integer
 *                 example: 3
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-20"
 *     responses:
 *       201:
 *         description: Annonce créée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
router.get('/',    optionalAuth, getItems);
router.post('/',   authenticate, createItem);

/**
 * @openapi
 * /items/{id}:
 *   get:
 *     tags: [Items]
 *     summary: Détail d'une annonce
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Annonce trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item:
 *                   $ref: '#/components/schemas/Item'
 *       404:
 *         description: Annonce introuvable
 *   put:
 *     tags: [Items]
 *     summary: Modifier une annonce
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               locationId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Annonce mise à jour
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Annonce introuvable
 *   delete:
 *     tags: [Items]
 *     summary: Supprimer une annonce
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Annonce supprimée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Annonce introuvable
 */
router.get('/:id',    optionalAuth, getItemById);
router.put('/:id',    authenticate, updateItem);
router.delete('/:id', authenticate, deleteItem);

/**
 * @openapi
 * /items/{id}/close:
 *   patch:
 *     tags: [Items]
 *     summary: Marquer l'annonce comme résolue
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Annonce fermée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Annonce introuvable
 */
router.patch('/:id/close', authenticate, closeItem);

module.exports = router;
