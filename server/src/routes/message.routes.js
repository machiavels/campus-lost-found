const router = require('express').Router();
const ctrl   = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Messages
 *     description: In-app messaging between users about items
 */

/**
 * @openapi
 * /messages:
 *   get:
 *     tags: [Messages]
 *     summary: Get inbox (received messages)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of received messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Message' }
 */
router.get('/', ctrl.getInbox);

/**
 * @openapi
 * /messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: List grouped conversations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Grouped conversation list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   partner: { $ref: '#/components/schemas/User' }
 *                   item:    { $ref: '#/components/schemas/Item' }
 *                   lastMessage: { $ref: '#/components/schemas/Message' }
 *                   unreadCount: { type: integer }
 */
router.get('/conversations', ctrl.getConversations);

/**
 * @openapi
 * /messages/thread/{itemId}/{partnerId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get message thread with a specific user about an item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Thread messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Message' }
 */
router.get('/thread/:itemId/:partnerId', ctrl.getThread);

/**
 * @openapi
 * /messages/item/{itemId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get all messages for an item (both sides)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: All messages for the item
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Message' }
 */
router.get('/item/:itemId', ctrl.getThreadByItem);

/**
 * @openapi
 * /messages:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message
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
 *               receiverId: { type: string, format: uuid }
 *               itemId:     { type: string, format: uuid }
 *               content:    { type: string, example: 'Is this backpack still available?' }
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { $ref: '#/components/schemas/Message' }
 */
router.post('/', ctrl.sendMessage);

/**
 * @openapi
 * /messages/{id}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mark a message as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Message marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { $ref: '#/components/schemas/Message' }
 */
router.patch('/:id/read', ctrl.markRead);

module.exports = router;
