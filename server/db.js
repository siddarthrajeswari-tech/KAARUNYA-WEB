// ============================================
// KAARUNYA — Database Initialization (SQLite)
// ============================================
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './server/data/kaarunya.db';

let db;

function getDb() {
    if (!db) {
        // Ensure data directory exists
        const dir = path.dirname(path.resolve(DB_PATH));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        db = new Database(path.resolve(DB_PATH));
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initDatabase() {
    const db = getDb();

    // ---- Create Tables ----
    db.exec(`
        -- Users table (for authentication)
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            full_name   TEXT NOT NULL,
            role        TEXT DEFAULT 'staff' CHECK(role IN ('admin','manager','staff')),
            email       TEXT,
            is_active   INTEGER DEFAULT 1,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Suppliers table
        CREATE TABLE IF NOT EXISTS suppliers (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            address     TEXT,
            phone       TEXT,
            email       TEXT,
            status      TEXT DEFAULT 'Active' CHECK(status IN ('Active','Inactive')),
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Products table
        CREATE TABLE IF NOT EXISTS products (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            category    TEXT NOT NULL CHECK(category IN ('Women','Child')),
            fabric      TEXT NOT NULL CHECK(fabric IN ('Cotton','Rayon','Silk','Linen','Denim')),
            stock       INTEGER DEFAULT 0,
            min_stock   INTEGER DEFAULT 10,
            price       REAL DEFAULT 0,
            supplier_id TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        );

        -- Purchase Orders table
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id          TEXT PRIMARY KEY,
            supplier_id TEXT NOT NULL,
            order_date  TEXT NOT NULL,
            status      TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Ordered','Delivered','Cancelled')),
            total       REAL DEFAULT 0,
            notes       TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- Purchase Order Items table
        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id        TEXT NOT NULL,
            product_id      TEXT NOT NULL,
            quantity        INTEGER NOT NULL,
            unit_price      REAL NOT NULL,
            subtotal        REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
            FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        -- Price Comparisons table
        CREATE TABLE IF NOT EXISTS price_comparisons (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name    TEXT NOT NULL,
            supplier_name   TEXT NOT NULL,
            price           REAL NOT NULL,
            is_best         INTEGER DEFAULT 0,
            last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Monthly purchase data (for reports/charts)
        CREATE TABLE IF NOT EXISTS monthly_purchases (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            month       TEXT NOT NULL,
            year        INTEGER NOT NULL,
            amount      REAL DEFAULT 0,
            order_count INTEGER DEFAULT 0,
            UNIQUE(month, year)
        );

        -- Activity Log
        CREATE TABLE IF NOT EXISTS activity_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            action      TEXT NOT NULL,
            entity_type TEXT,
            entity_id   TEXT,
            description TEXT,
            user_id     INTEGER,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Password Reset Tokens
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            token       TEXT UNIQUE NOT NULL,
            expires_at  DATETIME NOT NULL,
            used        INTEGER DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Two-Factor Authentication
        CREATE TABLE IF NOT EXISTS two_factor_auth (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER UNIQUE NOT NULL,
            secret      TEXT NOT NULL,
            is_enabled  INTEGER DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_fabric ON products(fabric);
        CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock, min_stock);
        CREATE INDEX IF NOT EXISTS idx_orders_supplier ON purchase_orders(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON purchase_orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_date ON purchase_orders(order_date);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON purchase_order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_price_comparisons_product ON price_comparisons(product_name);
        CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
    `);

    console.log('✅ Database initialized successfully');
    return db;
}

module.exports = { getDb, initDatabase };
