// ============================================
// KAARUNYA — Price Comparison Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/price-compare — get all price comparisons grouped by product
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const rows = (await db.query(`
            SELECT * FROM price_comparisons ORDER BY product_name, price ASC
        `))[0];

        // Group by product
        const grouped = {};
        for (const row of rows) {
            if (!grouped[row.product_name]) {
                grouped[row.product_name] = [];
            }
            grouped[row.product_name].push({
                id: row.id,
                supplier: row.supplier_name,
                price: row.price,
                best: row.is_best === 1,
                lastUpdated: row.last_updated,
            });
        }

        res.json({ data: grouped });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/price-compare/flat — flat list for table view
router.get('/flat', async (req, res) => {
    try {
        const db = await getDb();
        const rows = (await db.query(`
            SELECT * FROM price_comparisons ORDER BY product_name, price ASC
        `))[0];

        // Calculate average per product
        const averages = {};
        for (const r of rows) {
            if (!averages[r.product_name]) averages[r.product_name] = { total: 0, count: 0 };
            averages[r.product_name].total += r.price;
            averages[r.product_name].count++;
        }

        const data = rows.map(r => {
            const avg = averages[r.product_name].total / averages[r.product_name].count;
            return {
                ...r,
                best: r.is_best === 1,
                avgPrice: Math.round(avg),
                savings: Math.round(avg - r.price),
                savingsPercent: ((avg - r.price) / avg * 100).toFixed(1),
            };
        });

        res.json({ data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/price-compare — add a price comparison entry
router.post('/', async (req, res) => {
    try {
        const db = await getDb();
        const { productName, supplierName, price, isBest } = req.body;

        if (!productName || !supplierName || price == null) {
            return res.status(400).json({ error: 'Product name, supplier name, and price are required.' });
        }

        // If marking as best, unmark existing best for this product
        if (isBest) {
            await db.execute('UPDATE price_comparisons SET is_best = 0 WHERE product_name = ?', [productName]);
        }

        const [result] = await db.execute(`
            INSERT INTO price_comparisons (product_name, supplier_name, price, is_best)
            VALUES (?, ?, ?, ?)
        `, [productName, supplierName, price, isBest ? 1 : 0]);

        res.status(201).json({
            message: 'Price comparison added.',
            id: result.insertId,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/price-compare/:id — update price
router.put('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { price, isBest } = req.body;

        const existing = (await db.query('SELECT * FROM price_comparisons WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'Entry not found.' });

        if (isBest) {
            await db.execute('UPDATE price_comparisons SET is_best = 0 WHERE product_name = ?', [existing.product_name]);
        }

        await db.execute(`
            UPDATE price_comparisons SET
                price = COALESCE(?, price),
                is_best = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [price, isBest ? 1 : 0, req.params.id]);

        res.json({ message: 'Price comparison updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/price-compare/:id
router.delete('/:id', async (req, res) => {
    try {
        const db = await getDb();
        (await db.execute('DELETE FROM price_comparisons WHERE id = ?', [req.params.id]));
        res.json({ message: 'Price comparison deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
