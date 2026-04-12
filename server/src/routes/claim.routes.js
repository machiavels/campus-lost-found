const router = require('express').Router();
const ctrl   = require('../controllers/claim.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate);

// POST /api/claims              — submit a claim request
router.post('/',                 ctrl.submitClaim);

// GET  /api/claims              — admin sees all, user sees own
router.get('/',                  ctrl.listClaims);

// GET  /api/claims/my           — user's own claims (alias)
router.get('/my',                ctrl.myClaims);

// PATCH /api/claims/:id/review  — admin approve or reject { action: 'APPROVED'|'REJECTED' }
router.patch('/:id/review',      requireRole('ADMIN'), ctrl.reviewClaim);

// Legacy individual approve/reject routes — kept for compatibility
router.patch('/:id/approve',     requireRole('ADMIN'), ctrl.approveClaim);
router.patch('/:id/reject',      requireRole('ADMIN'), ctrl.rejectClaim);

module.exports = router;
