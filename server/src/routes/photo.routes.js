const router   = require('express').Router();
const ctrl     = require('../controllers/photo.controller');
const { authenticate }  = require('../middleware/auth.middleware');
const upload            = require('../middleware/upload.middleware');
const { validateMime }  = require('../middleware/mimeValidator.middleware');

/**
 * @openapi
 * tags:
 *   - name: Photos
 *     description: Item photo upload and deletion
 */

/**
 * @openapi
 * /items/{id}/photos:
 *   post:
 *     tags: [Photos]
 *     summary: Upload photos for an item (max 5)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *                 description: JPEG, PNG or WebP files (max 5)
 *     responses:
 *       201:
 *         description: Photos uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 photos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:  { type: string, format: uuid }
 *                       url: { type: string, example: '/uploads/photo-uuid.jpg' }
 *       400:
 *         description: Invalid MIME type or too many files
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/items/:id/photos',
  authenticate,
  upload.array('photos', 5),
  validateMime,
  ctrl.uploadPhotos
);

/**
 * @openapi
 * /photos/{id}:
 *   delete:
 *     tags: [Photos]
 *     summary: Delete a specific photo
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Photo deleted
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Photo not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/photos/:id', authenticate, ctrl.deletePhoto);

module.exports = router;
