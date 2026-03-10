// ============================================
// KAARUNYA — Reports Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/reports/monthly-purchases — monthly purchase data for charts
router.get('/monthly-purchases', (req, res) => {
    try {
        const db = getDb();
        const { months } = req.query;
        const limit = parseInt(months) || 12;

        const data = db.prepare(`
            SELECT month, year, amount, order_count
            FROM monthly_purchases
            ORDER BY year ASC, 
                CASE month 
                    WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3
                    WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
                    WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9
                    WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
                END ASC
        `).all();

        // Take last N records
        const sliced = data.slice(-limit);

        res.json({
            labels: sliced.map(d => d.month),
            amounts: sliced.map(d => d.amount),
            counts: sliced.map(d => d.order_count),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/stock-by-category
router.get('/stock-by-category', (req, res) => {
    try {
        const db = getDb();
        const data = db.prepare(`
            SELECT category, SUM(stock) as total_stock FROM products GROUP BY category
        `).all();

        res.json({
            labels: data.map(d => d.category),
            values: data.map(d => d.total_stock),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/fabric-distribution
router.get('/fabric-distribution', (req, res) => {
    try {
        const db = getDb();
        const data = db.prepare(`
            SELECT fabric, SUM(stock) as total_stock FROM products GROUP BY fabric
        `).all();

        res.json({
            labels: data.map(d => d.fabric),
            values: data.map(d => d.total_stock),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/supplier-volume
router.get('/supplier-volume', (req, res) => {
    try {
        const db = getDb();
        const data = db.prepare(`
            SELECT s.name, SUM(po.total) as total_volume, COUNT(po.id) as order_count
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            GROUP BY po.supplier_id
            ORDER BY total_volume DESC
        `).all();

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/category-value
router.get('/category-value', (req, res) => {
    try {
        const db = getDb();
        const data = db.prepare(`
            SELECT category, SUM(stock * price) as inventory_value
            FROM products
            GROUP BY category
        `).all();

        res.json({
            labels: data.map(d => d.category),
            values: data.map(d => d.inventory_value),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/supplier-performance
router.get('/supplier-performance', (req, res) => {
    try {
        const db = getDb();
        const data = db.prepare(`
            SELECT
                s.name,
                COUNT(po.id) as total_orders,
                SUM(po.total) as total_value,
                ROUND(AVG(po.total)) as avg_order_value,
                SUM(CASE WHEN po.status = 'Delivered' THEN 1 ELSE 0 END) as delivered_count,
                ROUND(
                    CAST(SUM(CASE WHEN po.status = 'Delivered' THEN 1 ELSE 0 END) AS FLOAT) /
                    NULLIF(COUNT(po.id), 0) * 100
                ) as on_time_percent
            FROM suppliers s
            LEFT JOIN purchase_orders po ON s.id = po.supplier_id
            WHERE po.id IS NOT NULL
            GROUP BY s.id
            ORDER BY total_value DESC
        `).all();

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/kpis — key performance indicators
router.get('/kpis', (req, res) => {
    try {
        const db = getDb();

        const totalPurchase = db.prepare('SELECT SUM(amount) as value FROM monthly_purchases').get().value || 0;
        const stockValue = db.prepare('SELECT SUM(stock * price) as value FROM products').get().value || 0;
        const avgOrderValue = db.prepare('SELECT ROUND(AVG(total)) as value FROM purchase_orders').get().value || 0;
        const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock').get().count;
        const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const activeSuppliers = db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE status = 'Active'").get().count;

        res.json({
            totalPurchase,
            stockValue,
            avgOrderValue,
            lowStockCount,
            totalProducts,
            activeSuppliers,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
