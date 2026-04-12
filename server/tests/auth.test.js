const request = require('supertest');
const app     = require('../src/app');

const SUFFIX   = Date.now();
const EMAIL    = `test_auth_${SUFFIX}@eleve.isep.fr`;
const USERNAME = `testuser_${SUFFIX}`;
const PASSWORD = 'SecurePass123!';
let   TOKEN    = '';

// ─── POST /api/auth/register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: USERNAME, email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: EMAIL });
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `${USERNAME}_2`, email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(409);
  });

  it('rejects non-campus email with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `hacker_${SUFFIX}`, email: 'hacker@gmail.com', password: PASSWORD });

    expect([400, 422]).toContain(res.status);
  });

  it('rejects missing password with 422', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `other_${SUFFIX}`, email: `other_${SUFFIX}@eleve.isep.fr` });

    expect([400, 422]).toContain(res.status);
  });
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns a JWT on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    TOKEN = res.body.token;
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'WrongPass!' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@eleve.isep.fr', password: PASSWORD });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns the authenticated user profile', async () => {
    if (!TOKEN) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: EMAIL, password: PASSWORD });
      TOKEN = res.body.token;
    }

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    // Controller wraps user in { user: { ... } }
    expect(res.body.user).toHaveProperty('email', EMAIL);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
