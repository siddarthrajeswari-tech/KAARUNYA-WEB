// ============================================
// KAARUNYA — Supplier Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/suppliers — list all suppliers
router.get('/', (req, res) => {
    try {
        const db = getDb();
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

        const suppliers = db.prepare(sql).all(...params);
        res.json({ data: suppliers, total: suppliers.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/suppliers/:id — get single supplier
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

        // Also get products from this supplier
        const products = db.prepare('SELECT * FROM products WHERE supplier_id = ?').all(req.params.id);
        // And orders
        const orders = db.prepare('SELECT * FROM purchase_orders WHERE supplier_id = ? ORDER BY order_date DESC').all(req.params.id);

        res.json({ data: { ...supplier, products, orders } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/suppliers — create new supplier
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { name, address, phone, email, status } = req.body;

        if (!name) return res.status(400).json({ error: 'Supplier name is required.' });

        // Generate ID
        const last = db.prepare("SELECT id FROM suppliers ORDER BY id DESC LIMIT 1").get();
        let nextNum = 1;
        if (last) {
            nextNum = parseInt(last.id.split('-')[1]) + 1;
        }
        const id = 'SUP-' + String(nextNum).padStart(3, '0');

        db.prepare(`
            INSERT INTO suppliers (id, name, address, phone, email, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, name, address || '', phone || '', email || '', status || 'Active');

        // Log activity
        db.prepare(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('created', 'supplier', ?, ?)
        `).run(id, `New supplier added: ${name}`);

        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
        res.status(201).json({ message: 'Supplier created.', data: supplier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/suppliers/:id — update supplier
router.put('/:id', (req, res) => {
    try {
        const db = getDb();
        const { name, address, phone, email, status } = req.body;

        const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

        db.prepare(`
            UPDATE suppliers SET
                name = COALESCE(?, name),
                address = COALESCE(?, address),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                status = COALESCE(?, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name, address, phone, email, status, req.params.id);

        // Log activity
        db.prepare(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('updated', 'supplier', ?, ?)
        `).run(req.params.id, `Supplier ${name || existing.name} updated`);

        const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
        res.json({ message: 'Supplier updated.', data: supplier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/suppliers/:id — delete supplier
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

        // Check for related products
        const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?').get(req.params.id);
        if (productCount.count > 0) {
            return res.status(409).json({
                error: `Cannot delete supplier with ${productCount.count} associated products. Remove products first or reassign them.`
            });
        }

        db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);

        // Log activity
        db.prepare(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('deleted', 'supplier', ?, ?)
        `).run(req.params.id, `Supplier ${existing.name} deleted`);

        res.json({ message: 'Supplier deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
