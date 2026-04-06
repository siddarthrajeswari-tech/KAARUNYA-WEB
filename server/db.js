// ============================================
// KAARUNYA — Database Initialization (MySQL)
// ============================================
const mysql = require('mysql2/promise');
require('dotenv').config();

let db;

async function getDb() {
    if (!db) {
        // Create pool instead of single connection for better performance
        db = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'kaarunya',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
    return db;
}

async function initDatabase() {
    // We need a separate raw connection to create the DB if it doesn't exist
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'kaarunya'}\`;`);
    await connection.end();

    const pool = await getDb();

    // ---- Create Tables ----
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            username    VARCHAR(255) UNIQUE NOT NULL,
            password    VARCHAR(255) NOT NULL,
            full_name   VARCHAR(255) NOT NULL,
            role        ENUM('admin','manager','staff') DEFAULT 'staff',
            email       VARCHAR(255),
            is_active   TINYINT DEFAULT 1,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS suppliers (
            id          VARCHAR(255) PRIMARY KEY,
            name        VARCHAR(255) NOT NULL,
            address     TEXT,
            phone       VARCHAR(255),
            email       VARCHAR(255),
            status      ENUM('Active','Inactive') DEFAULT 'Active',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id          VARCHAR(255) PRIMARY KEY,
            name        VARCHAR(255) NOT NULL,
            category    ENUM('Women','Child') NOT NULL,
            fabric      ENUM('Cotton','Rayon','Silk','Linen','Denim') NOT NULL,
            stock       INT DEFAULT 0,
            min_stock   INT DEFAULT 10,
            price       DECIMAL(10,2) DEFAULT 0,
            supplier_id VARCHAR(255),
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id          VARCHAR(255) PRIMARY KEY,
            supplier_id VARCHAR(255) NOT NULL,
            order_date  DATE NOT NULL,
            status      ENUM('Pending','Ordered','Delivered','Cancelled') DEFAULT 'Pending',
            total       DECIMAL(10,2) DEFAULT 0,
            notes       TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            order_id        VARCHAR(255) NOT NULL,
            product_id      VARCHAR(255) NOT NULL,
            quantity        INT NOT NULL,
            unit_price      DECIMAL(10,2) NOT NULL,
            subtotal        DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
            FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS price_comparisons (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            product_name    VARCHAR(255) NOT NULL,
            supplier_name   VARCHAR(255) NOT NULL,
            price           DECIMAL(10,2) NOT NULL,
            is_best         TINYINT DEFAULT 0,
            last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS monthly_purchases (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            month       VARCHAR(20) NOT NULL,
            year        INT NOT NULL,
            amount      DECIMAL(10,2) DEFAULT 0,
            order_count INT DEFAULT 0,
            UNIQUE(month, year)
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_log (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            action      VARCHAR(255) NOT NULL,
            entity_type VARCHAR(255),
            entity_id   VARCHAR(255),
            description TEXT,
            user_id     INT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            token       VARCHAR(255) UNIQUE NOT NULL,
            expires_at  DATETIME NOT NULL,
            used        TINYINT DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS two_factor_auth (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT UNIQUE NOT NULL,
            secret      VARCHAR(255) NOT NULL,
            is_enabled  TINYINT DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
            \`key\`         VARCHAR(255) PRIMARY KEY,
            value         TEXT NOT NULL,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
    `);

    // MySQL index creation requires a separate alter or direct creation if they don't exist,
    // but IF NOT EXISTS on CREATE INDEX is only supported in MySQL 8.0.14+
    const indexes = [
        "CREATE INDEX idx_products_category ON products(category);",
        "CREATE INDEX idx_products_fabric ON products(fabric);",
        "CREATE INDEX idx_products_supplier ON products(supplier_id);",
        "CREATE INDEX idx_products_stock ON products(stock, min_stock);",
        "CREATE INDEX idx_orders_supplier ON purchase_orders(supplier_id);",
        "CREATE INDEX idx_orders_status ON purchase_orders(status);",
        "CREATE INDEX idx_orders_date ON purchase_orders(order_date);",
        "CREATE INDEX idx_order_items_order ON purchase_order_items(order_id);",
        "CREATE INDEX idx_price_comparisons_product ON price_comparisons(product_name);",
        "CREATE INDEX idx_activity_log_date ON activity_log(created_at);",
        "CREATE INDEX idx_activity_log_user ON activity_log(user_id);",
        "CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);",
        "CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);"
    ];

    for (const idxQuery of indexes) {
        try {
            await pool.query(idxQuery);
        } catch (err) {
            // Ignore Duplicate Key errors for indexes that already exist. ER_DUP_KEY is standard, or ER_DUP_KEYNAME
            if (!err.message.includes('Duplicate')) {
                // Ignore for now
            }
        }
    }

    console.log('✅ MySQL Database initialized successfully');
    return pool;
}

module.exports = { getDb, initDatabase };
