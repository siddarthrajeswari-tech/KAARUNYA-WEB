// ============================================
// KAARUNYA — Dashboard Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/dashboard/summary — dashboard summary data
router.get('/summary', (req, res) => {
    try {
        const db = getDb();

        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const activeSuppliers = db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE status = 'Active'").get().count;
        const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Pending'").get().count;
        const lowStockItems = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock').get().count;

        res.json({
            totalProducts,
            activeSuppliers,
            pendingOrders,
            lowStockItems,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/activity — recent activity
router.get('/activity', (req, res) => {
    try {
        const db = getDb();
        const limit = parseInt(req.query.limit) || 10;

        const activities = db.prepare(`
            SELECT * FROM activity_log
            ORDER BY created_at DESC
            LIMIT ?
        `).all(limit);

        res.json({ data: activities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/top-products — top products by stock value
router.get('/top-products', (req, res) => {
    try {
        const db = getDb();
        const products = db.prepare(`
            SELECT p.*, s.name as supplier_name,
                   CASE
                       WHEN p.stock <= 0 THEN 'Out of Stock'
                       WHEN p.stock <= p.min_stock THEN 'Low Stock'
                       ELSE 'In Stock'
                   END as status
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            ORDER BY (p.stock * p.price) DESC
            LIMIT 10
        `).all();

        res.json({ data: products });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
