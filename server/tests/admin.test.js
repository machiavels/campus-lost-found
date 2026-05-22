const request                   = require('supertest');
const { app, registerAndLogin } = require('./helpers');
const prisma                    = require('../src/config/prisma');

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TS         = Date.now();
const ADMIN_EMAIL  = `admin_${TS}@eleve.isep.fr`;
const STUDENT_EMAIL = `student_${TS}@eleve.isep.fr`;
const TARGET_EMAIL  = `target_${TS}@eleve.isep.fr`;

let ADMIN_TOKEN   = '';
let STUDENT_TOKEN = '';
let ADMIN_ID      = '';
let TARGET_ID     = '';
let ITEM_ID       = '';
let CATEGORY_ID   = '';
let LOCATION_ID   = '';

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // 1. Register admin user then elevate role via Prisma
  const admin = await registerAndLogin(ADMIN_EMAIL);
  ADMIN_TOKEN = admin.token;
  ADMIN_ID    = admin.userId;
  await prisma.user.update({ where: { id: ADMIN_ID }, data: { role: 'ADMIN' } });
  // Re-login to get a fresh token with updated role in DB
  // (token still works because authenticate() fetches user from DB each time)

  // 2. Register a normal student
  const student = await registerAndLogin(STUDENT_EMAIL);
  STUDENT_TOKEN = student.token;

  // 3. Register a target user (used for status/role manipulation tests)
  const target  = await registerAndLogin(TARGET_EMAIL);
  TARGET_ID     = target.userId;

  // 4. Create a PENDING item as the student so admin can moderate it
  const catRes = await request(app).get('/api/categories');
  const cats   = catRes.body.categories ?? catRes.body;
  CATEGORY_ID  = cats[0]?.id;

  const locRes = await request(app).get('/api/locations');
  const locs   = locRes.body.locations ?? locRes.body;
  LOCATION_ID  = locs[0]?.id;

  if (CATEGORY_ID && LOCATION_ID) {
    const itemRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${student.token}`)
      .field('name', 'Clé USB test admin')
      .field('description', 'Description pour test modération admin')
      .field('reportType', 'FOUND')
      .field('categoryId', CATEGORY_ID)
      .field('locationId', LOCATION_ID);
    ITEM_ID = itemRes.body.item?.id ?? '';
  }
});

afterAll(async () => {
  // Clean up in order (FK constraints)
  await prisma.notification.deleteMany({});
  await prisma.claimRequest.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { in: [ADMIN_EMAIL, STUDENT_EMAIL, TARGET_EMAIL] } },
  });
});

// ── Auth guards ───────────────────────────────────────────────────────────────
describe('Admin routes — auth guards', () => {
  it('returns 401 with no token on GET /api/admin/users', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 with student token on GET /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 with no token on GET /api/admin/items', async () => {
    const res = await request(app).get('/api/admin/items');
    expect(res.status).toBe(401);
  });

  it('returns 403 with student token on GET /api/admin/items', async () => {
    const res = await request(app)
      .get('/api/admin/items')
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

// ── Items moderation ──────────────────────────────────────────────────────────
describe('GET /api/admin/items', () => {
  it('returns list of pending items for admin', async () => {
    const res = await request(app)
      .get('/api/admin/items')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('PATCH /api/admin/items/:id/moderate', () => {
  it('verifies a pending item with status VERIFIED', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .patch(`/api/admin/items/${ITEM_ID}/moderate`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'VERIFIED', moderationNote: 'Looks good' });
    expect(res.status).toBe(200);
    expect(res.body.item).toHaveProperty('status', 'VERIFIED');
  });

  it('rejects an item with status REJECTED', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .patch(`/api/admin/items/${ITEM_ID}/moderate`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'REJECTED', moderationNote: 'Invalid content' });
    expect(res.status).toBe(200);
    expect(res.body.item).toHaveProperty('status', 'REJECTED');
  });

  it('returns 422 for invalid status value', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .patch(`/api/admin/items/${ITEM_ID}/moderate`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'BANANA' });
    expect(res.status).toBe(422);
  });
});

// ── Users management ──────────────────────────────────────────────────────────
describe('GET /api/admin/users', () => {
  it('returns list of all users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it('users have expected fields', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    const u = res.body.users[0];
    expect(u).toHaveProperty('id');
    expect(u).toHaveProperty('email');
    expect(u).toHaveProperty('role');
    expect(u).toHaveProperty('status');
    expect(u).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/admin/users/:id', () => {
  it('returns full user detail for existing user', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id', TARGET_ID);
    expect(res.body.user).toHaveProperty('items');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 404 for unknown user id', async () => {
    const res = await request(app)
      .get('/api/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/admin/users/:id', () => {
  it('updates username of target user', async () => {
    const newUsername = `updated_${TS}`;
    const res = await request(app)
      .put(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ username: newUsername });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('username', newUsername);
  });

  it('returns 422 when no fields provided', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown user id', async () => {
    const res = await request(app)
      .put('/api/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ username: 'ghost' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/users/:id/status', () => {
  it('deactivates target user', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/status`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'INACTIVE' });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('status', 'INACTIVE');
  });

  it('reactivates target user', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/status`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'ACTIVE' });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('status', 'ACTIVE');
  });

  it('returns 422 for invalid status value', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/status`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'BANNED' });
    expect(res.status).toBe(422);
  });

  it('returns 403 when admin tries to deactivate own account', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${ADMIN_ID}/status`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'INACTIVE' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/admin/users/:id/role', () => {
  it('changes target user role to STAFF', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/role`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'STAFF' });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('role', 'STAFF');
  });

  it('changes target user role back to STUDENT', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/role`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'STUDENT' });
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('role', 'STUDENT');
  });

  it('returns 422 for invalid role', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/role`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ role: 'SUPERUSER' });
    expect(res.status).toBe(422);
  });
});

