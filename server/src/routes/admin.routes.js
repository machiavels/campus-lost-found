const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.use(authenticate, requireRole('ADMIN'));

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Admin-only — moderation, user management, categories & locations
 */

/**
 * @openapi
 * /admin/items:
 *   get:
 *     tags: [Admin]
 *     summary: List items pending moderation
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Item' }
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/items',                    ctrl.listPendingItems);

/**
 * @openapi
 * /admin/items/{id}/moderate:
 *   patch:
 *     tags: [Admin]
 *     summary: Moderate an item (approve/reject)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [APPROVED, REJECTED] }
 *               reason: { type: string, example: 'Inappropriate content' }
 *     responses:
 *       200:
 *         description: Item moderated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item: { $ref: '#/components/schemas/Item' }
 */
router.patch('/items/:id/moderate',     ctrl.moderateItem);
router.patch('/items/:id/verify',       ctrl.verifyItem);   // legacy
router.patch('/items/:id/reject',       ctrl.rejectItem);   // legacy

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 */
router.get('/users',                    ctrl.listUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get full user detail
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full user detail (includes email)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 */
router.get('/users/:id',                ctrl.getUserDetail);

/**
 * @openapi
 * /admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               role:     { type: string, enum: [USER, ADMIN] }
 *               status:   { type: string, enum: [ACTIVE, SUSPENDED] }
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 */
router.put('/users/:id',                ctrl.updateUser);

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Set user status (active/suspended)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, SUSPENDED] }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/users/:id/status',       ctrl.setUserStatus);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Change user role
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, ADMIN] }
 *     responses:
 *       200:
 *         description: Role updated
 */
router.patch('/users/:id/role',         ctrl.changeUserRole);
router.patch('/users/:id/toggle',       ctrl.toggleUserStatus); // legacy

/**
 * @openapi
 * /admin/categories:
 *   get:
 *     tags: [Admin]
 *     summary: List all categories (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Category' }
 *   post:
 *     tags: [Admin]
 *     summary: Create a category
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'Electronics' }
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Category' }
 */
router.get('/categories',               ctrl.listCategories);
router.post('/categories',              ctrl.createCategory);

/**
 * @openapi
 * /admin/categories/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a category
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Category' }
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a category
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Category deleted
 */
router.put('/categories/:id',           ctrl.updateCategory);
router.delete('/categories/:id',        ctrl.deleteCategory);

/**
 * @openapi
 * /admin/locations:
 *   get:
 *     tags: [Admin]
 *     summary: List all locations (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Location' }
 *   post:
 *     tags: [Admin]
 *     summary: Create a location
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'Library' }
 *     responses:
 *       201:
 *         description: Location created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Location' }
 */
router.get('/locations',                ctrl.listLocations);
router.post('/locations',               ctrl.createLocation);

/**
 * @openapi
 * /admin/locations/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a location
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Location updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Location' }
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a location
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Location deleted
 */
router.put('/locations/:id',            ctrl.updateLocation);
router.delete('/locations/:id',         ctrl.deleteLocation);

module.exports = router;
