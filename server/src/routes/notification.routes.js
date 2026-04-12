const express = require('express');
const router  = express.Router();

const { authenticate } = require('../middleware/auth.middleware');
const {
  getNotifications,
  markAllRead,
  markOneRead,
} = require('../controllers/notification.controller');

// All notification routes require authentication
router.use(authenticate);

// GET  /api/notifications            — list all notifications for the current user
router.get('/',              getNotifications);

// PATCH /api/notifications/read-all  — mark all as read
router.patch('/read-all',    markAllRead);

// PATCH /api/notifications/:id/read  — mark one as read
router.patch('/:id/read',   markOneRead);

module.exports = router;
