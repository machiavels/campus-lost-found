const router   = require('express').Router();
const ctrl     = require('../controllers/item.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth.middleware');
const upload   = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { createItemSchema, updateItemSchema } = require('../middleware/validators/item.validator');

/**
 * @openapi
 * tags:
 *   - name: Items
 *     description: Lost & found items — create, list, update, delete
 */

/**
 * @openapi
 * /items:
 *   get:
 *     tags: [Items]
 *     summary: List active items (public, auth optional)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [LOST, FOUND] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACTIVE, CLAIMED, REJECTED] }
 *     responses:
 *       200:
 *         description: Paginated list of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Item' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get('/',    optionalAuthenticate, ctrl.listItems);

/**
 * @openapi
 * /items/{id}:
 *   get:
 *     tags: [Items]
 *     summary: Get a single item by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item: { $ref: '#/components/schemas/Item' }
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', optionalAuthenticate, ctrl.getItem);

/**
 * @openapi
 * /items:
 *   post:
 *     tags: [Items]
 *     summary: Create a new lost/found item
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, type]
 *             properties:
 *               title:       { type: string, example: 'Blue backpack' }
 *               description: { type: string, example: 'Found near the library' }
 *               type:        { type: string, enum: [LOST, FOUND] }
 *               categoryId:  { type: integer, example: 1 }
 *               locationId:  { type: integer, example: 3 }
 *               photos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Item created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item: { $ref: '#/components/schemas/Item' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/',
  authenticate,
  upload.array('photos', 5),
  validate(createItemSchema),
  ctrl.createItem
);

/**
 * @openapi
 * /items/{id}:
 *   put:
 *     tags: [Items]
 *     summary: Update an item (owner or admin)
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
 *               title:       { type: string }
 *               description: { type: string }
 *               categoryId:  { type: integer }
 *               locationId:  { type: integer }
 *     responses:
 *       200:
 *         description: Updated item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item: { $ref: '#/components/schemas/Item' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/:id',
  authenticate,
  validate(updateItemSchema),
  ctrl.updateItem
);

/**
 * @openapi
 * /items/{id}:
 *   delete:
 *     tags: [Items]
 *     summary: Delete an item (owner or admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Item deleted
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id',      authenticate, ctrl.deleteItem);

/**
 * @openapi
 * /items/{id}/close:
 *   patch:
 *     tags: [Items]
 *     summary: Close an item (mark as CLAIMED by owner)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Item closed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 item: { $ref: '#/components/schemas/Item' }
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id/close', authenticate, ctrl.closeItem);

// Photos sub-routes
const photoRoutes = require('./photo.routes');
router.use('/', photoRoutes);

module.exports = router;
