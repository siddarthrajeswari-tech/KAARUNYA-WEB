// ============================================
// KAARUNYA — Database Seeder (MySQL)
// ============================================
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { getDb, initDatabase } = require('./db');

async function seed() {
    const db = await initDatabase();

    console.log('🌱 Seeding database...');

    // ---- Clear existing data ----
    // Needs SET FOREIGN_KEY_CHECKS=0 to allow truncation
    await db.query('SET FOREIGN_KEY_CHECKS=0;');
    const tables = [
        'activity_log', 'purchase_order_items', 'purchase_orders',
        'price_comparisons', 'monthly_purchases', 'products', 'suppliers', 'users'
    ];
    for (const table of tables) {
        await db.query(`TRUNCATE TABLE ${table};`);
    }
    await db.query('SET FOREIGN_KEY_CHECKS=1;');

    // ---- Seed Users ----
    const hashedPassword = bcrypt.hashSync('kaarumayil@10', 10);
    const staffPassword = bcrypt.hashSync('staff123', 10);

    const insertUserQuery = `INSERT INTO users (username, password, full_name, role, email) VALUES (?, ?, ?, ?, ?)`;
    await db.execute(insertUserQuery, ['admin', hashedPassword, 'Admin User', 'admin', 'admin@kaarunya.in']);
    await db.execute(insertUserQuery, ['manager', hashedPassword, 'Store Manager', 'manager', 'manager@kaarunya.in']);
    await db.execute(insertUserQuery, ['staff1', staffPassword, 'Priya Sharma', 'staff', 'sid@kaarunya.in']);

    // ---- Seed Suppliers ----
    const insertSupplierQuery = `INSERT INTO suppliers (id, name, address, phone, email, status) VALUES (?, ?, ?, ?, ?, ?)`;
    const suppliers = [
        ['SUP-001', 'Silk Route Fabrics', '12 Anna Nagar, Chennai', '+91 98765 43210', 'info@silkroute.in', 'Active'],
        ['SUP-002', 'Linen World', '45 MG Road, Bangalore', '+91 98765 43211', 'orders@linenworld.co', 'Active'],
        ['SUP-003', 'Cotton Crafts India', '78 Textile Nagar, Coimbatore', '+91 98765 43212', 'sales@cottoncrafts.in', 'Active'],
        ['SUP-004', 'Denim Dreams', '23 Industrial Area, Ahmedabad', '+91 98765 43213', 'hello@denimdreams.com', 'Active'],
        ['SUP-005', 'Rayon Republic', '90 Fabric Lane, Surat', '+91 98765 43214', 'contact@rayonrep.in', 'Active'],
        ['SUP-006', 'Fabric Paradise', '34 Silk Street, Varanasi', '+91 98765 43215', 'info@fabricparadise.in', 'Active'],
        ['SUP-007', 'Weave Masters', '67 Loom Colony, Erode', '+91 98765 43216', 'sales@weavemasters.in', 'Inactive'],
        ['SUP-008', 'Heritage Textiles', '11 Heritage Rd, Jaipur', '+91 98765 43217', 'info@heritagetex.co', 'Active'],
        ['SUP-009', 'Southern Silks', '55 Temple St, Kanchipuram', '+91 98765 43218', 'orders@southernsilks.in', 'Active'],
        ['SUP-010', 'Modern Fabrics Co', '22 New Town, Kolkata', '+91 98765 43219', 'hello@modernfab.co', 'Inactive'],
    ];

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        for (const s of suppliers) await conn.execute(insertSupplierQuery, s);
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    }

    // ---- Seed Products ----
    const insertProductQuery = `INSERT INTO products (id, name, category, fabric, stock, min_stock, price, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const products = [
        ['PRD-001', 'Silk Saree - Royal Blue', 'Women', 'Silk', 45, 10, 2500, 'SUP-001'],
        ['PRD-002', 'Cotton Kurti - Floral', 'Women', 'Cotton', 28, 15, 850, 'SUP-003'],
        ['PRD-003', 'Denim Frock - Pink', 'Child', 'Denim', 5, 10, 650, 'SUP-004'],
        ['PRD-004', 'Rayon Palazzo Set', 'Women', 'Rayon', 62, 20, 1200, 'SUP-005'],
        ['PRD-005', 'Linen Lehenga - Child', 'Child', 'Linen', 18, 8, 1800, 'SUP-002'],
        ['PRD-006', 'Cotton Anarkali Suit', 'Women', 'Cotton', 3, 10, 1400, 'SUP-003'],
        ['PRD-007', 'Silk Churidar - Gold', 'Women', 'Silk', 35, 10, 2200, 'SUP-009'],
        ['PRD-008', 'Rayon Frock - Floral', 'Child', 'Rayon', 7, 10, 550, 'SUP-005'],
        ['PRD-009', 'Linen A-Line Kurti', 'Women', 'Linen', 42, 12, 980, 'SUP-002'],
        ['PRD-010', 'Denim Jacket - Teen', 'Child', 'Denim', 2, 8, 950, 'SUP-004'],
        ['PRD-011', 'Silk Pattu Pavadai', 'Child', 'Silk', 25, 10, 1600, 'SUP-001'],
        ['PRD-012', 'Cotton Maxi Dress', 'Women', 'Cotton', 30, 15, 1100, 'SUP-003'],
        ['PRD-013', 'Rayon Wrap Dress', 'Women', 'Rayon', 4, 10, 1350, 'SUP-005'],
        ['PRD-014', 'Linen Jumpsuit - Kids', 'Child', 'Linen', 20, 8, 780, 'SUP-002'],
        ['PRD-015', 'Silk Gown - Bridal', 'Women', 'Silk', 12, 5, 5500, 'SUP-009'],
        ['PRD-016', 'Cotton Pinafore - Child', 'Child', 'Cotton', 38, 15, 450, 'SUP-003'],
        ['PRD-017', 'Denim Skirt - Women', 'Women', 'Denim', 22, 10, 750, 'SUP-004'],
        ['PRD-018', 'Rayon Sharara Set', 'Women', 'Rayon', 15, 10, 1600, 'SUP-005'],
    ];

    try {
        await conn.beginTransaction();
        for (const p of products) await conn.execute(insertProductQuery, p);
        await conn.commit();
    } catch(err) {
        await conn.rollback();
        throw err;
    }

    // ---- Seed Purchase Orders ----
    const insertOrderQuery = `INSERT INTO purchase_orders (id, supplier_id, order_date, status, total) VALUES (?, ?, ?, ?, ?)`;
    const insertOrderItemQuery = `INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`;

    const orders = [
        { id: 'PO-2026-038', supplier: 'SUP-001', date: '2026-01-15', status: 'Delivered', items: [{ product: 'PRD-001', qty: 20, price: 1800 }, { product: 'PRD-011', qty: 15, price: 1100 }] },
        { id: 'PO-2026-039', supplier: 'SUP-003', date: '2026-01-22', status: 'Delivered', items: [{ product: 'PRD-002', qty: 30, price: 550 }, { product: 'PRD-006', qty: 20, price: 950 }] },
        { id: 'PO-2026-040', supplier: 'SUP-004', date: '2026-02-05', status: 'Delivered', items: [{ product: 'PRD-003', qty: 25, price: 400 }] },
        { id: 'PO-2026-041', supplier: 'SUP-002', date: '2026-02-12', status: 'Ordered', items: [{ product: 'PRD-005', qty: 15, price: 1300 }, { product: 'PRD-009', qty: 20, price: 680 }] },
        { id: 'PO-2026-042', supplier: 'SUP-001', date: '2026-02-20', status: 'Delivered', items: [{ product: 'PRD-007', qty: 10, price: 1600 }] },
        { id: 'PO-2026-043', supplier: 'SUP-002', date: '2026-02-25', status: 'Ordered', items: [{ product: 'PRD-014', qty: 15, price: 520 }] },
        { id: 'PO-2026-044', supplier: 'SUP-005', date: '2026-03-01', status: 'Pending', items: [{ product: 'PRD-004', qty: 30, price: 820 }, { product: 'PRD-013', qty: 20, price: 920 }] },
        { id: 'PO-2026-045', supplier: 'SUP-003', date: '2026-03-02', status: 'Pending', items: [{ product: 'PRD-012', qty: 25, price: 750 }] },
        { id: 'PO-2026-046', supplier: 'SUP-004', date: '2026-03-03', status: 'Pending', items: [{ product: 'PRD-010', qty: 20, price: 620 }, { product: 'PRD-017', qty: 15, price: 480 }] },
    ];

    try {
        await conn.beginTransaction();
        for (const o of orders) {
            const total = o.items.reduce((s, i) => s + i.qty * i.price, 0);
            await conn.execute(insertOrderQuery, [o.id, o.supplier, o.date, o.status, total]);
            for (const item of o.items) {
                await conn.execute(insertOrderItemQuery, [o.id, item.product, item.qty, item.price]);
            }
        }
        await conn.commit();
    } catch(err) {
        await conn.rollback();
        throw err;
    }

    // ---- Seed Price Comparisons ----
    const insertPriceCompQuery = `INSERT INTO price_comparisons (product_name, supplier_name, price, is_best) VALUES (?, ?, ?, ?)`;
    const priceComps = [
        ['Cotton Kurti', 'Cotton Crafts India', 550, 1],
        ['Cotton Kurti', 'Heritage Textiles', 610, 0],
        ['Cotton Kurti', 'Modern Fabrics Co', 640, 0],
        ['Silk Saree', 'Silk Route Fabrics', 1800, 1],
        ['Silk Saree', 'Southern Silks', 1950, 0],
        ['Silk Saree', 'Fabric Paradise', 2100, 0],
        ['Rayon Palazzo Set', 'Rayon Republic', 820, 1],
        ['Rayon Palazzo Set', 'Fabric Paradise', 880, 0],
        ['Rayon Palazzo Set', 'Heritage Textiles', 920, 0],
        ['Denim Frock', 'Denim Dreams', 400, 1],
        ['Denim Frock', 'Modern Fabrics Co', 440, 0],
        ['Denim Frock', 'Heritage Textiles', 475, 0],
        ['Linen Lehenga', 'Linen World', 1300, 1],
        ['Linen Lehenga', 'Fabric Paradise', 1380, 0],
        ['Linen Lehenga', 'Heritage Textiles', 1420, 0],
        ['Cotton Anarkali', 'Cotton Crafts India', 950, 0],
        ['Cotton Anarkali', 'Heritage Textiles', 920, 1],
        ['Cotton Anarkali', 'Fabric Paradise', 980, 0],
    ];

    try {
        await conn.beginTransaction();
        for (const p of priceComps) await conn.execute(insertPriceCompQuery, p);
        await conn.commit();
    } catch(err) {
        await conn.rollback();
        throw err;
    }

    // ---- Seed Monthly Purchase Data ----
    const insertMonthlyQuery = `INSERT INTO monthly_purchases (month, year, amount, order_count) VALUES (?, ?, ?, ?)`;
    const monthlyData = [
        ['Mar', 2025, 42000, 4], ['Apr', 2025, 38000, 3], ['May', 2025, 55000, 5],
        ['Jun', 2025, 48000, 4], ['Jul', 2025, 61000, 6], ['Aug', 2025, 52000, 4],
        ['Sep', 2025, 47000, 3], ['Oct', 2025, 58000, 5], ['Nov', 2025, 63000, 6],
        ['Dec', 2025, 72000, 7], ['Jan', 2026, 85000, 8], ['Feb', 2026, 95000, 9],
    ];

    try {
        await conn.beginTransaction();
        for (const m of monthlyData) await conn.execute(insertMonthlyQuery, m);
        await conn.commit();
    } catch(err) {
        await conn.rollback();
        throw err;
    }

    // ---- Seed Activity Log ----
    const insertActivityQuery = `INSERT INTO activity_log (action, entity_type, entity_id, description, created_at) VALUES (?, ?, ?, ?, ?)`;
    const activities = [
        ['received', 'order', 'PO-2026-042', 'Order #PO-2026-042 received from Silk Route Fabrics', '2026-03-03 08:00:00'],
        ['alert', 'product', 'PRD-006', 'Low stock alert: Cotton Anarkali Suit (3 units left)', '2026-03-03 05:00:00'],
        ['created', 'product', 'PRD-004', 'New product added: Rayon Palazzo Set', '2026-03-02 14:00:00'],
        ['sent', 'order', 'PO-2026-043', 'Purchase order #PO-2026-043 sent to Linen World', '2026-03-02 10:00:00'],
        ['updated', 'supplier', 'SUP-004', 'Supplier Denim Dreams status updated to Active', '2026-03-01 09:00:00'],
    ];

    try {
        await conn.beginTransaction();
        for (const a of activities) await conn.execute(insertActivityQuery, a);
        await conn.commit();
    } catch(err) {
        await conn.rollback();
        throw err;
    }

    conn.release();

    console.log('✅ Database seeded successfully!');
    console.log(`   → ${suppliers.length} suppliers`);
    console.log(`   → ${products.length} products`);
    console.log(`   → ${orders.length} purchase orders`);
    console.log(`   → ${priceComps.length} price comparisons`);
    console.log(`   → ${monthlyData.length} months of purchase data`);
    console.log(`   → 3 users (admin/kaarumayil@10, manager/kaarumayil@10, staff1/staff123)`);
}

// Run directly
if (require.main === module) {
    seed().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { seed };
