// ============================================
// KAARUNYA — Main Express Server
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const { initDatabase } = require('./server/db');
const authMiddleware = require('./server/middleware/auth');

// Import route modules
const authRoutes = require('./server/routes/auth');
const supplierRoutes = require('./server/routes/suppliers');
const productRoutes = require('./server/routes/products');
const orderRoutes = require('./server/routes/orders');
const alertRoutes = require('./server/routes/alerts');
const priceCompareRoutes = require('./server/routes/priceCompare');
const reportRoutes = require('./server/routes/reports');
const dashboardRoutes = require('./server/routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'kaarunya-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', authMiddleware.optionalAuth, supplierRoutes);
app.use('/api/products', authMiddleware.optionalAuth, productRoutes);
app.use('/api/orders', authMiddleware.optionalAuth, orderRoutes);
app.use('/api/alerts', authMiddleware.optionalAuth, alertRoutes);
app.use('/api/price-compare', authMiddleware.optionalAuth, priceCompareRoutes);
app.use('/api/reports', authMiddleware.optionalAuth, reportRoutes);
app.use('/api/dashboard', authMiddleware.optionalAuth, dashboardRoutes);

// ---- SPA Fallback — serve index.html for non-API routes ----
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ---- Initialize DB & Start Server ----
initDatabase();

app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   💎 Kaarunya Dress Shop Server         ║
    ║   Running on http://localhost:${PORT}      ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}          ║
    ╚══════════════════════════════════════════╝
    `);
});

module.exports = app;
