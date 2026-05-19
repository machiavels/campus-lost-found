/**
 * Unit tests — Issue #22 : Validation de l'email institutionnel au register
 *
 * Ces tests sont PUREMENT unitaires : ils importent directement
 * auth.service.js sans démarrer l'app ni toucher la BDD.
 */

const { registerSchema, validateEmailDomain } = require('../src/services/auth.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUFFIX   = Date.now();
const validPayload = (overrides = {}) => ({
  username: `user_${SUFFIX}`,
  email:    `student_${SUFFIX}@eleve.isep.fr`,
  password: 'SecurePass123!',
  ...overrides,
});

// ─── registerSchema ───────────────────────────────────────────────────────────

describe('registerSchema — email domain validation', () => {
  // ── Domaines autorisés ────────────────────────────────────────────────────

  it('accepts an @eleve.isep.fr email', async () => {
    const { error } = registerSchema.validate(
      validPayload({ email: `student_${SUFFIX}@eleve.isep.fr` }),
    );
    expect(error).toBeUndefined();
  });

  it('accepts an @isep.fr email', async () => {
    const { error } = registerSchema.validate(
      validPayload({ email: `prof_${SUFFIX}@isep.fr` }),
    );
    expect(error).toBeUndefined();
  });

  // ── Domaines non autorisés ────────────────────────────────────────────────

  it('rejects test@gmail.com with a domain error message', () => {
    const { error } = registerSchema.validate(
      validPayload({ email: 'test@gmail.com' }),
    );
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('email.domain');
  });

  it('rejects a generic @yahoo.fr email', () => {
    const { error } = registerSchema.validate(
      validPayload({ email: `hacker_${SUFFIX}@yahoo.fr` }),
    );
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('email.domain');
  });

  it('rejects a subdomain spoofing attempt (evil.isep.fr)', () => {
    const { error } = registerSchema.validate(
      validPayload({ email: `fake_${SUFFIX}@evil.isep.fr` }),
    );
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('email.domain');
  });

  it('rejects an email without a domain (malformed)', () => {
    const { error } = registerSchema.validate(
      validPayload({ email: 'notanemail' }),
    );
    expect(error).toBeDefined();
  });

  // ── Message d'erreur lisible ──────────────────────────────────────────────

  it('returns an explicit French error message for forbidden domain', () => {
    const { error } = registerSchema.validate(
      validPayload({ email: 'test@gmail.com' }),
    );
    expect(error.message).toMatch(/institutionnels|campus/i);
  });
});

// ─── validateEmailDomain ──────────────────────────────────────────────────────

describe('validateEmailDomain()', () => {
  it('does NOT throw for @eleve.isep.fr', () => {
    expect(() => validateEmailDomain('student@eleve.isep.fr')).not.toThrow();
  });

  it('does NOT throw for @isep.fr', () => {
    expect(() => validateEmailDomain('prof@isep.fr')).not.toThrow();
  });

  it('throws with statusCode 403 for @gmail.com', () => {
    let err;
    try { validateEmailDomain('hacker@gmail.com'); }
    catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  it('throws for a plausible-looking spoof (isep.fr.evil.com)', () => {
    let err;
    try { validateEmailDomain('fake@isep.fr.evil.com'); }
    catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  it('error message mentions allowed domains', () => {
    let err;
    try { validateEmailDomain('test@outlook.com'); }
    catch (e) { err = e; }
    expect(err.message).toMatch(/isep/i);
  });
});

// ─── ALLOWED_EMAIL_DOMAINS env var ────────────────────────────────────────────

describe('ALLOWED_EMAIL_DOMAINS env variable', () => {
  const ORIGINAL = process.env.ALLOWED_EMAIL_DOMAINS;

  afterEach(() => {
    // Restore original value (or delete it to use default)
    if (ORIGINAL === undefined) delete process.env.ALLOWED_EMAIL_DOMAINS;
    else process.env.ALLOWED_EMAIL_DOMAINS = ORIGINAL;
    // Bust require cache so the module re-reads process.env
    jest.resetModules();
  });

  it('picks up a custom domain set via env', () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'univ-test.fr,campus-test.edu';
    // Re-require the module after env change
    const { registerSchema: freshSchema } = require('../src/services/auth.service');

    const { error: okErr } = freshSchema.validate(
      validPayload({ email: `user_${SUFFIX}@univ-test.fr` }),
    );
    expect(okErr).toBeUndefined();

    const { error: koErr } = freshSchema.validate(
      validPayload({ email: `user_${SUFFIX}@eleve.isep.fr` }),
    );
    expect(koErr).toBeDefined(); // isep.fr is no longer allowed
  });

  it('falls back to eleve.isep.fr,isep.fr when env is unset', () => {
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    const { registerSchema: freshSchema } = require('../src/services/auth.service');

    const { error } = freshSchema.validate(
      validPayload({ email: `student_${SUFFIX}@eleve.isep.fr` }),
    );
    expect(error).toBeUndefined();
  });
});
