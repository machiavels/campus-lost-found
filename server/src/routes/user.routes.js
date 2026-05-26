const router   = require('express').Router();
const ctrl     = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate               = require('../middleware/validate.middleware');
const { updateMeSchema, changePasswordSchema } = require('../middleware/validators/user.validator');

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User profile management
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get own full profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/me',           authenticate, ctrl.getMe);

/**
 * @openapi
 * /users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update own profile (username, avatar, bio)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: 'alice_new' }
 *               bio:      { type: string, example: 'Computer science student' }
 *     responses:
 *       200:
 *         description: Updated profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/me',           authenticate, validate(updateMeSchema), ctrl.updateMe);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change own password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword:     { type: string, format: password, minLength: 8 }
 *     responses:
 *       204:
 *         description: Password changed
 *       400:
 *         description: Validation error or wrong current password
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/me/password', authenticate, validate(changePasswordSchema), ctrl.changePassword);

/**
 * @openapi
 * /users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Delete (anonymise) own account — RGPD
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Account anonymised and deleted
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/me',        authenticate, ctrl.deleteMe);

// Backward compat aliases
router.get('/profile',      authenticate, ctrl.getMe);
router.put('/profile',      authenticate, validate(updateMeSchema), ctrl.updateMe);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's public profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Public profile (no email, no passwordHash)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id',          ctrl.getPublicProfile);

module.exports = router;
