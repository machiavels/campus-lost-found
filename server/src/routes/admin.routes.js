const express = require('express');
const router  = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getPendingItems,
  moderateItem,
} = require('../controllers/admin.item.controller');
const {
  getUsers,
  getUserById,
  updateUser,
  setUserStatus,
  setUserRole,
} = require('../controllers/admin.user.controller');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/admin.category.controller');
const {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} = require('../controllers/admin.location.controller');

// Toutes les routes admin nécessitent le rôle ADMIN
router.use(authenticate, requireAdmin);

/**
 * @openapi
 * tags:
 *   name: Admin
 *   description: Routes réservées aux administrateurs
 */

// ── Modération des annonces ────────────────────────────────────────────────

/**
 * @openapi
 * /admin/items:
 *   get:
 *     tags: [Admin]
 *     summary: Items en attente de modération
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des items PENDING
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle ADMIN requis
 */
router.get('/items', getPendingItems);

/**
 * @openapi
 * /admin/items/{id}/moderate:
 *   patch:
 *     tags: [Admin]
 *     summary: Approuver ou rejeter une annonce
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *               note:
 *                 type: string
 *                 description: Note de modération facultative
 *     responses:
 *       200:
 *         description: Modération appliquée, auteur notifié
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Annonce introuvable
 */
router.patch('/items/:id/moderate', moderateItem);

// ── Gestion des utilisateurs ───────────────────────────────────────────────

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Liste tous les utilisateurs
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
 *         description: Liste paginée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       403:
 *         description: Rôle ADMIN requis
 */
router.get('/users', getUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Détail d'un utilisateur
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
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Utilisateur introuvable
 *   put:
 *     tags: [Admin]
 *     summary: Modifier un utilisateur
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Utilisateur modifié
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Utilisateur introuvable
 */
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Activer ou suspendre un compte
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
 *             required: [active]
 *             properties:
 *               active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Utilisateur introuvable
 */
router.patch('/users/:id/status', setUserStatus);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Changer le rôle d'un utilisateur
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: Rôle mis à jour
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Utilisateur introuvable
 */
router.patch('/users/:id/role', setUserRole);

// ── Catégories ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/categories:
 *   get:
 *     tags: [Admin]
 *     summary: Liste toutes les catégories
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Catégories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       403:
 *         description: Rôle ADMIN requis
 *   post:
 *     tags: [Admin]
 *     summary: Créer une catégorie
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Électronique
 *     responses:
 *       201:
 *         description: Catégorie créée
 *       403:
 *         description: Rôle ADMIN requis
 */
router.get('/categories',     getCategories);
router.post('/categories',    createCategory);

/**
 * @openapi
 * /admin/categories/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Modifier une catégorie
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Catégorie modifiée
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Catégorie introuvable
 *   delete:
 *     tags: [Admin]
 *     summary: Supprimer une catégorie
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Catégorie supprimée
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Catégorie introuvable
 */
router.put('/categories/:id',    updateCategory);
router.delete('/categories/:id', deleteCategory);

// ── Lieux ────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/locations:
 *   get:
 *     tags: [Admin]
 *     summary: Liste tous les lieux
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lieux
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Location'
 *       403:
 *         description: Rôle ADMIN requis
 *   post:
 *     tags: [Admin]
 *     summary: Créer un lieu
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Bibliothèque
 *     responses:
 *       201:
 *         description: Lieu créé
 *       403:
 *         description: Rôle ADMIN requis
 */
router.get('/locations',     getLocations);
router.post('/locations',    createLocation);

/**
 * @openapi
 * /admin/locations/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Modifier un lieu
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lieu modifié
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Lieu introuvable
 *   delete:
 *     tags: [Admin]
 *     summary: Supprimer un lieu
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Lieu supprimé
 *       403:
 *         description: Rôle ADMIN requis
 *       404:
 *         description: Lieu introuvable
 */
router.put('/locations/:id',    updateLocation);
router.delete('/locations/:id', deleteLocation);

module.exports = router;
