// ============================================
// KAARUNYA — API Client Layer
// Replaces in-memory DATA store with backend API calls
// ============================================

const API_BASE = window.API_BASE_URL || localStorage.getItem('API_BASE_URL') || '/api';

async function parseResponseBody(res) {
    const text = await res.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

function toApiErrorMessage(res, body) {
    if (body?.error) return body.error;
    if (res.status === 404 && typeof body?.raw === 'string' && body.raw.includes('<!DOCTYPE html>')) {
        return 'Backend API is not connected. Deploy backend separately and set API_BASE_URL.';
    }
    return res.statusText || 'Request failed';
}

const API = {
    // ---- Generic HTTP helpers ----
    async get(endpoint) {
        const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
        const body = await parseResponseBody(res);
        if (res.status === 401) {
            handleUnauthorized();
            throw new Error('Authentication required');
        }
        if (!res.ok) throw new Error(toApiErrorMessage(res, body));
        return body;
    },
    async post(endpoint, body) {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include',
        });
        const responseBody = await parseResponseBody(res);
        if (res.status === 401 && !endpoint.includes('/auth/')) {
            handleUnauthorized();
            throw new Error('Authentication required');
        }
        if (!res.ok) throw new Error(toApiErrorMessage(res, responseBody));
        return responseBody;
    },
    async put(endpoint, body) {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include',
        });
        const responseBody = await parseResponseBody(res);
        if (res.status === 401 && !endpoint.includes('/auth/')) {
            handleUnauthorized();
            throw new Error('Authentication required');
        }
        if (!res.ok) throw new Error(toApiErrorMessage(res, responseBody));
        return responseBody;
    },
    async delete(endpoint) {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        const body = await parseResponseBody(res);
        if (res.status === 401) {
            handleUnauthorized();
            throw new Error('Authentication required');
        }
        if (!res.ok) throw new Error(toApiErrorMessage(res, body));
        return body;
    },

    // ---- Auth ----
    auth: {
        login: (data) => API.post('/auth/login', data),
        logout: () => API.post('/auth/logout'),
        me: () => API.get('/auth/me'),
        register: (data) => API.post('/auth/register', data),
        changePassword: (data) => API.put('/auth/change-password', data),
        updateProfile: (data) => API.put('/auth/profile', data),
        forgotPassword: (data) => API.post('/auth/forgot-password', data),
        resetPassword: (data) => API.post('/auth/reset-password', data),
        // 2FA
        setup2FA: () => API.post('/auth/2fa/setup'),
        verify2FA: (data) => API.post('/auth/2fa/verify', data),
        disable2FA: (data) => API.post('/auth/2fa/disable', data),
        // User management
        listUsers: () => API.get('/auth/users'),
        getUser: (id) => API.get(`/auth/users/${id}`),
        updateUser: (id, data) => API.put(`/auth/users/${id}`, data),
        deleteUser: (id) => API.delete(`/auth/users/${id}`),
        // Activity log
        activityLog: (params) => API.get('/auth/activity-log' + buildQuery(params)),
    },

    // ---- Suppliers ----
    suppliers: {
        list: (params) => API.get('/suppliers' + buildQuery(params)),
        get: (id) => API.get(`/suppliers/${id}`),
        create: (data) => API.post('/suppliers', data),
        update: (id, data) => API.put(`/suppliers/${id}`, data),
        delete: (id) => API.delete(`/suppliers/${id}`),
    },

    // ---- Products ----
    products: {
        list: (params) => API.get('/products' + buildQuery(params)),
        get: (id) => API.get(`/products/${id}`),
        stats: () => API.get('/products/stats'),
        create: (data) => API.post('/products', data),
        update: (id, data) => API.put(`/products/${id}`, data),
        delete: (id) => API.delete(`/products/${id}`),
    },

    // ---- Purchase Orders ----
    orders: {
        list: (params) => API.get('/orders' + buildQuery(params)),
        get: (id) => API.get(`/orders/${id}`),
        stats: () => API.get('/orders/stats'),
        create: (data) => API.post('/orders', data),
        updateStatus: (id, status) => API.put(`/orders/${id}/status`, { status }),
        delete: (id) => API.delete(`/orders/${id}`),
    },

    // ---- Alerts ----
    alerts: {
        list: (params) => API.get('/alerts' + buildQuery(params)),
        count: () => API.get('/alerts/count'),
    },

    // ---- Price Comparison ----
    priceCompare: {
        list: () => API.get('/price-compare'),
        flat: () => API.get('/price-compare/flat'),
        create: (data) => API.post('/price-compare', data),
        update: (id, data) => API.put(`/price-compare/${id}`, data),
        delete: (id) => API.delete(`/price-compare/${id}`),
    },

    // ---- Reports ----
    reports: {
        monthlyPurchases: (months) => API.get(`/reports/monthly-purchases?months=${months || 12}`),
        stockByCategory: () => API.get('/reports/stock-by-category'),
        fabricDistribution: () => API.get('/reports/fabric-distribution'),
        supplierVolume: () => API.get('/reports/supplier-volume'),
        categoryValue: () => API.get('/reports/category-value'),
        supplierPerformance: () => API.get('/reports/supplier-performance'),
        kpis: () => API.get('/reports/kpis'),
    },

    // ---- Dashboard ----
    dashboard: {
        summary: () => API.get('/dashboard/summary'),
        activity: (limit) => API.get(`/dashboard/activity?limit=${limit || 10}`),
        topProducts: () => API.get('/dashboard/top-products'),
        getSettings: () => API.get('/dashboard/settings'),
        saveSettings: (data) => API.post('/dashboard/settings', data),
        exportDb: () => API.get('/dashboard/export'),
        resetDb: () => API.post('/dashboard/reset'),
    },
};

