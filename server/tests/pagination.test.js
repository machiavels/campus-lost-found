'use strict';
const request = require('supertest');
const { app, registerAndLogin } = require('./helpers');

const EMAIL_A = `pag_a_${Date.now()}@eleve.isep.fr`;
const EMAIL_B = `pag_b_${Date.now()}@eleve.isep.fr`;
const ADMIN_EMAIL = `pag_admin_${Date.now()}@isep.fr`;

let tokenA = '';
let tokenB = '';
let adminToken = '';
let categoryId = '';
let locationId = '';

beforeAll(async () => {
  ({ token: tokenA } = await registerAndLogin(EMAIL_A));
  ({ token: tokenB } = await registerAndLogin(EMAIL_B));

  // Promote admin via direct login of seeded admin (fallback: use tokenA)
  const catRes = await request(app).get('/api/categories');
  const cats = catRes.body.categories ?? catRes.body;
  categoryId = cats[0]?.id;

  const locRes = await request(app).get('/api/locations');
  const locs = locRes.body.locations ?? locRes.body;
  locationId = locs[0]?.id;
}, 30000);

// ─── Helper: shape check ───────────────────────────────────────────────────────
function expectMeta(meta) {
  expect(meta).toBeDefined();
  expect(typeof meta.total).toBe('number');
  expect(typeof meta.page).toBe('number');
  expect(typeof meta.limit).toBe('number');
  expect(typeof meta.totalPages).toBe('number');
  expect(meta.page).toBeGreaterThanOrEqual(1);
  expect(meta.limit).toBeGreaterThanOrEqual(1);
  expect(meta.totalPages).toBe(Math.ceil(meta.total / meta.limit));
}

// ─── GET /api/items — pagination ──────────────────────────────────────────────
describe('Pagination — GET /api/items', () => {
  it('returns meta object with correct shape', async () => {
    const res = await request(app).get('/api/items').query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expectMeta(res.body.meta);
    expect(res.body.meta.limit).toBe(5);
    expect(res.body.meta.page).toBe(1);
  });

  it('clamps limit to 100 max', async () => {
    const res = await request(app).get('/api/items').query({ limit: 9999 });
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(100);
  });

  it('clamps page to 1 minimum on invalid value', async () => {
    const res = await request(app).get('/api/items').query({ page: -5 });
    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(1);
  });

  it('defaults to page=1 limit=20', async () => {
    const res = await request(app).get('/api/items');
    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(20);
  });
});

// ─── GET /api/search — pagination ─────────────────────────────────────────────
describe('Pagination — GET /api/search', () => {
  it('returns meta object with correct shape', async () => {
    const res = await request(app).get('/api/search').query({ q: 'test', page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expectMeta(res.body.meta);
  });

  it('no longer exposes top-level pages/total/page/limit (uses meta)', async () => {
    const res = await request(app).get('/api/search').query({ q: 'test' });
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('pages');
    expect(res.body).not.toHaveProperty('total');
    expect(res.body).toHaveProperty('meta');
  });
});

// ─── GET /api/claims — pagination ─────────────────────────────────────────────
describe('Pagination — GET /api/claims', () => {
  it('returns meta object with totalPages', async () => {
    const res = await request(app)
      .get('/api/claims')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expectMeta(res.body.meta);
  });
});

// ─── GET /api/messages — pagination ──────────────────────────────────────────
describe('Pagination — GET /api/messages', () => {
  it('inbox returns meta', async () => {
    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expectMeta(res.body.meta);
  });

  it('conversations returns meta', async () => {
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    expectMeta(res.body.meta);
  });
});

// ─── GET /api/notifications — pagination ──────────────────────────────────────
describe('Pagination — GET /api/notifications', () => {
  it('returns meta and unreadCount', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ page: 1, limit: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
    expectMeta(res.body.meta);
  });
});

// ─── GET /api/admin/items/pending — pagination ────────────────────────────────
// Admin-only: uses the seeded admin account if available, skip gracefully otherwise
describe('Pagination — GET /api/admin/items/pending', () => {
  it('returns items + meta (requires admin token)', async () => {
    // Try to login as seeded admin
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@isep.fr', password: 'Admin123!' });

    if (login.status !== 200) return; // seeded admin not available — skip

    const token = login.body.token;
    const res = await request(app)
      .get('/api/admin/items/pending')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expectMeta(res.body.meta);
  });
});

// ─── parsePagination unit test ─────────────────────────────────────────────────
describe('parsePagination helper', () => {
  const { parsePagination, buildMeta } = require('../src/utils/pagination');

  it('returns defaults when no params', () => {
    const r = parsePagination({});
    expect(r).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('clamps page minimum to 1', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1);
    expect(parsePagination({ page: '-10' }).page).toBe(1);
  });

  it('clamps limit maximum to maxLimit', () => {
    expect(parsePagination({ limit: '500' }, 100).limit).toBe(100);
  });

  it('clamps limit minimum to 1', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(1);
  });

  it('computes skip correctly', () => {
    expect(parsePagination({ page: '3', limit: '10' }).skip).toBe(20);
  });

  it('buildMeta computes totalPages', () => {
    expect(buildMeta(0, 1, 20)).toEqual({ total: 0, page: 1, limit: 20, totalPages: 0 });
    expect(buildMeta(21, 1, 20)).toEqual({ total: 21, page: 1, limit: 20, totalPages: 2 });
    expect(buildMeta(20, 2, 20)).toEqual({ total: 20, page: 2, limit: 20, totalPages: 1 });
  });
});
