const request = require('supertest');
const { app, registerAndLogin } = require('./helpers');
const prisma = require('../src/config/prisma');

let userA, userB, itemId, msgId;
const ts = Date.now();

beforeAll(async () => {
  userA = await registerAndLogin(`msg-a-${ts}@eleve.isep.fr`);
  userB = await registerAndLogin(`msg-b-${ts}@eleve.isep.fr`);

  // Create a category, location and item owned by userB
  const cat = await prisma.category.create({ data: { name: `MsgCat-${ts}` } });
  const loc = await prisma.location.create({ data: { name: `MsgLoc-${ts}` } });
  const item = await prisma.item.create({
    data: {
      reportType: 'FOUND',
      name: `MsgItem-${ts}`,
      description: 'Test item for message tests',
      reporterId: userB.userId,
      locationId: loc.id,
      categoryId: cat.id,
      status: 'VERIFIED',
    },
  });
  itemId = item.id;
});

afterAll(async () => {
  await prisma.message.deleteMany({ where: { item: { name: { contains: `MsgItem-${ts}` } } } });
  await prisma.item.deleteMany({ where: { name: { contains: `MsgItem-${ts}` } } });
  await prisma.category.deleteMany({ where: { name: { contains: `MsgCat-${ts}` } } });
  await prisma.location.deleteMany({ where: { name: { contains: `MsgLoc-${ts}` } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `@eleve.isep.fr`, contains: `msg-` } } });
});

// ─── Auth guards ──────────────────────────────────────────────────────────────

describe('Messages — auth guards', () => {
  it('GET /api/messages returns 401 without token', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(401);
  });

  it('POST /api/messages returns 401 without token', async () => {
    const res = await request(app).post('/api/messages').send({});
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/messages ───────────────────────────────────────────────────────

describe('POST /api/messages', () => {
  it('sends a message successfully (201)', async () => {
    if (!userA.token || !userB.userId || !itemId) return;
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ recipientId: userB.userId, itemId, content: 'Hello about your item' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.content).toBe('Hello about your item');
    expect(res.body.message.sender).toBeDefined();
    expect(res.body.message.recipient).toBeDefined();
    expect(res.body.message.item).toBeDefined();
    // Must not expose email or phone
    expect(res.body.message.sender.email).toBeUndefined();
    expect(res.body.message.recipient.email).toBeUndefined();
    msgId = res.body.message.id;
  });

  it('returns 422 when fields are missing', async () => {
    if (!userA.token) return;
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ content: 'Missing recipientId and itemId' });
    expect(res.status).toBe(422);
  });

  it('returns 400 when sending to yourself', async () => {
    if (!userA.token || !userA.userId || !itemId) return;
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ recipientId: userA.userId, itemId, content: 'Self-message' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown item', async () => {
    if (!userA.token || !userB.userId) return;
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ recipientId: userB.userId, itemId: '00000000-0000-0000-0000-000000000000', content: 'Ghost item' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown recipient', async () => {
    if (!userA.token || !itemId) return;
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ recipientId: '00000000-0000-0000-0000-000000000000', itemId, content: 'Ghost user' });
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/messages (inbox) ────────────────────────────────────────────────

describe('GET /api/messages', () => {
  it('returns inbox for recipient (200)', async () => {
    if (!userB.token) return;
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toBeDefined();
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('inbox messages have expected fields', async () => {
    if (!userB.token) return;
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${userB.token}`);
    if (res.body.messages.length > 0) {
      const msg = res.body.messages[0];
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('content');
      expect(msg).toHaveProperty('sentAt');
      expect(msg.sender).toHaveProperty('id');
      expect(msg.sender).toHaveProperty('username');
      expect(msg.sender.email).toBeUndefined();
    }
  });
});

// ─── GET /api/messages/conversations ─────────────────────────────────────────

describe('GET /api/messages/conversations', () => {
  it('returns conversations list (200)', async () => {
    if (!userA.token) return;
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(200);
    expect(res.body.conversations).toBeDefined();
    expect(Array.isArray(res.body.conversations)).toBe(true);
  });

  it('deduplicates — one entry per thread', async () => {
    if (!userA.token) return;
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${userA.token}`);
    const keys = res.body.conversations.map(c => `${c.item.id}|${c.sender.id === userA.userId ? c.recipient.id : c.sender.id}`);
    const unique = new Set(keys);
    expect(keys.length).toBe(unique.size);
  });
});

// ─── GET /api/messages/thread/:itemId/:partnerId ──────────────────────────────

describe('GET /api/messages/thread/:itemId/:partnerId', () => {
  it('returns thread between two users (200)', async () => {
    if (!userA.token || !itemId || !userB.userId) return;
    const res = await request(app)
      .get(`/api/messages/thread/${itemId}/${userB.userId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('returns 400 when partnerId === own id', async () => {
    if (!userA.token || !itemId || !userA.userId) return;
    const res = await request(app)
      .get(`/api/messages/thread/${itemId}/${userA.userId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/messages/item/:itemId ──────────────────────────────────────────

describe('GET /api/messages/item/:itemId', () => {
  it('returns all messages for an item (200)', async () => {
    if (!userA.token || !itemId) return;
    const res = await request(app)
      .get(`/api/messages/item/${itemId}`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });
});

// ─── PATCH /api/messages/:id/read ────────────────────────────────────────────

describe('PATCH /api/messages/:id/read', () => {
  it('recipient can mark message as read (200)', async () => {
    if (!userB.token || !msgId) return;
    const res = await request(app)
      .patch(`/api/messages/${msgId}/read`)
      .set('Authorization', `Bearer ${userB.token}`);
    expect(res.status).toBe(200);
    expect(res.body.message.readAt).not.toBeNull();
  });

  it('sender cannot mark someone else message as read (403)', async () => {
    if (!userA.token || !msgId) return;
    const res = await request(app)
      .patch(`/api/messages/${msgId}/read`)
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown message id', async () => {
    if (!userB.token) return;
    const res = await request(app)
      .patch('/api/messages/00000000-0000-0000-0000-000000000000/read')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(res.status).toBe(404);
  });
});
