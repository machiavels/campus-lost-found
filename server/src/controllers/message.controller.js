const prisma  = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const notify  = require('../services/notify');
const { parsePagination, buildMeta } = require('../utils/pagination');

// Shared include for message queries
const MESSAGE_INCLUDE = {
  sender:    { select: { id: true, username: true } },
  recipient: { select: { id: true, username: true } },
  item:      { select: { id: true, name: true } },
};

/**
 * GET /api/messages
 * Inbox: all messages received by the authenticated user
 */
exports.getInbox = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user.id;

  const where = { recipientId: userId };
  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include:  MESSAGE_INCLUDE,
      orderBy:  { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  res.json({ messages, meta: buildMeta(total, page, limit) });
});

/**
 * GET /api/messages/conversations
 * Returns a list of unique users this user has exchanged messages with
 */
exports.getConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { recipientId: userId },
      ],
    },
    include: {
      sender:    { select: { id: true, username: true } },
      recipient: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const partnersMap = new Map();
  for (const msg of messages) {
    const partner = msg.senderId === userId ? msg.recipient : msg.sender;
    if (!partnersMap.has(partner.id)) {
      partnersMap.set(partner.id, {
        ...partner,
        lastMessage:   msg.content,
        lastMessageAt: msg.createdAt,
      });
    }
  }

  res.json({ conversations: Array.from(partnersMap.values()) });
});

// Alias kept for legacy callers
exports.listConversations = exports.getConversations;

/**
 * GET /api/messages/thread/:itemId/:partnerId
 * All messages between the authenticated user and partnerId about itemId
 */
exports.getThread = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId    = req.user.id;
  const { itemId, partnerId } = req.params;

  const where = {
    itemId,
    OR: [
      { senderId: userId,    recipientId: partnerId },
      { senderId: partnerId, recipientId: userId },
    ],
  };

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include:  MESSAGE_INCLUDE,
      orderBy:  { createdAt: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  res.json({ messages, meta: buildMeta(total, page, limit) });
});

/**
 * GET /api/messages/item/:itemId
 * All messages for a given item where the user is sender or recipient
 */
exports.getThreadByItem = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId = req.user.id;
  const { itemId } = req.params;

  const where = {
    itemId,
    OR: [
      { senderId: userId },
      { recipientId: userId },
    ],
  };

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include:  MESSAGE_INCLUDE,
      orderBy:  { createdAt: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  res.json({ messages, meta: buildMeta(total, page, limit) });
});

/**
 * GET /api/messages/:userId  (legacy — kept for backwards compat)
 * Returns all messages between the authenticated user and :userId
 */
exports.getConversation = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userId    = req.user.id;
  const partnerId = req.params.userId;

  if (userId === partnerId) {
    return res.status(400).json({ error: 'Cannot retrieve conversation with yourself' });
  }

  const partner = await prisma.user.findUnique({ where: { id: partnerId } });
  if (!partner) {
    return res.status(404).json({ error: 'User not found' });
  }

  const where = {
    OR: [
      { senderId: userId,    recipientId: partnerId },
      { senderId: partnerId, recipientId: userId },
    ],
  };

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include:  MESSAGE_INCLUDE,
      orderBy:  { createdAt: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  res.json({ messages, meta: buildMeta(total, page, limit) });
});

/**
 * POST /api/messages
 * Body: { recipientId, itemId?, content }
 */
exports.sendMessage = catchAsync(async (req, res) => {
  const { recipientId, itemId, content } = req.body;

  if (recipientId === req.user.id) {
    return res.status(400).json({ error: 'You cannot send a message to yourself' });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  if (itemId) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
  }

  const message = await prisma.message.create({
    data: {
      senderId:    req.user.id,
      recipientId,
      itemId:      itemId || null,
      content,
    },
    include: MESSAGE_INCLUDE,
  });

  await notify.create({
    userId:  recipientId,
    type:    'MESSAGE_RECEIVED',
    message: `You have a new message from ${req.user.username}.`,
    itemId:  itemId || null,
  });

  res.status(201).json({ message });
});

/**
 * PATCH /api/messages/:id/read
 * Mark a specific message as read (recipient only)
 */
exports.markRead = catchAsync(async (req, res) => {
  const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (existing.recipientId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const message = await prisma.message.update({
    where: { id: req.params.id },
    data:  { readAt: new Date() },
    include: MESSAGE_INCLUDE,
  });

  res.json({ message });
});
