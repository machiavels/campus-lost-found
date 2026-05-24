const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
  deleteMyAccount,
  getPublicProfile,
} = require('../controllers/user.controller');

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Gestion du profil utilisateur
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Mon profil complet
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profil retourné
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 *   put:
 *     tags: [Users]
 *     summary: Mettre à jour mon profil
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: alice_new
 *               bio:
 *                 type: string
 *                 example: Étudiante en informatique
 *               avatar:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *   delete:
 *     tags: [Users]
 *     summary: Supprimer mon compte (RGPD)
 *     description: Anonymise ou supprime les données personnelles de l'utilisateur connecté.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Compte supprimé
 *       401:
 *         description: Non authentifié
 */
router.get('/me',    authenticate, getMyProfile);
router.put('/me',    authenticate, updateMyProfile);
router.delete('/me', authenticate, deleteMyAccount);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Changer mon mot de passe
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: AncienMdp123!
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NouveauMdp456!
 *     responses:
 *       200:
 *         description: Mot de passe modifié
 *       401:
 *         description: Ancien mot de passe incorrect
 */
router.patch('/me/password', authenticate, changePassword);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Profil public d'un utilisateur
 *     description: Retourne les données non-sensibles d'un utilisateur (sans email ni mot de passe).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Profil public
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 bio:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Utilisateur introuvable
 */
router.get('/:id', getPublicProfile);

module.exports = router;
