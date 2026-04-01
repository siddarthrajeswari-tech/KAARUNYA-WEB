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

// GET /api/dashboard/settings — get shop settings
router.get('/settings', (req, res) => {
    try {
        const db = getDb();
        const settings = db.prepare('SELECT * FROM settings').all();
        const data = {};
        for (const row of settings) {
             try {
                 data[row.key] = JSON.parse(row.value);
             } catch(e) {
                 data[row.key] = row.value;
             }
        }
        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/settings — save shop settings
router.post('/settings', (req, res) => {
    try {
        const db = getDb();
        const payload = req.body;
        const stmt = db.prepare(`
            INSERT INTO settings (key, value, updated_at) 
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `);
        
        db.transaction(() => {
            for (const [key, value] of Object.entries(payload)) {
                stmt.run(key, typeof value === 'object' ? JSON.stringify(value) : value);
            }
        })();

        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/export — export database as JSON
router.get('/export', (req, res) => {
    try {
        const db = getDb();
        const exportData = {};
        
        const tables = [
            'users', 'suppliers', 'products', 'purchase_orders', 
            'purchase_order_items', 'price_comparisons', 'monthly_purchases',
            'settings', 'activity_log'
        ];

        for (const table of tables) {
            exportData[table] = db.prepare(`SELECT * FROM ${table}`).all();
        }

        res.json(exportData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/reset — wipe non-user data
router.post('/reset', (req, res) => {
    try {
        if (req.session?.user?.role !== 'admin' && req.session?.user?.role !== 'manager') {
            return res.status(403).json({ error: 'Permission denied. Admin/Manager role required.' });
        }

        const db = getDb();
        
        db.transaction(() => {
            db.prepare('DELETE FROM purchase_order_items').run();
            db.prepare('DELETE FROM purchase_orders').run();
            db.prepare('DELETE FROM products').run();
            db.prepare('DELETE FROM suppliers').run();
            db.prepare('DELETE FROM price_comparisons').run();
            db.prepare('DELETE FROM monthly_purchases').run();
            db.prepare('DELETE FROM activity_log').run();
            
            // Optionally, reset sqlite sequences
            db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('purchase_order_items', 'price_comparisons', 'monthly_purchases', 'activity_log')").run();
        })();

        res.json({ message: 'Database reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
