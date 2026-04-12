const prisma = require('../config/prisma');
const { catchAsync } = require('../middleware/error.middleware');

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
 * Returns all notifications for the authenticated user, newest first.
 */
exports.getNotifications = catchAsync(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where:   { userId: req.user.id },
    select:  NOTIF_SELECT,
    orderBy: { createdAt: 'desc' },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  res.json({ notifications, unreadCount });
});

/**
 * PATCH /api/notifications/read-all
 * Marks every unread notification of the authenticated user as read.
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
 * Marks a single notification as read.
 * Only the owner of the notification can mark it.
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
