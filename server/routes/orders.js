// ============================================
// KAARUNYA — Purchase Order Routes
// ============================================
const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

// GET /api/orders — list all purchase orders
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { search, status, sort, order } = req.query;

        let sql = `
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += ' AND (po.id LIKE ? OR s.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            sql += ' AND po.status = ?';
            params.push(status);
        }

        const validSorts = ['id', 'order_date', 'status', 'total'];
        const sortCol = validSorts.includes(sort) ? `po.${sort}` : 'po.order_date';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${sortCol} ${sortOrder}`;

        const orders = db.prepare(sql).all(...params);

        // Attach item count for each order
        const itemCountStmt = db.prepare('SELECT COUNT(*) as count FROM purchase_order_items WHERE order_id = ?');
        const data = orders.map(o => ({
            ...o,
            itemCount: itemCountStmt.get(o.id).count,
        }));

        res.json({ data, total: data.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/stats — order statistics
router.get('/stats', (req, res) => {
    try {
        const db = getDb();
        const total = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get().count;
        const pending = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Pending'").get().count;
        const ordered = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Ordered'").get().count;
        const delivered = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Delivered'").get().count;
        const cancelled = db.prepare("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Cancelled'").get().count;
        const totalValue = db.prepare('SELECT SUM(total) as value FROM purchase_orders').get().value || 0;

        res.json({ total, pending, ordered, delivered, cancelled, totalValue });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/:id — get single order with items
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const order = db.prepare(`
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = ?
        `).get(req.params.id);

        if (!order) return res.status(404).json({ error: 'Order not found.' });

        const items = db.prepare(`
            SELECT poi.*, p.name as product_name
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.order_id = ?
        `).all(req.params.id);

        res.json({ data: { ...order, items } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders — create new purchase order
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const { supplierId, orderDate, items, notes } = req.body;

        if (!supplierId || !orderDate || !items || !items.length) {
            return res.status(400).json({ error: 'Supplier, date, and at least one item are required.' });
        }

        // Generate ID
        const last = db.prepare("SELECT id FROM purchase_orders ORDER BY id DESC LIMIT 1").get();
        let nextNum = 38;
        if (last) {
            const parts = last.id.split('-');
            nextNum = parseInt(parts[parts.length - 1]) + 1;
        }
        const id = 'PO-2026-' + String(nextNum).padStart(3, '0');

        // Calculate total
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        const createOrder = db.transaction(() => {
            // Insert order
            db.prepare(`
                INSERT INTO purchase_orders (id, supplier_id, order_date, status, total, notes)
                VALUES (?, ?, ?, 'Pending', ?, ?)
            `).run(id, supplierId, orderDate, total, notes || null);

            // Insert items
            const insertItem = db.prepare(`
                INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)
            `);
            for (const item of items) {
                insertItem.run(id, item.productId, item.quantity, item.unitPrice);
            }

            // Log activity
            const supplierName = db.prepare('SELECT name FROM suppliers WHERE id = ?').get(supplierId)?.name || supplierId;
            db.prepare(`
                INSERT INTO activity_log (action, entity_type, entity_id, description)
                VALUES ('created', 'order', ?, ?)
            `).run(id, `Purchase order ${id} created for ${supplierName}`);
        });

        createOrder();

        const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
        const orderItems = db.prepare(`
            SELECT poi.*, p.name as product_name
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.order_id = ?
        `).all(id);

        res.status(201).json({
            message: 'Purchase order created.',
            data: { ...order, items: orderItems }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/orders/:id/status — update order status
router.put('/:id/status', (req, res) => {
    try {
        const db = getDb();
        const { status } = req.body;
        const validStatuses = ['Pending', 'Ordered', 'Delivered', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
        }

        const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Order not found.' });

        const updateStatus = db.transaction(() => {
            db.prepare(`
                UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(status, req.params.id);

            // If delivered, update product stock
            if (status === 'Delivered' && existing.status !== 'Delivered') {
                const items = db.prepare('SELECT * FROM purchase_order_items WHERE order_id = ?').all(req.params.id);
                const updateStock = db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
                for (const item of items) {
                    updateStock.run(item.quantity, item.product_id);
                }
            }

            // Log activity
            db.prepare(`
                INSERT INTO activity_log (action, entity_type, entity_id, description)
                VALUES ('updated', 'order', ?, ?)
            `).run(req.params.id, `Order ${req.params.id} status changed to ${status}`);
        });

        updateStatus();

        const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
        res.json({ message: 'Order status updated.', data: order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/orders/:id — delete order (only Pending/Cancelled)
router.delete('/:id', (req, res) => {
    try {
        const db = getDb();
        const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Order not found.' });

        if (!['Pending', 'Cancelled'].includes(existing.status)) {
            return res.status(409).json({ error: 'Can only delete Pending or Cancelled orders.' });
        }

        db.prepare('DELETE FROM purchase_order_items WHERE order_id = ?').run(req.params.id);
        db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);

        res.json({ message: 'Order deleted.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
