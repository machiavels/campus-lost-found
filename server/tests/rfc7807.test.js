const request = require('supertest');
const express = require('express');
const { errorHandler, createError, catchAsync } = require('../src/middleware/error.middleware');

// Build a minimal Express app that only mounts errorHandler
function makeApp(...handlers) {
  const app = express();
  handlers.forEach(h => app.get('/test-error', h));
  app.use(errorHandler);
  return app;
}

describe('RFC 7807 — errorHandler', () => {
  it('returns application/problem+json content-type', async () => {
    const app = makeApp((_req, _res, next) => next(createError(404, 'Resource not found')));
    const res = await request(app).get('/test-error');
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
  });

  it('returns correct RFC 7807 shape for a 404', async () => {
    const app = makeApp((_req, _res, next) => next(createError(404, 'Item not found')));
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('type');
    expect(res.body).toHaveProperty('title', 'Not Found');
    expect(res.body).toHaveProperty('status', 404);
    expect(res.body).toHaveProperty('detail', 'Item not found');
    expect(res.body).toHaveProperty('instance', '/test-error');
  });

  it('returns correct RFC 7807 shape for a 422', async () => {
    const app = makeApp((_req, _res, next) => next(createError(422, 'Validation failed')));
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(422);
    expect(res.body.title).toBe('Unprocessable Entity');
    expect(res.body.detail).toBe('Validation failed');
  });

  it('returns 500 for unhandled errors', async () => {
    const app = makeApp((_req, _res, next) => next(new Error('Something blew up')));
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(500);
    expect(res.body.title).toBe('Internal Server Error');
    expect(res.body.status).toBe(500);
    expect(res.body).toHaveProperty('instance');
  });

  it('respects custom type URI', async () => {
    const app = makeApp((_req, _res, next) =>
      next(createError(409, 'Duplicate entry', 'https://campus-lost-found.isep.fr/errors/conflict'))
    );
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(409);
    expect(res.body.type).toBe('https://campus-lost-found.isep.fr/errors/conflict');
  });

  it('defaults type to about:blank when not specified', async () => {
    const app = makeApp((_req, _res, next) => next(createError(403, 'Forbidden')));
    const res = await request(app).get('/test-error');
    expect(res.body.type).toBe('about:blank');
  });
});

describe('RFC 7807 — createError helper', () => {
  it('creates an Error with statusCode, detail and type', () => {
    const err = createError(404, 'Not found', 'about:blank');
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.detail).toBe('Not found');
    expect(err.type).toBe('about:blank');
  });

  it('defaults type to about:blank', () => {
    const err = createError(500, 'Server error');
    expect(err.type).toBe('about:blank');
  });
});

describe('RFC 7807 — catchAsync', () => {
  it('forwards async errors to next()', async () => {
    const app = makeApp(
      catchAsync(async (_req, _res) => {
        throw createError(503, 'Service unavailable');
      })
    );
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(503);
    expect(res.body.detail).toBe('Service unavailable');
  });
});
