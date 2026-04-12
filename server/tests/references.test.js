const request = require('supertest');
const app     = require('../src/app');

describe('GET /api/categories', () => {
  it('returns a list of categories (public)', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    // Controller returns { categories: [...] }
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
  });
});

describe('GET /api/locations', () => {
  it('returns a list of locations (public)', async () => {
    const res = await request(app).get('/api/locations');
    expect(res.status).toBe(200);
    // Controller returns { locations: [...] }
    expect(res.body).toHaveProperty('locations');
    expect(Array.isArray(res.body.locations)).toBe(true);
  });
});
