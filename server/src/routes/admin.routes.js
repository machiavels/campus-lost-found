const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// All admin routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// ── Items moderation ──────────────────────────────────────────────────────────
router.get('/items',                    ctrl.listPendingItems);   // GET    /api/admin/items
router.patch('/items/:id/moderate',     ctrl.moderateItem);       // PATCH  /api/admin/items/:id/moderate
router.patch('/items/:id/verify',       ctrl.verifyItem);         // PATCH  /api/admin/items/:id/verify  (legacy)
router.patch('/items/:id/reject',       ctrl.rejectItem);         // PATCH  /api/admin/items/:id/reject  (legacy)

// ── Users management ─────────────────────────────────────────────────────────
router.get('/users',                    ctrl.listUsers);          // GET    /api/admin/users
router.get('/users/:id',                ctrl.getUserDetail);      // GET    /api/admin/users/:id
router.put('/users/:id',                ctrl.updateUser);         // PUT    /api/admin/users/:id
router.patch('/users/:id/status',       ctrl.setUserStatus);      // PATCH  /api/admin/users/:id/status
router.patch('/users/:id/role',         ctrl.changeUserRole);     // PATCH  /api/admin/users/:id/role
router.patch('/users/:id/toggle',       ctrl.toggleUserStatus);   // PATCH  /api/admin/users/:id/toggle (legacy)

// ── Categories management ─────────────────────────────────────────────────────
router.get('/categories',               ctrl.listCategories);     // GET    /api/admin/categories
router.post('/categories',              ctrl.createCategory);     // POST   /api/admin/categories
router.put('/categories/:id',           ctrl.updateCategory);     // PUT    /api/admin/categories/:id
router.delete('/categories/:id',        ctrl.deleteCategory);     // DELETE /api/admin/categories/:id

// ── Locations management ──────────────────────────────────────────────────────
router.get('/locations',                ctrl.listLocations);      // GET    /api/admin/locations
router.post('/locations',               ctrl.createLocation);     // POST   /api/admin/locations
router.put('/locations/:id',            ctrl.updateLocation);     // PUT    /api/admin/locations/:id
router.delete('/locations/:id',         ctrl.deleteLocation);     // DELETE /api/admin/locations/:id

module.exports = router;
