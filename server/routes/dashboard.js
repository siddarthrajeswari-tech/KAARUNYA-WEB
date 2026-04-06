// ============================================
// KAARUNYA — Dashboard Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/dashboard/summary — dashboard summary data
router.get('/summary', async (req, res) => {
    try {
        const db = await getDb();

        const [[{ count: totalProducts }]] = await db.query('SELECT COUNT(*) as count FROM products');
        const [[{ count: activeSuppliers }]] = await db.query("SELECT COUNT(*) as count FROM suppliers WHERE status = 'Active'");
        const [[{ count: pendingOrders }]] = await db.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Pending'");
        const [[{ count: lowStockItems }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock');

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
router.get('/activity', async (req, res) => {
    try {
        const db = await getDb();
        const limit = parseInt(req.query.limit) || 10;

        const activities = (await db.query(`
            SELECT * FROM activity_log
            ORDER BY created_at DESC
            LIMIT ?
        `, [limit]))[0];

        res.json({ data: activities });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/top-products — top products by stock value
router.get('/top-products', async (req, res) => {
    try {
        const db = await getDb();
        const [products] = await db.query(`
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
        `);

        res.json({ data: products });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/settings — get shop settings
router.get('/settings', async (req, res) => {
    try {
        const db = await getDb();
        const settings = (await db.query('SELECT * FROM settings'))[0];
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
router.post('/settings', async (req, res) => {
    try {
        const db = await getDb();
        const conn = await db.getConnection();
        const payload = req.body;
        
        try {
            await conn.beginTransaction();
            for (const [key, value] of Object.entries(payload)) {
                await conn.execute(`
                    INSERT INTO settings (\`key\`, value, updated_at) 
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
                `, [key, typeof value === 'object' ? JSON.stringify(value) : value]);
            }
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/export — export database as JSON
router.get('/export', async (req, res) => {
    try {
        const db = await getDb();
        const exportData = {};
        
        const tables = [
            'users', 'suppliers', 'products', 'purchase_orders', 
            'purchase_order_items', 'price_comparisons', 'monthly_purchases',
            'settings', 'activity_log'
        ];

        for (const table of tables) {
            exportData[table] = (await db.query(`SELECT * FROM ${table}`))[0];
        }

        res.json(exportData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/dashboard/reset — wipe non-user data
router.post('/reset', async (req, res) => {
    try {
        if (req.session?.user?.role !== 'admin' && req.session?.user?.role !== 'manager') {
            return res.status(403).json({ error: 'Permission denied. Admin/Manager role required.' });
        }

        const db = await getDb();
        const conn = await db.getConnection();

        await conn.beginTransaction();
        try {
            await conn.execute('SET FOREIGN_KEY_CHECKS=0');
            await conn.execute('TRUNCATE TABLE purchase_order_items');
            await conn.execute('TRUNCATE TABLE purchase_orders');
            await conn.execute('TRUNCATE TABLE products');
            await conn.execute('TRUNCATE TABLE suppliers');
            await conn.execute('TRUNCATE TABLE price_comparisons');
            await conn.execute('TRUNCATE TABLE monthly_purchases');
            await conn.execute('TRUNCATE TABLE activity_log');
            await conn.execute('SET FOREIGN_KEY_CHECKS=1');
            await conn.commit();
        } catch(e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }

        res.json({ message: 'Database reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
