// ============================================
// KAARUNYA — Reports Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/reports/monthly-purchases — monthly purchase data for charts
router.get('/monthly-purchases', async (req, res) => {
    try {
        const db = await getDb();
        const { months } = req.query;
        const limit = parseInt(months) || 12;

        const data = (await db.query(`
            SELECT month, year, amount, order_count
            FROM monthly_purchases
            ORDER BY year ASC, 
                CASE month 
                    WHEN 'Jan' THEN 1 WHEN 'Feb' THEN 2 WHEN 'Mar' THEN 3
                    WHEN 'Apr' THEN 4 WHEN 'May' THEN 5 WHEN 'Jun' THEN 6
                    WHEN 'Jul' THEN 7 WHEN 'Aug' THEN 8 WHEN 'Sep' THEN 9
                    WHEN 'Oct' THEN 10 WHEN 'Nov' THEN 11 WHEN 'Dec' THEN 12
                END ASC
        `))[0];

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
router.get('/stock-by-category', async (req, res) => {
    try {
        const db = await getDb();
        const [data] = await db.query(`
            SELECT category, SUM(stock) as total_stock FROM products GROUP BY category
        `);

        res.json({
            labels: data.map(d => d.category),
            values: data.map(d => d.total_stock),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/fabric-distribution
router.get('/fabric-distribution', async (req, res) => {
    try {
        const db = await getDb();
        const [data] = await db.query(`
            SELECT fabric, SUM(stock) as total_stock FROM products GROUP BY fabric
        `);

        res.json({
            labels: data.map(d => d.fabric),
            values: data.map(d => d.total_stock),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/supplier-volume
router.get('/supplier-volume', async (req, res) => {
    try {
        const db = await getDb();
        const [data] = await db.query(`
            SELECT s.name, SUM(po.total) as total_volume, COUNT(po.id) as order_count
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            GROUP BY po.supplier_id
            ORDER BY total_volume DESC
        `);

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/category-value
router.get('/category-value', async (req, res) => {
    try {
        const db = await getDb();
        const [data] = await db.query(`
            SELECT category, SUM(stock * price) as inventory_value
            FROM products
            GROUP BY category
        `);

        res.json({
            labels: data.map(d => d.category),
            values: data.map(d => d.inventory_value),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/supplier-performance
router.get('/supplier-performance', async (req, res) => {
    try {
        const db = await getDb();
        const [data] = await db.query(`
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
        `);

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/kpis — key performance indicators
router.get('/kpis', async (req, res) => {
    try {
        const db = await getDb();

        const [[{ value: totalPurchase }]] = await db.query('SELECT SUM(amount) as value FROM monthly_purchases');
        const [[{ value: stockValue }]] = await db.query('SELECT SUM(stock * price) as value FROM products');
        const [[{ value: avgOrderValue }]] = await db.query('SELECT ROUND(AVG(total)) as value FROM purchase_orders');
        const [[{ count: lowStockCount }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock');
        const [[{ count: totalProducts }]] = await db.query('SELECT COUNT(*) as count FROM products');
        const [[{ count: activeSuppliers }]] = await db.query("SELECT COUNT(*) as count FROM suppliers WHERE status = 'Active'");

        res.json({
            totalPurchase: totalPurchase || 0,
            stockValue: stockValue || 0,
            avgOrderValue: avgOrderValue || 0,
            lowStockCount: lowStockCount || 0,
            totalProducts: totalProducts || 0,
            activeSuppliers: activeSuppliers || 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
