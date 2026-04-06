// ============================================
// KAARUNYA — Product Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/products — list all products
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
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

        const products = (await db.query(sql, [...params]))[0];

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
router.get('/stats', async (req, res) => {
    try {
        const db = await getDb();

        const [[{ count: total }]] = await db.query('SELECT COUNT(*) as count FROM products');
        const [[{ count: lowStock }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock');
        const [[{ count: outOfStock }]] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock = 0');

        const [byCategory] = await db.query(`
            SELECT category, COUNT(*) as count, SUM(stock) as totalStock
            FROM products GROUP BY category
        `);

        const [byFabric] = await db.query(`
            SELECT fabric, COUNT(*) as count, SUM(stock) as totalStock
            FROM products GROUP BY fabric
        `);

        const [[{ value: stockValue }]] = await db.query('SELECT SUM(stock * price) as value FROM products');

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
router.get('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const product = (await db.query(`
            SELECT p.*, s.name as supplier_name
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            WHERE p.id = ?
        `, [req.params.id]))[0][0];

        if (!product) return res.status(404).json({ error: 'Product not found.' });
        res.json({ data: product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products — create new product
router.post('/', async (req, res) => {
    try {
        const db = await getDb();
        const { name, category, fabric, stock, minStock, price, supplierId } = req.body;

        if (!name || !category || !fabric) {
            return res.status(400).json({ error: 'Name, category, and fabric are required.' });
        }

        // Generate ID
        const last = (await db.query("SELECT id FROM products ORDER BY id DESC LIMIT 1"))[0][0];
        let nextNum = 1;
        if (last) {
            nextNum = parseInt(last.id.split('-')[1]) + 1;
        }
        const id = 'PRD-' + String(nextNum).padStart(3, '0');

        await db.execute(`
            INSERT INTO products (id, name, category, fabric, stock, min_stock, price, supplier_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, name, category, fabric, stock || 0, minStock || 10, price || 0, supplierId || null]);

        // Log activity
        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('created', 'product', ?, ?)
        `, [id, `New product added: ${name}`]);

        const product = (await db.query('SELECT * FROM products WHERE id = ?', [id]))[0][0];
        res.status(201).json({ message: 'Product created.', data: product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/products/:id — update product
router.put('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const existing = (await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'Product not found.' });

        const { name, category, fabric, stock, minStock, price, supplierId } = req.body;

        await db.execute(`
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
        `, [name, category, fabric, stock, minStock, price, supplierId, req.params.id]);

        // Check if stock alert needed
        const updated = (await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]))[0][0];
        if (updated.stock <= updated.min_stock) {
            await db.execute(`
                INSERT INTO activity_log (action, entity_type, entity_id, description)
                VALUES ('alert', 'product', ?, ?)
            `, [req.params.id, `Low stock alert: ${updated.name} (${updated.stock} units left)`]);
        }

        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('updated', 'product', ?, ?)
        `, [req.params.id, `Product ${updated.name} updated`]);

        res.json({ message: 'Product updated.', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const existing = (await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'Product not found.' });

        // Check for order items
        const [[orderCount]] = await db.query('SELECT COUNT(*) as count FROM purchase_order_items WHERE product_id = ?', [req.params.id]);
        if (orderCount.count > 0) {
            return res.status(409).json({
                error: `Cannot delete product referenced in ${orderCount.count} order items.`
            });
        }

        await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);

        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('deleted', 'product', ?, ?)
        `, [req.params.id, `Product ${existing.name} deleted`]);

        res.json({ message: 'Product deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
