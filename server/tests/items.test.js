const request            = require('supertest');
const { app, registerAndLogin } = require('./helpers');

const EMAIL = `test_items_${Date.now()}@eleve.isep.fr`;
let TOKEN       = '';
let ITEM_ID     = '';
let CATEGORY_ID = '';
let LOCATION_ID = '';

beforeAll(async () => {
  const { token } = await registerAndLogin(EMAIL);
  TOKEN = token;

  const catRes = await request(app).get('/api/categories');
  const cats   = catRes.body.categories ?? catRes.body;
  CATEGORY_ID  = cats[0]?.id;

  const locRes = await request(app).get('/api/locations');
  const locs   = locRes.body.locations ?? locRes.body;
  LOCATION_ID  = locs[0]?.id;
});

// ─── GET /api/items ────────────────────────────────────────────────────────────
describe('GET /api/items', () => {
  it('returns a paginated list (public)', async () => {
    const res = await request(app).get('/api/items');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    // meta shape
    expect(res.body).toHaveProperty('meta');
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.totalPages).toBe('number');
  });

  it('accepts filter params without error', async () => {
    const res = await request(app)
      .get('/api/items')
      .query({ type: 'LOST', status: 'OPEN' });
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/items ───────────────────────────────────────────────────────────
describe('POST /api/items', () => {
  it('creates an item when authenticated', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${TOKEN}`)
      .field('name', 'Clés de voiture')
      .field('description', 'Trousseau de 3 clés avec porte-monnaie rouge')
      .field('reportType', 'FOUND')
      .field('categoryId', CATEGORY_ID)
      .field('locationId', LOCATION_ID);

    expect([201, 200]).toContain(res.status);
    expect(res.body.item).toHaveProperty('id');
    ITEM_ID = res.body.item.id;
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({ name: 'Test', reportType: 'LOST' });
    expect(res.status).toBe(401);
  });

  it('returns 400 with missing required fields', async () => {
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/items/:id ────────────────────────────────────────────────────────
describe('GET /api/items/:id', () => {
  it('returns the item by id (as owner, item may be PENDING)', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .get(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('item.id', ITEM_ID);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/items/999999999');
    expect([404, 400]).toContain(res.status);
  });
});

// ─── PUT /api/items/:id ────────────────────────────────────────────────────────
describe('PUT /api/items/:id', () => {
  it('updates the item when authenticated as owner', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .put(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'Clés mises à jour' });
    expect([200, 204]).toContain(res.status);
  });

  it('returns 401 without token', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .put(`/api/items/${ITEM_ID}`)
      .send({ name: 'Hack' });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/items/:id/close ────────────────────────────────────────────────
describe('PATCH /api/items/:id/close', () => {
  it('closes the item when authenticated as owner', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .patch(`/api/items/${ITEM_ID}/close`)
      .set('Authorization', `Bearer ${TOKEN}`);
    expect([200, 204]).toContain(res.status);
  });
});

// ─── DELETE /api/items/:id ─────────────────────────────────────────────────────
describe('DELETE /api/items/:id', () => {
  it('deletes the item when authenticated as owner', async () => {
    if (!ITEM_ID) return;
    const res = await request(app)
      .delete(`/api/items/${ITEM_ID}`)
      .set('Authorization', `Bearer ${TOKEN}`);
    expect([200, 204]).toContain(res.status);
  });

  it('returns 404 after deletion', async () => {
    if (!ITEM_ID) return;
    const res = await request(app).get(`/api/items/${ITEM_ID}`);
    expect([404, 400]).toContain(res.status);
  });
});
