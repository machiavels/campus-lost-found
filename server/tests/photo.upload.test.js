/**
 * photo.upload.test.js
 *
 * Integration tests for #24 — Real MIME validation on file upload.
 *
 * Strategy: we use supertest's .attach() to upload in-memory buffers
 * crafted with real magic bytes (JPEG: FF D8 FF) or fake ones (à0x00...).
 * No real files on disk are required.
 */

const request = require('supertest');
const path    = require('path');
const fs      = require('fs');
const app     = require('../src/app');
const { registerAndLogin } = require('./helpers');
const { detectMime }       = require('../src/middleware/mimeValidator.middleware');
const os      = require('os');

const UPLOADER_EMAIL = 'photo_uploader@eleve.isep.fr';
const PASSWORD       = 'TestPass123!';

// ── Minimal valid magic-byte buffers ─────────────────────────────────────────
// Real JPEG header: FF D8 FF E0 + 508 zero-padding (Multer needs > 0 bytes)
const JPEG_MAGIC = Buffer.concat([
  Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
  Buffer.alloc(508),
]);

// Real PNG header: 89 50 4E 47 0D 0A 1A 0A + padding
const PNG_MAGIC = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  Buffer.alloc(504),
]);

// Fake file: starts with PHP tag bytes — not an image
const FAKE_PHP = Buffer.from('<?php echo shell_exec($_GET[\'cmd\']); ?>');

// ── detectMime unit tests ──────────────────────────────────────────────────
describe('detectMime() unit', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mime-test-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeTmp(name, buf) {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, buf);
    return p;
  }

  it('detects image/jpeg from magic bytes', () => {
    const p = writeTmp('test.jpg', JPEG_MAGIC);
    expect(detectMime(p)).toBe('image/jpeg');
  });

  it('detects image/png from magic bytes', () => {
    const p = writeTmp('test.png', PNG_MAGIC);
    expect(detectMime(p)).toBe('image/png');
  });

  it('returns null for a fake PHP file', () => {
    const p = writeTmp('evil.jpg', FAKE_PHP);
    expect(detectMime(p)).toBeNull();
  });

  it('returns null for an empty file', () => {
    const p = writeTmp('empty.jpg', Buffer.alloc(0));
    expect(detectMime(p)).toBeNull();
  });
});

// ── Integration tests via HTTP ───────────────────────────────────────────────
describe('POST /api/items/:id/photos — MIME validation', () => {
  let token;
  let itemId;

  beforeAll(async () => {
    ({ token } = await registerAndLogin(UPLOADER_EMAIL, PASSWORD));

    // Create an item to attach photos to
    const itemRes = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name:        'MIME Test Item',
        description: 'Item used to test MIME validation',
        type:        'LOST',
        locationId:  1,
        categoryId:  1,
      });

    itemId = itemRes.body?.item?.id ?? itemRes.body?.id;
  });

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/items/some-id/photos')
      .attach('photos', JPEG_MAGIC, { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('accepts a real JPEG (valid magic bytes)', async () => {
    if (!itemId) return;

    const res = await request(app)
      .post(`/api/items/${itemId}/photos`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', JPEG_MAGIC, { filename: 'real.jpg', contentType: 'image/jpeg' });

    // 201 created or 400 if item not VERIFIED (depends on seed state) —
    // either way it must NOT be 400 due to MIME rejection
    if (res.status === 400) {
      // make sure rejection is about photo count or item state, not MIME
      expect(res.body.error).not.toMatch(/Invalid file type/);
    } else {
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('photos');
    }
  });

  it('rejects a fake PHP file renamed to .jpg → 400 with error message', async () => {
    if (!itemId) return;

    const res = await request(app)
      .post(`/api/items/${itemId}/photos`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', FAKE_PHP, { filename: 'evil.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid file type');
    expect(res.body).toHaveProperty('rejected');
    expect(res.body.rejected).toContain('evil.jpg');
  });

  it('no invalid file persists on disk after rejection', async () => {
    if (!itemId) return;

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    // Snapshot filenames before
    const before = fs.existsSync(uploadsDir)
      ? new Set(fs.readdirSync(uploadsDir))
      : new Set();

    await request(app)
      .post(`/api/items/${itemId}/photos`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', FAKE_PHP, { filename: 'persist-test.jpg', contentType: 'image/jpeg' });

    const after = fs.existsSync(uploadsDir)
      ? new Set(fs.readdirSync(uploadsDir))
      : new Set();

    // No new file should have appeared
    const newFiles = [...after].filter((f) => !before.has(f));
    expect(newFiles).toHaveLength(0);
  });

  it('returns 400 when no file is provided', async () => {
    if (!itemId) return;

    const res = await request(app)
      .post(`/api/items/${itemId}/photos`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
