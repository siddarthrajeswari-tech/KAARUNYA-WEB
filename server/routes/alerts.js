// ============================================
// KAARUNYA — Alerts Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/alerts — get low stock products
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const { severity, fabric } = req.query;

        let sql = `
            SELECT p.*, s.name as supplier_name,
                   (p.min_stock - p.stock) as deficit,
                   CASE WHEN p.stock <= 3 THEN 'critical' ELSE 'warning' END as severity
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.stock <= p.min_stock
        `;
        const params = [];

        if (severity === 'critical') {
            sql += ' AND p.stock <= 3';
        } else if (severity === 'warning') {
            sql += ' AND p.stock > 3';
        }
        if (fabric) {
            sql += ' AND p.fabric = ?';
            params.push(fabric);
        }

        sql += ' ORDER BY p.stock ASC';

        const alerts = (await db.query(sql, [...params]))[0];

        res.json({
            data: alerts,
            total: alerts.length,
            critical: alerts.filter(a => a.severity === 'critical').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/alerts/count — quick count for badges
router.get('/count', async (req, res) => {
    try {
        const db = await getDb();
        const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock');
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
