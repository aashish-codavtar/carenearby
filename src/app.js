require('dotenv').config();

const express     = require('express');
const mongoose    = require('mongoose');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const authRoutes      = require('./routes/auth');
const customerRoutes  = require('./routes/customer');
const pswRoutes       = require('./routes/psw');
const adminRoutes     = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const documentRoutes  = require('./routes/documents');

const app = express();

// Trust Railway / Vercel / nginx proxy — required for express-rate-limit to
// correctly read the client IP from X-Forwarded-For behind a reverse proxy.
app.set('trust proxy', 1);

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "https://unpkg.com"],   // admin panel uses inline onclick handlers; unpkg.com for Leaflet
      styleSrc:    ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc:      ["'self'", "data:", "https:", "blob:"],
      connectSrc:  ["'self'", "https:"],
      fontSrc:     ["'self'", "https:", "data:"],
      objectSrc:   ["'none'"],
    },
  },
}));

// CORS – allow requests from Expo Go (native fetch has no CORS restrictions, but
// this is needed for any web-based admin panel or Postman/browser testing).
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '15mb' })); // Allow base64 document uploads

// Prevent browsers from caching API responses (avoids stale auth/booking data)
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '../admin/index.html')));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Tight limit on auth endpoints to prevent OTP brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,              // 20 requests per IP per window
  message:  { error: 'Too many requests. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max:      120,         // 120 requests per IP per minute
  message:  { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use('/auth', authLimiter);
app.use('/',     apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',      authRoutes);
app.use('/jobs',      pswRoutes);          // PSW job actions (/jobs/nearby, /jobs/:id/*)
app.use('/admin',     adminRoutes);        // Admin panel (protected)
app.use('/admin',     adminAuthRoutes);     // Admin auth (/admin/login, /admin/logout)
app.use('/documents', documentRoutes);      // Document upload & management
app.use('/',          customerRoutes);     // /bookings, /ratings

// Health check (used by Docker / load balancer / nginx)
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'carenearby-api' }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Database + Boot ───────────────────────────────────────────────────────────
const PORT        = process.env.PORT        || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carenearby';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✔ MongoDB connected');
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`✔ CareNearby API listening on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('✘ MongoDB connection failed:', err.message);
    process.exit(1);
  });