function buildQuery(params) {
    if (!params) return '';
    const qs = Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return qs ? `?${qs}` : '';
}

// ---- Handle unauthorized (redirect to login) ----
function handleUnauthorized() {
    if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
    }
}

// ---- Auth guard: call on every protected page ----
async function requireLogin() {
    try {
        const { user } = await API.auth.me();
        return user;
    } catch (e) {
        window.location.href = '/login.html';
        throw new Error('Not authenticated');
    }
}

// ---- Check role-based access ----
function checkAccess(user, allowedRoles) {
    if (!allowedRoles.includes(user.role)) {
        showToast('You do not have permission to access this page.', 'error');
        setTimeout(() => window.location.href = '/index.html', 1500);
        return false;
    }
    return true;
}

// ---- Utility functions (kept for backward compat) ----
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(dateStr);
}

// Chart color palette
const CHART_COLORS = {
    primary: 'rgba(59, 130, 246, 1)',
    primaryBg: 'rgba(59, 130, 246, 0.16)',
    brown: 'rgba(37, 99, 235, 1)',
    brownBg: 'rgba(37, 99, 235, 0.16)',
    accent: 'rgba(96, 165, 250, 1)',
    accentBg: 'rgba(96, 165, 250, 0.14)',
    danger: 'rgba(239, 68, 68, 1)',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    success: 'rgba(34, 197, 94, 1)',
    successBg: 'rgba(34, 197, 94, 0.15)',
    fabrics: [
        'rgba(236, 72, 153, 0.85)',   // Pink
        'rgba(139, 92, 246, 0.85)',   // Purple
        'rgba(16, 185, 129, 0.85)',   // Emerald Green
        'rgba(245, 158, 11, 0.85)',   // Amber
        'rgba(59, 130, 246, 0.85)',   // Blue
        'rgba(239, 68, 68, 0.85)',    // Red
    ],
};

// Default Chart.js settings
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.scale.grid = { color: 'rgba(226, 232, 240, 0.9)' };
    Chart.defaults.scale.border = { dash: [4, 4] };
}

// ---- Common UI functions ----
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('overlay');
    const settingsBtn = document.getElementById('settingsBtn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    if (toggle) {
        toggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            const notifPanel = document.getElementById('notificationPanel');
            if (notifPanel) notifPanel.classList.remove('active');
        });
    }
}

function initNotifications() {
    const btn = document.getElementById('notificationBtn');
    const panel = document.getElementById('notificationPanel');
    const overlay = document.getElementById('overlay');
    const markAll = document.getElementById('markAllRead');

    // Check localStorage for notification state
    const isNotificationsRead = localStorage.getItem('notificationsRead') === 'true';

    if (isNotificationsRead) {
        document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
        document.querySelectorAll('.notification-dot').forEach(el => {
            el.style.display = 'none';
        });
    }

    if (btn && panel) {
        btn.addEventListener('click', () => {
            panel.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    if (markAll) {
        markAll.addEventListener('click', () => {
            localStorage.setItem('notificationsRead', 'true');
            document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
            // Hide the notification dot
            document.querySelectorAll('.notification-dot').forEach(el => {
                el.style.display = 'none';
            });
        });
    }
}

async function updateAlertBadge() {
    try {
        const { count } = await API.alerts.count();
        const badge = document.getElementById('alertBadge');
        if (badge) badge.textContent = count;
    } catch (e) {
        console.warn('Could not update alert badge:', e);
    }
}

function initTableSort(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const headers = table.querySelectorAll('thead th');
    headers.forEach((th, idx) => {
        th.addEventListener('click', () => {
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const isAsc = th.classList.contains('sort-asc');
            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            rows.sort((a, b) => {
                const aVal = a.cells[idx]?.textContent.trim() || '';
                const bVal = b.cells[idx]?.textContent.trim() || '';
                const aNum = parseFloat(aVal.replace(/[₹,]/g, ''));
                const bNum = parseFloat(bVal.replace(/[₹,]/g, ''));
                if (!isNaN(aNum) && !isNaN(bNum)) return isAsc ? bNum - aNum : aNum - bNum;
                return isAsc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
            });
            th.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
            rows.forEach(r => tbody.appendChild(r));
        });
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ---- Logout handler ----
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to logout?')) return;
            try {
                await API.auth.logout();
                showToast('Logged out successfully');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 500);
            } catch (e) {
                // Even if API fails, redirect to login
                window.location.href = '/login.html';
            }
        });
    }
}

// ---- Load logged-in user info into sidebar + apply role-based visibility ----
async function loadSidebarUser() {
    try {
        const { user } = await API.auth.me();
        const nameEl = document.getElementById('sidebarUserName');
        const roleEl = document.getElementById('sidebarUserRole');
        if (nameEl) nameEl.textContent = user.fullName || user.full_name;
        if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        // Role-based nav visibility
        applyRoleBasedNav(user.role);

        return user;
    } catch (e) {
        // Not logged in — redirect
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = '/login.html';
        }
    }
}

// ---- Apply role-based navigation visibility ----
function applyRoleBasedNav(role) {
    // Users link: admin/manager only
    const usersNav = document.getElementById('nav-users');
    if (usersNav) {
        usersNav.closest('li').style.display = ['admin', 'manager'].includes(role) ? '' : 'none';
    }

    // Activity log link: admin/manager only
    const activityNav = document.getElementById('nav-activity-log');
    if (activityNav) {
        activityNav.closest('li').style.display = ['admin', 'manager'].includes(role) ? '' : 'none';
    }

    // Staff can only view, not create/edit for some sections
    if (role === 'staff') {
        document.querySelectorAll('.admin-only, .manager-only').forEach(el => el.style.display = 'none');
    }
    if (role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}
