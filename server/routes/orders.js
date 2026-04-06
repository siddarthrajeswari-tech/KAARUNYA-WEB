// ============================================
// KAARUNYA — Purchase Order Routes (MySQL)
// ============================================
const express = require('express');
const { z } = require('zod');
const { getDb } = require('../db');
const router = express.Router();

// 1. Data Validation (The Guardrail)
const orderSchema = z.object({
    supplierId: z.string().regex(/^SUP-\d+$/, "Supplier ID must start with 'SUP-' followed by numbers"),
    orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD Date format"),
    notes: z.string().optional(),
    total: z.number().positive("Total must be a positive number").optional(), // Validated if provided, though we recalculate it safely
    items: z.array(
        z.object({
            productId: z.string().regex(/^PRD-\d+$/, "Product ID must start with 'PRD-' followed by numbers"),
            quantity: z.number().int().positive("Quantity must be greater than zero"),
            unitPrice: z.number().positive("Unit price must be a positive number")
        })
    ).min(1, "Order must contain at least one item")
});

// GET /api/orders — list all purchase orders
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const { search, status, sort, order } = req.query;

        let sql = `
            SELECT po.*, s.name as supplier_name,
                   (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.order_id = po.id) as itemCount
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

        const [orders] = await db.query(sql, params);
        res.json({ data: orders || [], total: orders?.length || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/stats — order statistics
router.get('/stats', async (req, res) => {
    try {
        const db = await getDb();
        const [[{ count: total }]] = await db.query('SELECT COUNT(*) as count FROM purchase_orders');
        const [[{ count: pending }]] = await db.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Pending'");
        const [[{ count: ordered }]] = await db.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Ordered'");
        const [[{ count: delivered }]] = await db.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Delivered'");
        const [[{ count: cancelled }]] = await db.query("SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'Cancelled'");
        const [[{ value: totalValue }]] = await db.query('SELECT SUM(total) as value FROM purchase_orders');

        res.json({ total, pending, ordered, delivered, cancelled, totalValue: totalValue || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/orders/:id — get single order with items
router.get('/:id', async (req, res) => {
    try {
        const db = await getDb();
        const [rows] = await db.query(`
            SELECT po.*, s.name as supplier_name
            FROM purchase_orders po
            LEFT JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.id = ?
        `, [req.params.id]);
        
        const order = rows[0];
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        const [items] = await db.query(`
            SELECT poi.*, p.name as product_name
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
            WHERE poi.order_id = ?
        `, [req.params.id]);

        res.json({ data: { ...order, items } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/orders — create new purchase order
router.post('/', async (req, res) => {
    // Phase 1: Validate payload early
    const validation = orderSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.error.issues 
        });
    }

    const { supplierId, orderDate, items, notes } = validation.data;
    const db = await getDb();
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // Phase 2: Logic checks inside the transaction
        // Example logic requirement from prompt: "check if stock >= quantity before allowing purchase"
        for (const item of items) {
            const [[product]] = await conn.query('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [item.productId]);
            if (!product) {
                throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
            }
            if (product.stock < item.quantity) {
                throw new Error(`INSUFFICIENT_STOCK:${product.name} only has ${product.stock} units remaining.`);
            }
        }

        // Generate ID
        const [[lastOrder]] = await conn.query("SELECT id FROM purchase_orders ORDER BY id DESC LIMIT 1");
        let nextNum = 38;
        if (lastOrder) {
            const parts = lastOrder.id.split('-');
            nextNum = parseInt(parts[parts.length - 1]) + 1;
        }
        const id = 'PO-2026-' + String(nextNum).padStart(3, '0');

        // Calculate total reliably via backend
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        // Insert order
        await conn.execute(`
            INSERT INTO purchase_orders (id, supplier_id, order_date, status, total, notes)
            VALUES (?, ?, ?, 'Pending', ?, ?)
        `, [id, supplierId, orderDate, total, notes || null]);

        // Insert items and adjust stock safely
        for (const item of items) {
            await conn.execute(`
                INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, ?)
            `, [id, item.productId, item.quantity, item.unitPrice]);

            // Optional: Reduce stock directly if it's a direct purchase deduction
            await conn.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.productId]
            );
        }

        // Phase 3: Reporting - Update monthly_purchases automatically
        const dateObj = new Date(orderDate);
        const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
        const yearInt = dateObj.getFullYear();

        await conn.execute(`
            INSERT INTO monthly_purchases (month, year, amount, order_count)
            VALUES (?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE 
                amount = amount + VALUES(amount), 
                order_count = order_count + 1
        `, [monthStr, yearInt, total]);


        // Log activity
        const [[supplier]] = await conn.query('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
        const supplierName = supplier?.name || supplierId;
        
        await conn.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('created', 'order', ?, ?)
        `, [id, `Purchase order ${id} created for ${supplierName}`]);

        await conn.commit();

        res.status(201).json({
            message: 'Purchase order created successfully.',
            id
        });
    } catch (err) {
        await conn.rollback();
        
        // Phase 4: Specific HTTP status codes & Error Handling
        if (err.message.startsWith('INSUFFICIENT_STOCK')) {
            return res.status(409).json({ error: 'Out of stock', detail: err.message.split(':')[1] });
        }
        if (err.message.startsWith('PRODUCT_NOT_FOUND')) {
            return res.status(400).json({ error: 'Invalid product ID', detail: err.message.split(':')[1] });
        }
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Foreign Key violation', detail: 'The supplied product or supplier does not exist in the database.' });
        }
        if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
            return res.status(503).json({ error: 'Database connection failed', detail: 'The server is temporarily down.' });
        }
        res.status(500).json({ error: 'Internal server error', detail: err.message });
    } finally {
        conn.release();
    }
});

// PUT /api/orders/:id/status — update order status
router.put('/:id/status', async (req, res) => {
    const db = await getDb();
    const conn = await db.getConnection();
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Ordered', 'Delivered', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
        }

        const [[existing]] = await conn.query('SELECT * FROM purchase_orders WHERE id = ? FOR UPDATE', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Order not found.' });

        await conn.beginTransaction();

        await conn.execute(`UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, req.params.id]);

        /* Optionally handle restocking or stock increment on Delivery here depending on requirements */

        await conn.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description)
            VALUES ('updated', 'order', ?, ?)
        `, [req.params.id, `Order ${req.params.id} status changed to ${status}`]);

        await conn.commit();
        res.json({ message: 'Order status updated.', id: req.params.id });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// DELETE /api/orders/:id — delete order (only Pending/Cancelled)
router.delete('/:id', async (req, res) => {
    const db = await getDb();
    const conn = await db.getConnection();
    try {
        const [[existing]] = await db.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
        if (!existing) return res.status(404).json({ error: 'Order not found.' });

        if (!['Pending', 'Cancelled'].includes(existing.status)) {
            return res.status(409).json({ error: 'Can only delete Pending or Cancelled orders.' });
        }

        await conn.beginTransaction();
        await conn.execute('DELETE FROM purchase_order_items WHERE order_id = ?', [req.params.id]);
        await conn.execute('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
        await conn.commit();

        res.json({ message: 'Order deleted.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

module.exports = router;
