const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');

// Safe select — never exposes email or phone
const MSG_SELECT = {
  id: true, content: true, sentAt: true, readAt: true,
  sender:    { select: { id: true, username: true } },
  recipient: { select: { id: true, username: true } },
  item:      { select: { id: true, name: true } },
};

/** GET /api/messages — inbox (all received messages) */
exports.getInbox = catchAsync(async (req, res) => {
  const messages = await prisma.message.findMany({
    where:   { recipientId: req.user.id },
    select:  MSG_SELECT,
    orderBy: { sentAt: 'desc' },
  });
  res.json({ messages });
});

/**
 * GET /api/messages/conversations
 * Returns one representative message per (item, partner) pair
 * so the front-end can render a conversation list.
 * No email or phone is ever included.
 */
exports.getConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Fetch every message where the user is sender or recipient
  const all = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
    select: MSG_SELECT,
    orderBy: { sentAt: 'desc' },
  });

  // Group by "itemId|partnerId" — keep only the latest message per thread
  const seen = new Map();
  for (const msg of all) {
    const partnerId = msg.sender.id === userId ? msg.recipient.id : msg.sender.id;
    const key = `${msg.item.id}|${partnerId}`;
    if (!seen.has(key)) seen.set(key, msg);
  }

  res.json({ conversations: Array.from(seen.values()) });
});

/** GET /api/messages/item/:itemId — full thread for an item (both directions) */
exports.getThreadByItem = catchAsync(async (req, res) => {
  const messages = await prisma.message.findMany({
    where: {
      itemId: req.params.itemId,
      OR: [{ senderId: req.user.id }, { recipientId: req.user.id }],
    },
    select:  MSG_SELECT,
    orderBy: { sentAt: 'asc' },
  });
  res.json({ messages });
});

/**
 * GET /api/messages/thread/:itemId/:partnerId
 * Returns the conversation between the authenticated user and :partnerId
 * about item :itemId.
 * Only sender and recipient can read their own thread.
 */
exports.getThread = catchAsync(async (req, res) => {
  const userId    = req.user.id;
  const { itemId, partnerId } = req.params;

  // Guard: the caller must be one of the two parties
  if (userId === partnerId) {
    return res.status(400).json({ error: 'partnerId must differ from your own id' });
  }

  const messages = await prisma.message.findMany({
    where: {
      itemId,
      OR: [
        { senderId: userId,    recipientId: partnerId },
        { senderId: partnerId, recipientId: userId    },
      ],
    },
    select:  MSG_SELECT,
    orderBy: { sentAt: 'asc' },
  });

  res.json({ messages });
});

/** POST /api/messages — send a message linked to an item */
exports.sendMessage = catchAsync(async (req, res) => {
  const { recipientId, itemId, content } = req.body;

  if (!recipientId || !itemId || !content) {
    return res.status(422).json({ error: 'recipientId, itemId and content are required' });
  }
  if (recipientId === req.user.id) {
    return res.status(400).json({ error: 'Cannot send a message to yourself' });
  }

  // Verify item exists
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Verify recipient exists
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const msg = await prisma.message.create({
    data:   { senderId: req.user.id, recipientId, itemId, content },
    select: MSG_SELECT,
  });
  res.status(201).json({ message: msg });
});

/** PATCH /api/messages/:id/read — mark a received message as read */
exports.markRead = catchAsync(async (req, res) => {
  const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!msg)                         return res.status(404).json({ error: 'Message not found' });
  if (msg.recipientId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.message.update({
    where:  { id: req.params.id },
    data:   { readAt: new Date() },
    select: MSG_SELECT,
  });
  res.json({ message: updated });
});
