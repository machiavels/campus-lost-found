require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const itemRoutes      = require('./routes/item.routes');
const messageRoutes   = require('./routes/message.routes');
const claimRoutes     = require('./routes/claim.routes');
const adminRoutes     = require('./routes/admin.routes');
const searchRoutes    = require('./routes/search.routes');
const referenceRoutes = require('./routes/reference.routes');  // issue #8 — public GET
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/items',    itemRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/claims',   claimRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/search',   searchRoutes);    // GET /api/search — issue #5
app.use('/api',          referenceRoutes); // GET /api/categories & /api/locations — issue #8

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));

module.exports = app;
