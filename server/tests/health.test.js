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
  it('n\'envoie pas Access-Control-Allow-Origin pour une origin non déclarée', async () => {
    // callback(null, false) => cors omet le header ACAO sans bloquer la requête côté serveur.
    // Le blocage réel est effectué par le navigateur (politique CORS).
    // Supertest ne simule pas un navigateur : on vérifie uniquement l'absence du header.
    const r = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });
});
