/**
 * notify.js — centralized utility for creating in-app notifications.
 *
 * After persisting the notification to the DB, it pushes a real-time
 * SSE event to the recipient if they have an active stream connection.
 *
 * Usage:
 *   const notify = require('../services/notify');
 *   await notify({ userId, type, message, itemId });
 *
 * Supported types (NotificationType enum):
 *   ITEM_VERIFIED | ITEM_REJECTED | NEW_MESSAGE | CLAIM_APPROVED | CLAIM_REJECTED
 */

const prisma      = require('../config/prisma');
const sseManager  = require('../utils/sseManager');

/**
 * Create a notification for a user and push it via SSE if connected.
 *
 * @param {object} opts
 * @param {string}  opts.userId  - recipient user ID
 * @param {string}  opts.type    - NotificationType value
 * @param {string}  opts.message - human-readable text
 * @param {string} [opts.itemId] - optional related item ID
 * @returns {Promise<object>} the created Notification record
 */
async function notify({ userId, type, message, itemId = null }) {
  const notification = await prisma.notification.create({
    data: { userId, type, message, itemId },
    select: {
      id: true,
      type: true,
      message: true,
      read: true,
      createdAt: true,
      item: { select: { id: true, name: true } },
    },
  });

  // Push SSE event — fire-and-forget, must never throw or block the caller
  try {
    sseManager.sendToUser(userId, 'notification', notification);
  } catch {
    // SSE push failure is non-critical; notification is already saved in DB
  }

  return notification;
}

module.exports = notify;
