const request = require('supertest');
const app     = require('../src/app');

/**
 * Register a user and return { token, userId }
 *
 * The login endpoint returns { user: { id, ... }, accessToken }.
 * We expose it as `token` so all existing tests keep working without changes.
 */
async function registerAndLogin(email, password = 'TestPass123!') {
  const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

  await request(app)
    .post('/api/auth/register')
    .send({ email, password, username });
  // Ignore registration errors — user may already exist in repeated runs.

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return {
    token:  login.body.accessToken,   // was login.body.token (undefined)
    userId: login.body.user?.id,
  };
}

module.exports = { app, registerAndLogin };
