// ============================================
// KAARUNYA — Auth Routes (Complete)
// ============================================
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../db');
const router = express.Router();

// ---- Helper: Log activity ----
async function logActivity(db, action, entityType, entityId, description, userId) {
    try {
        await db.execute(`
            INSERT INTO activity_log (action, entity_type, entity_id, description, user_id)
            VALUES (?, ?, ?, ?, ?)
        `, [action, entityType, entityId, description, userId || null]);
    } catch (err) {
        console.error('Error logging activity', err);
    }
}

// ================================================
// POST /api/auth/login
// ================================================
router.post('/login', async (req, res) => {
    try {
        const { username, password, totpCode } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const db = await getDb();
        const user = (await db.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]))[0][0];

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Check if 2FA is enabled
        const tfa = (await db.query('SELECT * FROM two_factor_auth WHERE user_id = ? AND is_enabled = 1', [user.id]))[0][0];
        if (tfa) {
            if (!totpCode) {
                return res.status(200).json({
                    requires2FA: true,
                    message: 'Two-factor authentication code required.',
                });
            }
            // Verify TOTP
            try {
                const { authenticator } = require('otplib');
                const isValid = authenticator.check(totpCode, tfa.secret);
                if (!isValid) {
                    return res.status(401).json({ error: 'Invalid two-factor authentication code.' });
                }
            } catch (e) {
                return res.status(401).json({ error: 'Invalid two-factor authentication code.' });
            }
        }

        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            email: user.email,
        };

        // Log activity
        logActivity(db, 'login', 'user', String(user.id), `User ${user.username} logged in`, user.id);

        res.json({
            message: 'Login successful',
            user: req.session.user,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// POST /api/auth/logout
// ================================================
router.post('/logout', async (req, res) => {
    const userId = req.session?.user?.id;
    const username = req.session?.user?.username;

    if (userId) {
        try {
            const db = await getDb();
            logActivity(db, 'logout', 'user', String(userId), `User ${username} logged out`, userId);
        } catch (e) { /* ignore logging errors */ }
    }

    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully.' });
    });
});

// ================================================
// GET /api/auth/me — check current session
// ================================================
router.get('/me', async (req, res) => {
    if (req.session && req.session.user) {
        const db = await getDb();
        const tfa = (await db.query('SELECT is_enabled FROM two_factor_auth WHERE user_id = ?', [req.session.user.id]))[0][0];
        return res.json({
            user: {
                ...req.session.user,
                has2FA: tfa ? !!tfa.is_enabled : false,
            },
        });
    }
    res.status(401).json({ error: 'Not authenticated.' });
});

