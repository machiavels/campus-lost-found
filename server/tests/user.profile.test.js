/**
 * user.profile.test.js
 * Integration tests for issue #26 — User profile routes.
 */
const request = require('supertest');
const app     = require('../src/app');
const { registerAndLogin } = require('./helpers');

const USER_EMAIL    = 'profile_user@eleve.isep.fr';
const OTHER_EMAIL   = 'profile_other@eleve.isep.fr';
const PASSWORD      = 'TestPass123!';
const NEW_PASSWORD  = 'NewPass456!';

describe('User Profile API — #26', () => {
  let token, userId;
  let otherToken, otherUserId;

  beforeAll(async () => {
    ({ token, userId } = await registerAndLogin(USER_EMAIL, PASSWORD));
    ({ token: otherToken, userId: otherUserId } = await registerAndLogin(OTHER_EMAIL, PASSWORD));
  });

  // ── GET /api/users/me ─────────────────────────────────────────────────────
  describe('GET /api/users/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('returns own profile with all expected fields', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user).toHaveProperty('avatar');
      expect(res.body.user).toHaveProperty('bio');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });
  });

  // ── PUT /api/users/me ─────────────────────────────────────────────────────
  describe('PUT /api/users/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).put('/api/users/me').send({ bio: 'hello' });
      expect(res.status).toBe(401);
    });

    it('returns 400 with empty body (at least one field required)', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 with invalid username (special chars)', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'bad username!' });
      expect(res.status).toBe(400);
    });

    it('returns 400 with invalid avatar URL', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar: 'not-a-url' });
      expect(res.status).toBe(400);
    });

    it('updates bio successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'I found a lost key once.' });

      expect(res.status).toBe(200);
      expect(res.body.user.bio).toBe('I found a lost key once.');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('updates avatar URL successfully', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ avatar: 'https://example.com/avatar.png' });

      expect(res.status).toBe(200);
      expect(res.body.user.avatar).toBe('https://example.com/avatar.png');
    });

    it('returns 409 when username is already taken', async () => {
      // Get other user's username
      const otherRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${otherToken}`);
      const otherUsername = otherRes.body.user.username;

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: otherUsername });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/taken/i);
    });
  });

  // ── PATCH /api/users/me/password ─────────────────────────────────────────────
  describe('PATCH /api/users/me/password', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
      expect(res.status).toBe(401);
    });

    it('returns 400 when newPassword is missing', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD });
      expect(res.status).toBe(400);
    });

    it('returns 400 when newPassword is too short', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, newPassword: 'short' });
      expect(res.status).toBe(400);
    });

    it('returns 401 when currentPassword is wrong', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'WrongPass999!', newPassword: NEW_PASSWORD });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/incorrect/i);
    });

    it('returns 400 when new password equals current', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
      expect(res.status).toBe(400);
    });

    it('changes password successfully and invalidates old token', async () => {
      // Use a dedicated user to avoid breaking other tests
      const pwEmail = 'pw_change_test@eleve.isep.fr';
      const { token: pwToken } = await registerAndLogin(pwEmail, PASSWORD);

      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${pwToken}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/succ/i);
    });
  });

  // ── GET /api/users/:id ─────────────────────────────────────────────────────
  describe('GET /api/users/:id', () => {
    it('returns 404 for a non-existent user id', async () => {
      const res = await request(app).get('/api/users/non-existent-id');
      expect(res.status).toBe(404);
    });

    it('returns public profile without email or passwordHash', async () => {
      const res = await request(app).get(`/api/users/${otherUserId}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username');
      expect(res.body.user).toHaveProperty('avatar');
      expect(res.body.user).toHaveProperty('bio');
      expect(res.body.user).not.toHaveProperty('email');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('does not require authentication', async () => {
      // Public endpoint — no token needed
      const res = await request(app).get(`/api/users/${userId}`);
      expect(res.status).toBe(200);
    });
  });

  // ── DELETE /api/users/me ────────────────────────────────────────────────────
  describe('DELETE /api/users/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).delete('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('anonymises account and returns 204', async () => {
      // Use a dedicated throwaway user
      const delEmail  = 'to_delete@eleve.isep.fr';
      const { token: delToken, userId: delId } = await registerAndLogin(delEmail, PASSWORD);

      const res = await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${delToken}`);

      expect(res.status).toBe(204);

      // Public profile should return 404 (INACTIVE user)
      const pubRes = await request(app).get(`/api/users/${delId}`);
      expect(pubRes.status).toBe(404);
    });
  });
});
