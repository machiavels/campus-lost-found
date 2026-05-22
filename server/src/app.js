require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const path         = require('path');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const itemRoutes         = require('./routes/item.routes');
const messageRoutes      = require('./routes/message.routes');
const claimRoutes        = require('./routes/claim.routes');
const adminRoutes        = require('./routes/admin.routes');
const searchRoutes       = require('./routes/search.routes');
const referenceRoutes    = require('./routes/reference.routes');      // issue #8 — public GET
const notificationRoutes = require('./routes/notification.routes');   // issue #10 — in-app notifications
const photoRoutes        = require('./routes/photo.routes');           // issue #24 — photo upload
const { errorHandler }   = require('./middleware/error.middleware');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter.middleware'); // issue #21

const app = express();

// ── Swagger UI — development only (issue #33) ────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi   = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');

  // Relax CSP only for /api/docs so Swagger UI assets load correctly
  app.use(
    '/api/docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'", "'unsafe-inline'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", 'data:', 'https://validator.swagger.io'],
          connectSrc: ["'self'"],
        },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Campus Lost & Found — API Docs',
      swaggerOptions:  { persistAuthorization: true },
    })
  );

  // Expose raw OpenAPI JSON
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// ── Security headers ─────────────────────────────────────────────────────────────
app.use(
  helmet({
    frameguard: { action: 'deny' },
    noSniff: true,
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
    hsts: {
      maxAge:            31_536_000,
      includeSubDomains: true,
      preload:           true,
    },
    hidePoweredBy: true,
  })
);

// ── Rate limiting ──────────────────────────────────────────────────────────────
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ── No-cache pour toutes les réponses API ─────────────────────────────────────────────
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ── CORS — origines autorisées depuis .env uniquement ───────────────────────────────
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Cookie parser (requis pour refresh token) ─────────────────────────────────────────
app.use(cookieParser());

// ── Body parsing ────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ───────────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/items',         itemRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/claims',        claimRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api',               photoRoutes);           // /api/items/:id/photos + /api/photos/:id
app.use('/api',               referenceRoutes);

// ── Health check ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server only when run directly (not when required by tests) ──────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`\uD83D\uDE80  Server running on http://localhost:${PORT}`));
}

module.exports = app;
