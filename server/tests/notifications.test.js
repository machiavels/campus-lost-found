const request = require('supertest');
const app     = require('../src/app');
const { registerAndLogin } = require('./helpers');

const SENDER_EMAIL    = 'notif_sender@eleve.isep.fr';
const RECIPIENT_EMAIL = 'notif_recipient@eleve.isep.fr';
const PASSWORD        = 'TestPass123!';

describe('Notifications API', () => {
  let senderToken, senderId;
  let recipientToken, recipientId;
  let createdItemId;

  beforeAll(async () => {
    // Register / login sender
    ({ token: senderToken, userId: senderId } =
      await registerAndLogin(SENDER_EMAIL, PASSWORD));

    // Register / login recipient
    ({ token: recipientToken, userId: recipientId } =
      await registerAndLogin(RECIPIENT_EMAIL, PASSWORD));

    // Create a lost item as the sender so we have a valid itemId for messages
    const itemRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        name:        'Test Laptop',
        description: 'A test laptop for notification tests',
        type:        'LOST',
        locationId:  1,
        categoryId:  1,
      });

    createdItemId = itemRes.body?.item?.id ?? itemRes.body?.id;
  });

  // ── GET /api/notifications ────────────────────────────────────────────────
  describe('GET /api/notifications', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('returns 200 with notifications array and unreadCount', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('notifications');
      expect(res.body).toHaveProperty('unreadCount');
      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(typeof res.body.unreadCount).toBe('number');
    });

    it('creates a NEW_MESSAGE notification when a message is sent', async () => {
      if (!createdItemId) return; // skip if item creation failed

      // Send a message from sender → recipient; this triggers notify() internally
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipientId: recipientId,
          itemId:      createdItemId,
          content:     'Hi, is this laptop still available?',
        });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(res.status).toBe(200);
      const newMsgNotif = res.body.notifications.find(
        (n) => n.type === 'NEW_MESSAGE'
      );
      expect(newMsgNotif).toBeDefined();
      expect(newMsgNotif).toHaveProperty('id');
      expect(newMsgNotif).toHaveProperty('read');
      expect(newMsgNotif).toHaveProperty('message');
    });
  });

  // ── PATCH /api/notifications/read-all ────────────────────────────────────
  describe('PATCH /api/notifications/read-all', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).patch('/api/notifications/read-all');
      expect(res.status).toBe(401);
    });

    it('returns 200 and marks all unread notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('updated');
      expect(typeof res.body.updated).toBe('number');

      // Subsequent call should return 0 (all already read)
      const res2 = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${recipientToken}`);
      expect(res2.body.updated).toBe(0);
    });
  });

  // ── PATCH /api/notifications/:id/read ────────────────────────────────────
  describe('PATCH /api/notifications/:id/read', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app)
        .patch('/api/notifications/some-id/read');
      expect(res.status).toBe(401);
    });

    it('returns 404 for a non-existent notification id', async () => {
      const res = await request(app)
        .patch('/api/notifications/non-existent-id/read')
        .set('Authorization', `Bearer ${recipientToken}`);
      expect(res.status).toBe(404);
    });

    it('marks a single notification as read and returns it', async () => {
      // Get a notification belonging to recipient
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);

      const notif = listRes.body.notifications?.[0];
      if (!notif) return; // no notifications to test against

      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.read).toBe(true);
      expect(res.body.notification.id).toBe(notif.id);
    });

    it('returns 403 when another user tries to mark the notification', async () => {
      // Get a notification belonging to recipient
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${recipientToken}`);

      const notif = listRes.body.notifications?.[0];
      if (!notif) return;

      // Sender tries to mark recipient's notification — should be forbidden
      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${senderToken}`);

      expect(res.status).toBe(403);
    });
  });
});
