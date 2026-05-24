const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getNotifications,
  streamNotifications,
  markAllRead,
  markOneRead,
} = require('../controllers/notification.controller');

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: Notifications in-app et flux SSE en temps réel
 */

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Liste des notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications de l'utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 unreadCount:
 *                   type: integer
 *                   example: 3
 *       401:
 *         description: Non authentifié
 */
router.get('/', authenticate, getNotifications);

/**
 * @openapi
 * /notifications/stream:
 *   get:
 *     tags: [Notifications]
 *     summary: Flux SSE en temps réel
 *     description: |
 *       Ouvre un flux Server-Sent Events (Content-Type: text/event-stream).
 *       Les nouvelles notifications sont poussées sans polling.
 *       Exemple côté client :
 *       ```js
 *       const src = new EventSource('/api/notifications/stream', { headers: { Authorization: `Bearer ${token}` } });
 *       src.onmessage = e => console.log(JSON.parse(e.data));
 *       ```
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Connexion SSE établie
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: {\"type\":\"NEW_MESSAGE\",\"message\":\"Vous avez reçu un message\"}\n\n"
 *       401:
 *         description: Non authentifié
 */
router.get('/stream', authenticate, streamNotifications);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Tout marquer comme lu
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Toutes les notifications marquées comme lues
 *       401:
 *         description: Non authentifié
 */
router.patch('/read-all', authenticate, markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marquer une notification comme lue
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
 *         description: Notification marquée comme lue
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Notification introuvable
 */
router.patch('/:id/read', authenticate, markOneRead);

module.exports = router;
