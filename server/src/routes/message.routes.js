const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getInbox,
  getConversations,
  getThread,
  getItemMessages,
  sendMessage,
  markRead,
} = require('../controllers/message.controller');

/**
 * @openapi
 * tags:
 *   name: Messages
 *   description: Messagerie interne entre utilisateurs
 */

/**
 * @openapi
 * /messages:
 *   get:
 *     tags: [Messages]
 *     summary: Inbox — messages reçus
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des messages reçus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       401:
 *         description: Non authentifié
 *   post:
 *     tags: [Messages]
 *     summary: Envoyer un message
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, itemId, content]
 *             properties:
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *               itemId:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *                 example: "Bonjour, est-ce votre portefeuille ?"
 *     responses:
 *       201:
 *         description: Message envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
router.get('/',    authenticate, getInbox);
router.post('/',   authenticate, sendMessage);

/**
 * @openapi
 * /messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: Liste des conversations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations groupées par item et interlocuteur
 *       401:
 *         description: Non authentifié
 */
router.get('/conversations', authenticate, getConversations);

/**
 * @openapi
 * /messages/thread/{itemId}/{partnerId}:
 *   get:
 *     tags: [Messages]
 *     summary: Fil d'une conversation
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Messages du fil
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Non authentifié
 */
router.get('/thread/:itemId/:partnerId', authenticate, getThread);

/**
 * @openapi
 * /messages/item/{itemId}:
 *   get:
 *     tags: [Messages]
 *     summary: Messages liés à un item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des messages
 *       401:
 *         description: Non authentifié
 */
router.get('/item/:itemId', authenticate, getItemMessages);

/**
 * @openapi
 * /messages/{id}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Marquer un message comme lu
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
 *         description: Message marqué comme lu
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Message introuvable
 */
router.patch('/:id/read', authenticate, markRead);

module.exports = router;