describe('PATCH /api/admin/users/:id/toggle', () => {
  it('toggles target user status', async () => {
    const beforeRes = await request(app)
      .get(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    const statusBefore = beforeRes.body.user.status;

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/toggle`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    const expected = statusBefore === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    expect(res.body.user).toHaveProperty('status', expected);

    // Restore to ACTIVE for subsequent tests
    await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/status`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ status: 'ACTIVE' });
  });
});

// ── Categories CRUD ───────────────────────────────────────────────────────────
describe('Categories admin CRUD', () => {
  let newCatId = '';

  it('GET /api/admin/categories — returns list', async () => {
    const res = await request(app)
      .get('/api/admin/categories')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it('POST /api/admin/categories — creates a category', async () => {
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: `TestCat_${TS}`, description: 'Test category' });
    expect(res.status).toBe(201);
    expect(res.body.category).toHaveProperty('id');
    expect(res.body.category).toHaveProperty('name', `TestCat_${TS}`);
    newCatId = res.body.category.id;
  });

  it('POST /api/admin/categories — returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(422);
  });

  it('PUT /api/admin/categories/:id — updates the category', async () => {
    if (!newCatId) return;
    const res = await request(app)
      .put(`/api/admin/categories/${newCatId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: `TestCat_${TS}_updated` });
    expect(res.status).toBe(200);
    expect(res.body.category).toHaveProperty('name', `TestCat_${TS}_updated`);
  });

  it('PUT /api/admin/categories/:id — returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/admin/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/categories/:id — deletes the category', async () => {
    if (!newCatId) return;
    const res = await request(app)
      .delete(`/api/admin/categories/${newCatId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/admin/categories/:id — returns 404 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/admin/categories/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(404);
  });
});

// ── Locations CRUD ────────────────────────────────────────────────────────────
describe('Locations admin CRUD', () => {
  let newLocId = '';

  it('GET /api/admin/locations — returns list', async () => {
    const res = await request(app)
      .get('/api/admin/locations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('locations');
    expect(Array.isArray(res.body.locations)).toBe(true);
  });

  it('POST /api/admin/locations — creates a location', async () => {
    const res = await request(app)
      .post('/api/admin/locations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: `TestLoc_${TS}`, description: 'Test location' });
    expect(res.status).toBe(201);
    expect(res.body.location).toHaveProperty('id');
    expect(res.body.location).toHaveProperty('name', `TestLoc_${TS}`);
    newLocId = res.body.location.id;
  });

  it('POST /api/admin/locations — returns 422 when name is missing', async () => {
    const res = await request(app)
      .post('/api/admin/locations')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(422);
  });

  it('PUT /api/admin/locations/:id — updates the location', async () => {
    if (!newLocId) return;
    const res = await request(app)
      .put(`/api/admin/locations/${newLocId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: `TestLoc_${TS}_updated` });
    expect(res.status).toBe(200);
    expect(res.body.location).toHaveProperty('name', `TestLoc_${TS}_updated`);
  });

  it('PUT /api/admin/locations/:id — returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/admin/locations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/locations/:id — deletes the location', async () => {
    if (!newLocId) return;
    const res = await request(app)
      .delete(`/api/admin/locations/${newLocId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/admin/locations/:id — returns 404 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/admin/locations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.status).toBe(404);
  });
});
