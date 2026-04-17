const request = require('supertest');
const app     = require('../src/app');

describe('GET /api/health', () => {
  let res;

  beforeAll(async () => {
    res = await request(app).get('/api/health');
  });

  it('returns 200 with status ok', () => {
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  // ── Helmet security headers ────────────────────────────────────────────────
  it('sets X-Frame-Options: DENY', () => {
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('sets X-Content-Type-Options: nosniff', () => {
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets Content-Security-Policy', () => {
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('sets Strict-Transport-Security', () => {
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['strict-transport-security']).toContain('includeSubDomains');
  });

  it('does not expose X-Powered-By', () => {
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets Cache-Control: no-store on /api routes', () => {
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('CORS — origine non autorisée', () => {
  it('rejette une origin non déclarée avec 403, sans Access-Control-Allow-Origin', async () => {
    // callback(null, false) => cors renvoie 403 silencieusement
    const r = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(r.status).toBe(403);
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });
});
