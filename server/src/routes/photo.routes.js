const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { uploadPhoto, deletePhoto } = require('../controllers/photo.controller');

/**
 * @openapi
 * tags:
 *   name: Photos
 *   description: Photos associées aux annonces
 */

/**
 * @openapi
 * /items/{id}/photos:
 *   post:
 *     tags: [Photos]
 *     summary: Uploader une photo
 *     description: Téléverse une image pour une annonce. Le type MIME réel est vérifié (JPEG, PNG, WebP uniquement).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de l'annonce
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Photo uploadée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 photo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     url:
 *                       type: string
 *                       example: /uploads/uuid.jpg
 *       400:
 *         description: Fichier invalide ou type MIME rejeté
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Annonce introuvable
 */
router.post('/items/:id/photos', authenticate, upload.single('photo'), uploadPhoto);

/**
 * @openapi
 * /photos/{id}:
 *   delete:
 *     tags: [Photos]
 *     summary: Supprimer une photo
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
 *         description: Photo supprimée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Photo introuvable
 */
router.delete('/photos/:id', authenticate, deletePhoto);

module.exports = router;
