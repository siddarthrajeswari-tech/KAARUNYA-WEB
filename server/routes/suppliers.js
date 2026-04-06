// ============================================
// KAARUNYA — Supplier Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/suppliers — list all suppliers
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const { search, status, sort, order } = req.query;

        let sql = 'SELECT * FROM suppliers WHERE 1=1';
        const params = [];

        if (search) {
            sql += ' AND (name LIKE ? OR email LIKE ? OR address LIKE ? OR id LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        // Sorting
        const validSorts = ['id', 'name', 'status', 'created_at'];
        const sortCol = validSorts.includes(sort) ? sort : 'id';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${sortCol} ${sortOrder}`;

        const suppliers = (await db.query(sql, [...params]))[0];
        res.json({ data: suppliers, total: suppliers.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/suppliers/:id — get single supplier
router.get('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const supplier = (await db.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]))[0][0];
        if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

        // Also get products from this supplier
        const products = (await db.query('SELECT * FROM products WHERE supplier_id = ?', [req.params.id]))[0];
        // And orders
        const orders = (await db.query('SELECT * FROM purchase_orders WHERE supplier_id = ? ORDER BY order_date DESC', [req.params.id]))[0];

        res.json({ data: { ...supplier, products, orders } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/suppliers — create new supplier
router.post('/', async (req, res) => {
    try {
        const db = await getDb();
        const { name, address, phone, email, status } = req.body;

        if (!name) return res.status(400).json({ error: 'Supplier name is required.' });

        // Generate ID
        const last = (await db.query("SELECT id FROM suppliers ORDER BY id DESC LIMIT 1"))[0][0];
        let nextNum = 1;
        if (last) {
            nextNum = parseInt(last.id.split('-')[1]) + 1;
        }
        const id = 'SUP-' + String(nextNum).padStart(3, '0');

        await db.execute(`
            INSERT INTO suppliers (id, name, address, phone, email, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, name, address || '', phone || '', email || '', status || 'Active']);

        // Log activity
        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('created', 'supplier', ?, ?)
        `, [id, `New supplier added: ${name}`]);

        const supplier = (await db.query('SELECT * FROM suppliers WHERE id = ?', [id]))[0][0];
        res.status(201).json({ message: 'Supplier created.', data: supplier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/suppliers/:id — update supplier
router.put('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { name, address, phone, email, status } = req.body;

        const existing = (await db.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

        await db.execute(`
            UPDATE suppliers SET
                name = COALESCE(?, name),
                address = COALESCE(?, address),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, address, phone, email, status, req.params.id]);

        // Log activity
        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('updated', 'supplier', ?, ?)
        `, [req.params.id, `Supplier ${existing.name} updated`]);

        const supplier = (await db.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]))[0][0];
        res.json({ message: 'Supplier updated.', data: supplier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/suppliers/:id — delete supplier
router.delete('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const existing = (await db.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

        // Check for related products
        const [[productCount]] = await db.query('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?', [req.params.id]);
        if (productCount.count > 0) {
            return res.status(409).json({
                error: `Cannot delete supplier with ${productCount.count} associated products. Remove products first or reassign them.`
            });
        }

        await db.execute('DELETE FROM suppliers WHERE id = ?', [req.params.id]);

        // Log activity
        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('deleted', 'supplier', ?, ?)
        `, [req.params.id, `Supplier ${existing.name} deleted`]);

        res.json({ message: 'Supplier deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
