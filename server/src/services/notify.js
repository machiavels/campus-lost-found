/**
 * notify.js — centralized utility for creating in-app notifications.
 *
 * Usage:
 *   const notify = require('../services/notify');
 *   await notify({ userId, type, message, itemId });
 *
 * Supported types (NotificationType enum):
 *   ITEM_VERIFIED | ITEM_REJECTED | NEW_MESSAGE | CLAIM_APPROVED | CLAIM_REJECTED
 */

const prisma = require('../config/prisma');

/**
 * Create a notification for a user.
 *
 * @param {object} opts
 * @param {string}  opts.userId  - recipient user ID
 * @param {string}  opts.type    - NotificationType value
 * @param {string}  opts.message - human-readable text
 * @param {string} [opts.itemId] - optional related item ID
 * @returns {Promise<object>} the created Notification record
 */
async function notify({ userId, type, message, itemId = null }) {
  return prisma.notification.create({
    data: { userId, type, message, itemId },
  });
}

module.exports = notify;
