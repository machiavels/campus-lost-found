const router   = require('express').Router();
const ctrl     = require('../controllers/item.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload   = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { createItemSchema, updateItemSchema } = require('../middleware/validators/item.validator');

// Public — search & read
router.get('/',    ctrl.listItems);   // GET  /api/items?keyword=&category=&location=&status=&type=&from=&to=
router.get('/:id', ctrl.getItem);     // GET  /api/items/:id

// Authenticated — create / update / delete
router.post('/',
  authenticate,
  upload.array('photos', 5),
  validate(createItemSchema),
  ctrl.createItem
);  // POST /api/items

router.put('/:id',
  authenticate,
  validate(updateItemSchema),
  ctrl.updateItem
);  // PUT  /api/items/:id

router.delete('/:id',      authenticate, ctrl.deleteItem);   // DELETE /api/items/:id

// Close (mark as CLAIMED by owner)
router.patch('/:id/close', authenticate, ctrl.closeItem);    // PATCH  /api/items/:id/close

module.exports = router;
