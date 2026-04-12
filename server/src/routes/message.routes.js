const router = require('express').Router();
const ctrl   = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All message routes require authentication
router.use(authenticate);

// GET  /api/messages                          — inbox (received messages)
router.get('/', ctrl.getInbox);

// GET  /api/messages/conversations            — list grouped conversations
router.get('/conversations', ctrl.getConversations);

// GET  /api/messages/thread/:itemId/:partnerId — thread with a specific user about an item
router.get('/thread/:itemId/:partnerId', ctrl.getThread);

// GET  /api/messages/item/:itemId             — all messages for an item (both sides)
router.get('/item/:itemId', ctrl.getThreadByItem);

// POST /api/messages                          — send a message
router.post('/', ctrl.sendMessage);

// PATCH /api/messages/:id/read               — mark as read
router.patch('/:id/read', ctrl.markRead);

module.exports = router;
