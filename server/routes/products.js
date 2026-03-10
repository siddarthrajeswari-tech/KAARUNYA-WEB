// ============================================
// KAARUNYA — Product Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/products — list all products
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { search, category, fabric, stockStatus, sort, order } = req.query;

        let sql = `
            SELECT p.*, s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ' AND (p.name LIKE ? OR p.id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category) {
            sql += ' AND p.category = ?';
            params.push(category);
        }
        if (fabric) {
            sql += ' AND p.fabric = ?';
            params.push(fabric);
        }
        if (stockStatus === 'low') {
            sql += ' AND p.stock <= p.min_stock';
        } else if (stockStatus === 'in') {
            sql += ' AND p.stock > p.min_stock';
        } else if (stockStatus === 'out') {
            sql += ' AND p.stock = 0';
        }

        const validSorts = ['id', 'name', 'category', 'fabric', 'stock', 'price', 'created_at'];
        const sortCol = validSorts.includes(sort) ? `p.${sort}` : 'p.id';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
        sql += ` ORDER BY ${sortCol} ${sortOrder}`;

        const products = db.prepare(sql).all(...params);

        // Add computed status
        const data = products.map(p => ({
            ...p,
            status: p.stock <= 0 ? 'Out of Stock' : p.stock <= p.min_stock ? 'Low Stock' : 'In Stock',
            statusClass: p.stock <= 0 ? 'out-of-stock' : p.stock <= p.min_stock ? 'low-stock' : 'in-stock',
        }));

        res.json({ data, total: data.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/stats — product statistics
router.get('/stats', (req, res) => {
    try {
        const db = getDb();

        const total = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
        const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock').get().count;
        const outOfStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock = 0').get().count;

        const byCategory = db.prepare(`
            SELECT category, COUNT(*) as count, SUM(stock) as totalStock
            FROM products GROUP BY category
        `).all();

        const byFabric = db.prepare(`
            SELECT fabric, COUNT(*) as count, SUM(stock) as totalStock
            FROM products GROUP BY fabric
        `).all();

        const stockValue = db.prepare('SELECT SUM(stock * price) as value FROM products').get().value;

        res.json({
            total, lowStock, outOfStock,
            stockValue: stockValue || 0,
            byCategory, byFabric,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id — get single product
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const product = db.prepare(`
            SELECT p.*, s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?
        `).get(req.params.id);

        if (!product) return res.status(404).json({ error: 'Product not found.' });
        res.json({ data: product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products — create new product
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { name, category, fabric, stock, minStock, price, supplierId } = req.body;

        if (!name || !category || !fabric) {
            return res.status(400).json({ error: 'Name, category, and fabric are required.' });
        }

        // Generate ID
        const last = db.prepare("SELECT id FROM products ORDER BY id DESC LIMIT 1").get();
        let nextNum = 1;
        if (last) {
            nextNum = parseInt(last.id.split('-')[1]) + 1;
        }
        const id = 'PRD-' + String(nextNum).padStart(3, '0');

        db.prepare(`
            INSERT INTO products (id, name, category, fabric, stock, min_stock, price, supplier_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, name, category, fabric, stock || 0, minStock || 10, price || 0, supplierId || null);

        // Log activity
        db.prepare(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('created', 'product', ?, ?)
        `).run(id, `New product added: ${name}`);

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.status(201).json({ message: 'Product created.', data: product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/products/:id — update product
router.put('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Product not found.' });

        const { name, category, fabric, stock, minStock, price, supplierId } = req.body;

        db.prepare(`
            UPDATE products SET
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                fabric = COALESCE(?, fabric),
                stock = COALESCE(?, stock),
                min_stock = COALESCE(?, min_stock),
                price = COALESCE(?, price),
                supplier_id = COALESCE(?, supplier_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(name, category, fabric, stock, minStock, price, supplierId, req.params.id);

        // Check if stock alert needed
        const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (updated.stock <= updated.min_stock) {
            db.prepare(`
                INSERT INTO activity_log (action, entity_type, entity_id, description)
                VALUES ('alert', 'product', ?, ?)
            `).run(req.params.id, `Low stock alert: ${updated.name} (${updated.stock} units left)`);
        }

        db.prepare(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('updated', 'product', ?, ?)
        `).run(req.params.id, `Product ${updated.name} updated`);

        res.json({ message: 'Product updated.', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Product not found.' });

        // Check for order items
        const orderCount = db.prepare('SELECT COUNT(*) as count FROM purchase_order_items WHERE product_id = ?').get(req.params.id);
        if (orderCount.count > 0) {
            return res.status(409).json({
                error: `Cannot delete product referenced in ${orderCount.count} order items.`
            });
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

        db.prepare(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('deleted', 'product', ?, ?)
        `).run(req.params.id, `Product ${existing.name} deleted`);

        res.json({ message: 'Product deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
