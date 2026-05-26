'use strict';

const prisma = require('../config/prisma');

/**
 * Allowed NotificationType values — must match schema.prisma enum.
 * Kept as a Set for O(1) lookup.
 */
const VALID_TYPES = new Set([
  'ITEM_VERIFIED',
  'ITEM_REJECTED',
  'CLAIM_RECEIVED',
  'CLAIM_ACCEPTED',
  'CLAIM_REJECTED',
  'CLAIM_APPROVED',
  'NEW_MESSAGE',
  'MESSAGE_RECEIVED',
]);

/**
 * notify.create — persiste une notification en base.
 *
 * @param {object} opts
 * @param {string}  opts.userId   - recipient user id
 * @param {string}  opts.type     - NotificationType enum value
 * @param {string}  opts.message  - human-readable message
 * @param {string=} opts.itemId   - optional item id
 * @param {string=} opts.claimId  - optional claim id (ignored by schema, kept for compat)
 * @returns {Promise<object|null>} created notification, or null if type is unknown
 */
exports.create = async ({ userId, type, message, itemId = null }) => {
  if (!VALID_TYPES.has(type)) {
    console.warn(`[notify] Unknown NotificationType "${type}" — skipping.`);
    return null;
  }

  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
      itemId: itemId || null,
    },
  });
};
