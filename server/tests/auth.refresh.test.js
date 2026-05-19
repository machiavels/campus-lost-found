/**
 * Tests d'intégration — Refresh Token (issue #23)
 * Flow complet : login → refresh → logout → refresh invalide
 */
const request = require('supertest');
const app     = require('../src/app');
const prisma  = require('../src/config/prisma');

const TEST_EMAIL    = 'refresh.test@isep.fr';
const TEST_PASSWORD = 'TestPass123!';
const TEST_USERNAME = 'refresh_test_user';

async function loginAndGetCookies() {
  // Créer l'utilisateur s'il n'existe pas
  await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, username: TEST_USERNAME });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  return { cookies: res.headers['set-cookie'], body: res.body };
}

beforeAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_EMAIL } } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { user: { email: TEST_EMAIL } } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login — refresh token cookie', () => {
  it('pose un cookie refreshToken HttpOnly après login', async () => {
    const { cookies, body } = await loginAndGetCookies();

    expect(body).toHaveProperty('accessToken');
    expect(cookies).toBeDefined();
    const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/SameSite=Strict/i);
  });
});

describe('POST /api/auth/refresh', () => {
  it('retourne un nouvel access token avec un refresh token valide', async () => {
    const { cookies } = await loginAndGetCookies();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    // Le nouveau cookie doit être présent (rotation)
    const newCookies = res.headers['set-cookie'];
    expect(newCookies).toBeDefined();
    expect(newCookies.find(c => c.startsWith('refreshToken='))).toBeDefined();
  });

  it('retourne 401 sans cookie refreshToken', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 401 avec un token aléatoire invalide', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['refreshToken=aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899']);

    expect(res.status).toBe(401);
  });

  it('un ancien refresh token ne fonctionne plus après rotation', async () => {
    const { cookies } = await loginAndGetCookies();

    // Premier refresh — consomme le token
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    // Réutilisation de l'ancien token → doit échouer
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('invalide le refresh token et retourne 204', async () => {
    const { cookies } = await loginAndGetCookies();

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(204);
  });

  it('le refresh est refusé (401) après logout', async () => {
    const { cookies } = await loginAndGetCookies();

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(401);
  });

  it('logout sans cookie retourne quand même 204', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});
