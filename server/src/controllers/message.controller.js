const prisma  = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const notify  = require('../services/notify');
const { parsePagination, buildMeta } = require('../utils/pagination');

const MSG_SELECT = {
  id: true, content: true, sentAt: true, readAt: true,
  sender:    { select: { id: true, username: true } },
  recipient: { select: { id: true, username: true } },
  item:      { select: { id: true, name: true } },
};

/** GET /api/messages — inbox (paginated) */
exports.getInbox = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const where = { recipientId: req.user.id };
  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      select:  MSG_SELECT,
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  res.json({ messages, meta: buildMeta(total, page, limit) });
});

/**
 * GET /api/messages/conversations (paginated)
 */
exports.getConversations = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = parsePagination(req.query);

  const all = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
    select: MSG_SELECT,
    orderBy: { sentAt: 'desc' },
  });

  // Deduplicate by thread key
  const seen = new Map();
  for (const msg of all) {
    const partnerId = msg.sender.id === userId ? msg.recipient.id : msg.sender.id;
    const key = `${msg.item.id}|${partnerId}`;
    if (!seen.has(key)) seen.set(key, msg);
  }

  const conversations = Array.from(seen.values());
  const total = conversations.length;
  const paged = conversations.slice((page - 1) * limit, page * limit);

  res.json({ conversations: paged, meta: buildMeta(total, page, limit) });
});

/** GET /api/messages/item/:itemId */
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
 */
exports.getThread = catchAsync(async (req, res) => {
  const userId    = req.user.id;
  const { itemId, partnerId } = req.params;

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

/** POST /api/messages */
exports.sendMessage = catchAsync(async (req, res) => {
  const { recipientId, itemId, content } = req.body;

  if (!recipientId || !itemId || !content) {
    return res.status(422).json({ error: 'recipientId, itemId and content are required' });
  }
  if (recipientId === req.user.id) {
    return res.status(400).json({ error: 'Cannot send a message to yourself' });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, name: true } });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, username: true } });
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const msg = await prisma.message.create({
    data:   { senderId: req.user.id, recipientId, itemId, content },
    select: MSG_SELECT,
  });

  await notify({
    userId:  recipientId,
    type:    'NEW_MESSAGE',
    message: `${req.user.username} sent you a message about "${item.name}".`,
    itemId:  item.id,
  });

  res.status(201).json({ message: msg });
});

/** PATCH /api/messages/:id/read */
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
