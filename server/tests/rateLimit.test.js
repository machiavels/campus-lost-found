/**
 * Tests du rate limiting — issue #21
 *
 * On instancie un sous-app Express avec des limiteurs à seuil très bas
 * pour déclencher le 429 de façon déterministe, indépendamment de NODE_ENV.
 */
const express   = require('express');
const request   = require('supertest');
const rateLimit = require('express-rate-limit');

/**
 * Crée un mini-app Express avec un limiteur configuré à `max` requêtes.
 */
function buildTestApp(max) {
  const app = express();
  const limiter = rateLimit({
    windowMs:        60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    handler: (_req, res) =>
      res.status(429).json({ error: 'Too Many Requests' }),
  });
  app.use(limiter);
  app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('Rate Limiter — comportement 429', () => {
  it('laisse passer les requêtes sous la limite', async () => {
    const app = buildTestApp(5);
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/ping');
      expect(res.status).toBe(200);
    }
  });

  it('retourne 429 dès que la limite est dépassée', async () => {
    const app = buildTestApp(3);
    // Épuiser la limite
    for (let i = 0; i < 3; i++) {
      await request(app).get('/ping');
    }
    // La requête suivante doit être bloquée
    const res = await request(app).get('/ping');
    expect(res.status).toBe(429);
    expect(res.body).toHaveProperty('error', 'Too Many Requests');
  });

  it('inclut les headers RateLimit-Limit et RateLimit-Remaining', async () => {
    const app = buildTestApp(10);
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  it('ne bloque jamais en NODE_ENV=test grâce au skip', async () => {
    // Le vrai app utilise skip: () => IS_TEST — on vérifie qu'aucun 429
    // n'est retourné même après 25 requêtes consécutives
    const { app: realApp } = require('./helpers');
    for (let i = 0; i < 25; i++) {
      const res = await request(realApp).get('/api/health');
      expect(res.status).toBe(200);
    }
  });
});
