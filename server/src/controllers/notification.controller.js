const prisma      = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { parsePagination, buildMeta } = require('../utils/pagination');
const sseManager  = require('../utils/sseManager');

const NOTIF_SELECT = {
  id: true,
  type: true,
  message: true,
  read: true,
  createdAt: true,
  item: { select: { id: true, name: true } },
};

/**
 * GET /api/notifications
 * Paginated; also returns unreadCount across ALL notifications (not just current page).
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const where = { userId: req.user.id };

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      select:  NOTIF_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: req.user.id, read: false } }),
  ]);

  res.json({ notifications, unreadCount, meta: buildMeta(total, page, limit) });
});

/**
 * GET /api/notifications/stream
 * Opens an SSE stream for the authenticated user.
 * Events pushed:
 *   - event: connected  → initial handshake
 *   - event: notification → new notification payload
 *   - event: heartbeat  → keep-alive every 30 s
 */
exports.streamNotifications = (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const userId = req.user.id;

  // Register this connection
  sseManager.addClient(userId, res);

  // Initial handshake event
  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Heartbeat every 30 s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30_000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.removeClient(userId, res);
  });
};

/**
 * PATCH /api/notifications/read-all
 */
exports.markAllRead = catchAsync(async (req, res) => {
  const { count } = await prisma.notification.updateMany({
    where: { userId: req.user.id, read: false },
    data:  { read: true },
  });

  res.json({ updated: count });
});

/**
 * PATCH /api/notifications/:id/read
 */
exports.markOneRead = catchAsync(async (req, res) => {
  const notif = await prisma.notification.findUnique({
    where: { id: req.params.id },
  });

  if (!notif) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  if (notif.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updated = await prisma.notification.update({
    where:  { id: req.params.id },
    data:   { read: true },
    select: NOTIF_SELECT,
  });

  res.json({ notification: updated });
});
