const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const {
  getNotifications,
  streamNotifications,
  markAllRead,
  markOneRead,
} = require('../controllers/notification.controller');

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Notifications
 *     description: In-app notifications and SSE real-time stream
 */

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List all notifications for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Notification' }
 */
router.get('/',              getNotifications);

/**
 * @openapi
 * /notifications/stream:
 *   get:
 *     tags: [Notifications]
 *     summary: SSE stream — real-time push notifications
 *     description: |
 *       Opens a Server-Sent Events connection. The client receives `data:` events
 *       whenever a new notification is created for the authenticated user.
 *       Keep this connection alive; the server sends a heartbeat every 30 s.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: SSE stream opened
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: {\"type\":\"CLAIM_APPROVED\",\"message\":\"Your claim was approved\"}\n\n"
 */
router.get('/stream',        streamNotifications);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: All notifications marked as read
 */
router.patch('/read-all',    markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Notification' }
 */
router.patch('/:id/read',   markOneRead);

module.exports = router;
