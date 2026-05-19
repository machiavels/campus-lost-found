const router   = require('express').Router();
const { register, login, me, refresh, logout } = require('../controllers/auth.controller');
const { authenticate }        = require('../middleware/auth.middleware');
const validate                = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../services/auth.service');

// POST /api/auth/register — inscription avec email campus + mot de passe
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login — authentification, retour d'un access token + cookie refresh
router.post('/login', validate(loginSchema), login);

// POST /api/auth/refresh — rotation du refresh token, retour d'un nouvel access token
router.post('/refresh', refresh);

// POST /api/auth/logout — révocation du refresh token, vidage du cookie
router.post('/logout', logout);

// GET  /api/auth/me — profil de l'utilisateur connecté
router.get('/me', authenticate, me);

module.exports = router;