// ================================================
// POST /api/auth/register (admin only)
// ================================================
router.post('/register', async (req, res) => {
    try {
        if (!req.session?.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can register new users.' });
        }

        const { username, password, fullName, role, email } = req.body;
        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'Username, password, and full name are required.' });
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Validate role
        const validRoles = ['admin', 'manager', 'staff'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or staff.' });
        }

        const db = await getDb();
        const existing = (await db.query('SELECT id FROM users WHERE username = ?', [username]))[0][0];
        if (existing) {
            return res.status(409).json({ error: 'Username already exists.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const [result] = await db.execute(`
            INSERT INTO users (username, password, full_name, role, email) VALUES (?, ?, ?, ?, ?)
        `, [username, hashedPassword, fullName, role || 'staff', email || null]);

        // Log activity
        await logActivity(db, 'user_created', 'user', String(result.insertId),
            `New user "${username}" created with role "${role || 'staff'}" by ${req.session.user.username}`,
            req.session.user.id);

        res.status(201).json({
            message: 'User registered successfully.',
            userId: result.insertId,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// PUT /api/auth/profile — update own profile
// ================================================
router.put('/profile', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const { fullName, email } = req.body;
        if (!fullName) {
            return res.status(400).json({ error: 'Full name is required.' });
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        const db = await getDb();
        await db.execute('UPDATE users SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [fullName, email || null, req.session.user.id]);

        // Update session
        req.session.user.fullName = fullName;
        req.session.user.email = email || null;

        logActivity(db, 'profile_updated', 'user', String(req.session.user.id),
            `User ${req.session.user.username} updated their profile`, req.session.user.id);

        res.json({ message: 'Profile updated successfully.', user: req.session.user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// PUT /api/auth/change-password
// ================================================
router.put('/change-password', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        const db = await getDb();
        const user = (await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]))[0][0];
        
        if (!user) {
             return res.status(404).json({ error: 'User not found.' });
        }
        
        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const hashed = bcrypt.hashSync(newPassword, 10);
        (await db.execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashed, user.id]));
        
        // Return 200 explicitly so client knows it was successful
        return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// POST /api/auth/forgot-password — generate reset token
// ================================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username && !email) {
            return res.status(400).json({ error: 'Username or email is required.' });
        }

        const db = await getDb();
        let user;
        if (username) {
            user = (await db.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]))[0][0];
        } else {
            user = (await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]))[0][0];
        }

        if (!user) {
            // Don't reveal if user exists or not
            return res.json({ message: 'If the account exists, a reset token has been generated.' });
        }

        // Invalidate old tokens
        (await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id]));

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.execute(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)
        `, [user.id, token, expiresAt]);

        logActivity(db, 'password_reset_requested', 'user', String(user.id),
            `Password reset requested for user ${user.username}`, null);

        // In a real app, this token would be sent via email
        // For demo purposes, return it in the response
        res.json({
            message: 'Password reset token generated. In production, this would be sent via email.',
            token: token,
            expiresIn: '1 hour',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// POST /api/auth/reset-password — reset with token
// ================================================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const db = await getDb();
        const [rows] = await db.execute(`
            SELECT * FROM password_reset_tokens 
            WHERE token = ? AND used = 0 AND expires_at > NOW()
        `, [token]);
        const resetToken = rows[0];

        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token.' });
        }

        const hashed = bcrypt.hashSync(newPassword, 10);
        await db.execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashed, resetToken.user_id]);
        (await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [resetToken.id]));

        logActivity(db, 'password_reset', 'user', String(resetToken.user_id),
            `Password reset for user ID ${resetToken.user_id}`, null);

        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 2FA — Setup (generate secret + QR code)
// ================================================
router.post('/2fa/setup', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const { authenticator } = require('otplib');
        const QRCode = require('qrcode');

        const db = await getDb();
        const existing = (await db.query('SELECT * FROM two_factor_auth WHERE user_id = ?', [req.session.user.id]))[0][0];

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(req.session.user.username, 'Kaarunya', secret);
        const qrCode = await QRCode.toDataURL(otpauth);

        if (existing) {
            await db.execute('UPDATE two_factor_auth SET secret = ?, is_enabled = 0 WHERE user_id = ?',
                [secret, req.session.user.id]);
        } else {
            await db.execute('INSERT INTO two_factor_auth (user_id, secret) VALUES (?, ?)',
                [req.session.user.id, secret]);
        }

        res.json({
            secret: secret,
            qrCode: qrCode,
            message: 'Scan the QR code with your authenticator app, then verify with a code.',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 2FA — Verify & Enable
// ================================================
router.post('/2fa/verify', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Verification code is required.' });
        }

        const { authenticator } = require('otplib');
        const db = await getDb();
        const tfa = (await db.query('SELECT * FROM two_factor_auth WHERE user_id = ?', [req.session.user.id]))[0][0];

        if (!tfa) {
            return res.status(400).json({ error: 'Please set up 2FA first.' });
        }

        const isValid = authenticator.check(code, tfa.secret);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid verification code. Please try again.' });
        }

        (await db.execute('UPDATE two_factor_auth SET is_enabled = 1 WHERE user_id = ?', [req.session.user.id]));

        logActivity(db, '2fa_enabled', 'user', String(req.session.user.id),
            `User ${req.session.user.username} enabled two-factor authentication`, req.session.user.id);

        res.json({ message: 'Two-factor authentication enabled successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// 2FA — Disable
// ================================================
router.post('/2fa/disable', async (req, res) => {
    try {
        if (!req.session?.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required to disable 2FA.' });
        }

        const db = await getDb();
        const user = (await db.query('SELECT * FROM users WHERE id = ?', [req.session.user.id]))[0][0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        (await db.execute('DELETE FROM two_factor_auth WHERE user_id = ?', [req.session.user.id]));

        logActivity(db, '2fa_disabled', 'user', String(req.session.user.id),
            `User ${req.session.user.username} disabled two-factor authentication`, req.session.user.id);

        res.json({ message: 'Two-factor authentication disabled.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// GET /api/auth/users — list all users (admin/manager)
// ================================================
router.get('/users', async (req, res) => {
    try {
        if (!req.session?.user || !['admin', 'manager'].includes(req.session.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }

        const db = await getDb();
        const users = (await db.query(`
            SELECT u.id, u.username, u.full_name, u.role, u.email, u.is_active, 
                   u.created_at, u.updated_at,
                   CASE WHEN t.is_enabled = 1 THEN 1 ELSE 0 END as has_2fa
            FROM users u
            LEFT JOIN two_factor_auth t ON u.id = t.user_id
            ORDER BY u.created_at DESC
        `))[0];

        res.json({ data: users, total: users.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// GET /api/auth/users/:id — get single user (admin)
// ================================================
router.get('/users/:id', async (req, res) => {
    try {
        if (!req.session?.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }

        const db = await getDb();
        const user = (await db.query(`
            SELECT u.id, u.username, u.full_name, u.role, u.email, u.is_active,
                   u.created_at, u.updated_at,
                   CASE WHEN t.is_enabled = 1 THEN 1 ELSE 0 END as has_2fa
            FROM users u
            LEFT JOIN two_factor_auth t ON u.id = t.user_id
            WHERE u.id = ?
        `, [req.params.id]))[0][0];

        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json({ data: user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// PUT /api/auth/users/:id — update user (admin)
// ================================================
router.put('/users/:id', async (req, res) => {
    try {
        if (!req.session?.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update users.' });
        }

        const db = await getDb();
        const existing = (await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'User not found.' });

        const { fullName, role, email, isActive, password } = req.body;

        // Validate role
        const validRoles = ['admin', 'manager', 'staff'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        // Update fields
        await db.execute(`
            UPDATE users SET 
                full_name = COALESCE(?, full_name),
                role = COALESCE(?, role),
                email = COALESCE(?, email),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [fullName, role, email, isActive !== undefined ? (isActive ? 1 : 0) : null, req.params.id]);

        // Update password if provided
        if (password && password.length >= 6) {
            const hashed = bcrypt.hashSync(password, 10);
            (await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]));
        }

        logActivity(db, 'user_updated', 'user', String(req.params.id),
            `User "${existing.username}" updated by ${req.session.user.username}`,
            req.session.user.id);

        const updated = (await db.query(`
            SELECT id, username, full_name, role, email, is_active, created_at, updated_at
            FROM users WHERE id = ?
        `, [req.params.id]))[0][0];

        res.json({ message: 'User updated.', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// DELETE /api/auth/users/:id — deactivate user (admin)
// ================================================
router.delete('/users/:id', async (req, res) => {
    try {
        if (!req.session?.user || req.session.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete users.' });
        }

        // Prevent self-deletion
        if (parseInt(req.params.id) === req.session.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }

        const db = await getDb();
        const existing = (await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]))[0][0];
        if (!existing) return res.status(404).json({ error: 'User not found.' });

        // Soft-delete: deactivate
        (await db.execute('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]));

        logActivity(db, 'user_deactivated', 'user', String(req.params.id),
            `User "${existing.username}" deactivated by ${req.session.user.username}`,
            req.session.user.id);

        res.json({ message: `User "${existing.username}" has been deactivated.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================
// GET /api/auth/activity-log — get activity log (admin/manager)
// ================================================
router.get('/activity-log', async (req, res) => {
    try {
        if (!req.session?.user || !['admin', 'manager'].includes(req.session.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }

        const db = await getDb();
        const { action, entityType, limit, offset } = req.query;
        const pageLimit = Math.min(parseInt(limit) || 50, 200);
        const pageOffset = parseInt(offset) || 0;

        let sql = `
            SELECT a.*, u.username as user_name, u.full_name as user_full_name
            FROM activity_log a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (action) {
            sql += ' AND a.action = ?';
            params.push(action);
        }
        if (entityType) {
            sql += ' AND a.entity_type = ?';
            params.push(entityType);
        }

        const countSql = sql.replace('SELECT a.*, u.username as user_name, u.full_name as user_full_name', 'SELECT COUNT(*) as count');
        const total = (await db.query(countSql, [...params]))[0][0].count;

        sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageLimit, pageOffset);

        const logs = (await db.query(sql, [...params]))[0];

        res.json({ data: logs, total, limit: pageLimit, offset: pageOffset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
