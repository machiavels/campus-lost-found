/**
 * sseManager.js — manages active SSE connections per userId.
 *
 * Usage:
 *   const sseManager = require('../utils/sseManager');
 *   sseManager.addClient(userId, res);
 *   sseManager.sendToUser(userId, 'notification', { message: 'Hello!' });
 *   sseManager.removeClient(userId, res);
 */

// Map<userId, Set<res>>
const clients = new Map();

/**
 * Register a new SSE response for a given userId.
 * @param {string} userId
 * @param {import('express').Response} res
 */
function addClient(userId, res) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);
}

/**
 * Remove an SSE response for a given userId (on disconnect).
 * @param {string} userId
 * @param {import('express').Response} res
 */
function removeClient(userId, res) {
  const set = clients.get(userId);
  if (!set) {
    return;
  }
  set.delete(res);
  if (set.size === 0) {
    clients.delete(userId);
  }
}

/**
 * Push an SSE event to all active connections of a given user.
 * Silently skips if the user has no active connection.
 *
 * @param {string} userId
 * @param {string} eventName  - SSE event field (e.g. 'notification')
 * @param {object} data       - serializable payload
 */
function sendToUser(userId, eventName, data) {
  const set = clients.get(userId);
  if (!set || set.size === 0) {
    return;
  }

  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      // client already disconnected — will be cleaned up via 'close' event
    }
  }
}

/**
 * Returns the number of active SSE connections (all users combined).
 * Useful for health checks and monitoring.
 * @returns {number}
 */
function connectionCount() {
  let count = 0;
  for (const set of clients.values()) {
    count += set.size;
  }
  return count;
}

module.exports = { addClient, removeClient, sendToUser, connectionCount };
