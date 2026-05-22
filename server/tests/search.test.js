const request = require('supertest');
const app     = require('../src/app');

describe('GET /api/search', () => {
  it('returns results for a keyword query', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ q: 'clé' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    // standardized meta
    expect(res.body).toHaveProperty('meta');
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.totalPages).toBe('number');
  });

  it('returns 400 when q param is missing', async () => {
    const res = await request(app).get('/api/search');
    expect([400, 422]).toContain(res.status);
  });
});
