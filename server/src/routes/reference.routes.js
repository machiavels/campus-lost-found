/**
 * Public reference routes — no authentication required
 * GET /api/categories   → list all categories
 * GET /api/locations    → list all locations
 */
const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');

router.get('/categories', ctrl.listCategories);   // GET /api/categories
router.get('/locations',  ctrl.listLocations);    // GET /api/locations

module.exports = router;
