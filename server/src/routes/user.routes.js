const router   = require('express').Router();
const ctrl     = require('../controllers/user.controller');
const { authenticate }       = require('../middleware/auth.middleware');
const { optionalAuthenticate } = require('../middleware/auth.middleware');
const validate               = require('../middleware/validate.middleware');
const { updateMeSchema, changePasswordSchema } = require('../middleware/validators/user.validator');

// ── Authenticated routes ──────────────────────────────────────────────────────────────

// GET  /api/users/me              — own full profile
router.get('/me',           authenticate, ctrl.getMe);

// PUT  /api/users/me              — update own profile (username, avatar, bio)
router.put('/me',           authenticate, validate(updateMeSchema), ctrl.updateMe);

// PATCH /api/users/me/password    — change password (requires current password)
router.patch('/me/password', authenticate, validate(changePasswordSchema), ctrl.changePassword);

// DELETE /api/users/me            — anonymise / RGPD account deletion
router.delete('/me',        authenticate, ctrl.deleteMe);

// ── Backward compat ────────────────────────────────────────────────────────────────────

// GET  /api/users/profile         — alias → /me (kept for backward compat)
router.get('/profile',      authenticate, ctrl.getMe);

// PUT  /api/users/profile         — alias → /me (kept for backward compat)
router.put('/profile',      authenticate, validate(updateMeSchema), ctrl.updateMe);

// ── Public routes ──────────────────────────────────────────────────────────────────────

// GET  /api/users/:id             — public profile (no email, no passwordHash)
// MUST be declared after /me and /profile to avoid route collision
router.get('/:id',          ctrl.getPublicProfile);

module.exports = router;
