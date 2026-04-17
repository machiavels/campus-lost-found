require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const itemRoutes         = require('./routes/item.routes');
const messageRoutes      = require('./routes/message.routes');
const claimRoutes        = require('./routes/claim.routes');
const adminRoutes        = require('./routes/admin.routes');
const searchRoutes       = require('./routes/search.routes');
const referenceRoutes    = require('./routes/reference.routes');      // issue #8 — public GET
const notificationRoutes = require('./routes/notification.routes');   // issue #10 — in-app notifications
const { errorHandler }   = require('./middleware/error.middleware');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    // X-Frame-Options: DENY — empêche le clickjacking total
    frameguard: { action: 'deny' },
    // X-Content-Type-Options: nosniff — empêche le MIME sniffing
    noSniff: true,
    // Content-Security-Policy adapté à une API REST pure (pas de rendu HTML)
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'none'"],
        scriptSrc:   ["'none'"],
        styleSrc:    ["'none'"],
        imgSrc:      ["'none'"],
        connectSrc:  ["'self'"],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
        baseUri:     ["'none'"],
        formAction:  ["'none'"],
      },
    },
    // Strict-Transport-Security — force HTTPS (1 an, inclure sous-domaines)
    hsts: {
      maxAge:            31_536_000,
      includeSubDomains: true,
      preload:           true,
    },
    // Masquer la signature Express
    hidePoweredBy: true,
  })
);

// ── No-cache pour toutes les réponses API ─────────────────────────────────────
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ── CORS — origines autorisées depuis .env uniquement ─────────────────────────
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les appels sans origin (ex : curl, Postman, tests supertest)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // callback(null, false) => 403 silencieux, sans polluer errorHandler/logs
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/items',         itemRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/claims',        claimRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/search',        searchRoutes);        // GET /api/search — issue #5
app.use('/api/notifications', notificationRoutes);  // GET|PATCH /api/notifications — issue #10
app.use('/api',               referenceRoutes);     // GET /api/categories & /api/locations — issue #8

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server only when run directly (not when required by tests) ──────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
}

module.exports = app;
