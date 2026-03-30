// ============================================
// KAARUNYA — Shared Data Store
// ============================================

const DATA = {
    // ---- Suppliers ----
    suppliers: [
        { id: 'SUP-001', name: 'Silk Route Fabrics',   address: '12 Anna Nagar, Chennai',        phone: '+91 98765 43210', email: 'info@silkroute.in',     status: 'Active' },
        { id: 'SUP-002', name: 'Linen World',          address: '45 MG Road, Bangalore',          phone: '+91 98765 43211', email: 'orders@linenworld.co',  status: 'Active' },
        { id: 'SUP-003', name: 'Cotton Crafts India',  address: '78 Textile Nagar, Coimbatore',   phone: '+91 98765 43212', email: 'sales@cottoncrafts.in',  status: 'Active' },
        { id: 'SUP-004', name: 'Denim Dreams',         address: '23 Industrial Area, Ahmedabad',  phone: '+91 98765 43213', email: 'hello@denimdreams.com',  status: 'Active' },
        { id: 'SUP-005', name: 'Rayon Republic',       address: '90 Fabric Lane, Surat',          phone: '+91 98765 43214', email: 'contact@rayonrep.in',    status: 'Active' },
        { id: 'SUP-006', name: 'Fabric Paradise',      address: '34 Silk Street, Varanasi',       phone: '+91 98765 43215', email: 'info@fabricparadise.in', status: 'Active' },
        { id: 'SUP-007', name: 'Weave Masters',        address: '67 Loom Colony, Erode',          phone: '+91 98765 43216', email: 'sales@weavemasters.in',  status: 'Inactive' },
        { id: 'SUP-008', name: 'Heritage Textiles',    address: '11 Heritage Rd, Jaipur',         phone: '+91 98765 43217', email: 'info@heritagetex.co',    status: 'Active' },
        { id: 'SUP-009', name: 'Southern Silks',       address: '55 Temple St, Kanchipuram',      phone: '+91 98765 43218', email: 'orders@southernsilks.in',status: 'Active' },
        { id: 'SUP-010', name: 'Modern Fabrics Co',    address: '22 New Town, Kolkata',           phone: '+91 98765 43219', email: 'hello@modernfab.co',     status: 'Inactive' },
    ],

    // ---- Products ----
    products: [
        { id: 'PRD-001', name: 'Silk Saree - Royal Blue',     category: 'Women', fabric: 'Silk',   stock: 45,  minStock: 10, price: 2500, supplier: 'SUP-001' },
        { id: 'PRD-002', name: 'Cotton Kurti - Floral',       category: 'Women', fabric: 'Cotton', stock: 28,  minStock: 15, price: 850,  supplier: 'SUP-003' },
        { id: 'PRD-003', name: 'Denim Frock - Pink',          category: 'Child', fabric: 'Denim',  stock: 5,   minStock: 10, price: 650,  supplier: 'SUP-004' },
        { id: 'PRD-004', name: 'Rayon Palazzo Set',           category: 'Women', fabric: 'Rayon',  stock: 62,  minStock: 20, price: 1200, supplier: 'SUP-005' },
        { id: 'PRD-005', name: 'Linen Lehenga - Child',       category: 'Child', fabric: 'Linen',  stock: 18,  minStock: 8,  price: 1800, supplier: 'SUP-002' },
        { id: 'PRD-006', name: 'Cotton Anarkali Suit',        category: 'Women', fabric: 'Cotton', stock: 3,   minStock: 10, price: 1400, supplier: 'SUP-003' },
        { id: 'PRD-007', name: 'Silk Churidar - Gold',        category: 'Women', fabric: 'Silk',   stock: 35,  minStock: 10, price: 2200, supplier: 'SUP-009' },
        { id: 'PRD-008', name: 'Rayon Frock - Floral',        category: 'Child', fabric: 'Rayon',  stock: 7,   minStock: 10, price: 550,  supplier: 'SUP-005' },
        { id: 'PRD-009', name: 'Linen A-Line Kurti',          category: 'Women', fabric: 'Linen',  stock: 42,  minStock: 12, price: 980,  supplier: 'SUP-002' },
        { id: 'PRD-010', name: 'Denim Jacket - Teen',         category: 'Child', fabric: 'Denim',  stock: 2,   minStock: 8,  price: 950,  supplier: 'SUP-004' },
        { id: 'PRD-011', name: 'Silk Pattu Pavadai',          category: 'Child', fabric: 'Silk',   stock: 25,  minStock: 10, price: 1600, supplier: 'SUP-001' },
        { id: 'PRD-012', name: 'Cotton Maxi Dress',           category: 'Women', fabric: 'Cotton', stock: 30,  minStock: 15, price: 1100, supplier: 'SUP-003' },
        { id: 'PRD-013', name: 'Rayon Wrap Dress',            category: 'Women', fabric: 'Rayon',  stock: 4,   minStock: 10, price: 1350, supplier: 'SUP-005' },
        { id: 'PRD-014', name: 'Linen Jumpsuit - Kids',       category: 'Child', fabric: 'Linen',  stock: 20,  minStock: 8,  price: 780,  supplier: 'SUP-002' },
        { id: 'PRD-015', name: 'Silk Gown - Bridal',          category: 'Women', fabric: 'Silk',   stock: 12,  minStock: 5,  price: 5500, supplier: 'SUP-009' },
        { id: 'PRD-016', name: 'Cotton Pinafore - Child',     category: 'Child', fabric: 'Cotton', stock: 38,  minStock: 15, price: 450,  supplier: 'SUP-003' },
        { id: 'PRD-017', name: 'Denim Skirt - Women',         category: 'Women', fabric: 'Denim',  stock: 22,  minStock: 10, price: 750,  supplier: 'SUP-004' },
        { id: 'PRD-018', name: 'Rayon Sharara Set',           category: 'Women', fabric: 'Rayon',  stock: 15,  minStock: 10, price: 1600, supplier: 'SUP-005' },
    ],

    // ---- Purchase Orders ----
    purchaseOrders: [
        { id: 'PO-2026-038', supplier: 'SUP-001', date: '2026-01-15', items: [{ product: 'PRD-001', qty: 20, unitPrice: 1800 }, { product: 'PRD-011', qty: 15, unitPrice: 1100 }], status: 'Delivered', total: 52500 },
        { id: 'PO-2026-039', supplier: 'SUP-003', date: '2026-01-22', items: [{ product: 'PRD-002', qty: 30, unitPrice: 550 }, { product: 'PRD-006', qty: 20, unitPrice: 950 }], status: 'Delivered', total: 35500 },
        { id: 'PO-2026-040', supplier: 'SUP-004', date: '2026-02-05', items: [{ product: 'PRD-003', qty: 25, unitPrice: 400 }], status: 'Delivered', total: 10000 },
        { id: 'PO-2026-041', supplier: 'SUP-002', date: '2026-02-12', items: [{ product: 'PRD-005', qty: 15, unitPrice: 1300 }, { product: 'PRD-009', qty: 20, unitPrice: 680 }], status: 'Ordered', total: 33100 },
        { id: 'PO-2026-042', supplier: 'SUP-001', date: '2026-02-20', items: [{ product: 'PRD-007', qty: 10, unitPrice: 1600 }], status: 'Delivered', total: 16000 },
        { id: 'PO-2026-043', supplier: 'SUP-002', date: '2026-02-25', items: [{ product: 'PRD-014', qty: 15, unitPrice: 520 }], status: 'Ordered', total: 7800 },
        { id: 'PO-2026-044', supplier: 'SUP-005', date: '2026-03-01', items: [{ product: 'PRD-004', qty: 30, unitPrice: 820 }, { product: 'PRD-013', qty: 20, unitPrice: 920 }], status: 'Pending', total: 43000 },
        { id: 'PO-2026-045', supplier: 'SUP-003', date: '2026-03-02', items: [{ product: 'PRD-012', qty: 25, unitPrice: 750 }], status: 'Pending', total: 18750 },
        { id: 'PO-2026-046', supplier: 'SUP-004', date: '2026-03-03', items: [{ product: 'PRD-010', qty: 20, unitPrice: 620 }, { product: 'PRD-017', qty: 15, unitPrice: 480 }], status: 'Pending', total: 19600 },
    ],

    // ---- Price Comparisons ----
    priceComparisons: {
        'Cotton Kurti': [
            { supplier: 'Cotton Crafts India', price: 550, best: true },
            { supplier: 'Heritage Textiles', price: 610 },
            { supplier: 'Modern Fabrics Co', price: 640 },
        ],
        'Silk Saree': [
            { supplier: 'Silk Route Fabrics', price: 1800, best: true },
            { supplier: 'Southern Silks', price: 1950 },
            { supplier: 'Fabric Paradise', price: 2100 },
        ],
        'Rayon Palazzo Set': [
            { supplier: 'Rayon Republic', price: 820, best: true },
            { supplier: 'Fabric Paradise', price: 880 },
            { supplier: 'Heritage Textiles', price: 920 },
        ],
        'Denim Frock': [
            { supplier: 'Denim Dreams', price: 400, best: true },
            { supplier: 'Modern Fabrics Co', price: 440 },
            { supplier: 'Heritage Textiles', price: 475 },
        ],
        'Linen Lehenga': [
            { supplier: 'Linen World', price: 1300, best: true },
            { supplier: 'Fabric Paradise', price: 1380 },
            { supplier: 'Heritage Textiles', price: 1420 },
        ],
        'Cotton Anarkali': [
            { supplier: 'Cotton Crafts India', price: 950 },
            { supplier: 'Heritage Textiles', price: 920, best: true },
            { supplier: 'Fabric Paradise', price: 980 },
        ],
    },

    // ---- Monthly Purchase Data (for charts) ----
    monthlyPurchases: {
        labels: ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb'],
        amounts: [42000, 38000, 55000, 48000, 61000, 52000, 47000, 58000, 63000, 72000, 85000, 95000],
        counts:  [4, 3, 5, 4, 6, 4, 3, 5, 6, 7, 8, 9],
    },

    // ---- Stock by Category ----
    stockByCategory: {
        labels: ['Women', 'Child'],
        values: [298, 115],
    },

    // ---- Fabric Distribution ----
    fabricDistribution: {
        labels: ['Cotton', 'Rayon', 'Silk', 'Linen', 'Denim'],
        values: [99, 88, 117, 80, 29],
    },
};

// ---- Helper functions ----
function getSupplierName(id) {
    const s = DATA.suppliers.find(s => s.id === id);
    return s ? s.name : id;
}

function getProductName(id) {
    const p = DATA.products.find(p => p.id === id);
    return p ? p.name : id;
}

function getLowStockProducts() {
    return DATA.products.filter(p => p.stock <= p.minStock);
}

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---- Common UI Functions ----
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const overlay = document.getElementById('overlay');
    const settingsBtn = document.getElementById('settingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'login.html';
            }
        });
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
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

    if (btn && panel) {
        btn.addEventListener('click', () => {
            panel.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    if (markAll) {
        markAll.addEventListener('click', () => {
            // Clear all notifications with fade out animation
            const notificationList = document.querySelector('.notification-list');
            const items = document.querySelectorAll('.notification-item');
            
            items.forEach((item, index) => {
                setTimeout(() => {
                    item.style.animation = 'fadeOut 0.3s ease forwards';
                    setTimeout(() => item.remove(), 300);
                }, index * 50);
            });

            // Show empty state message after a short delay
            setTimeout(() => {
                if (notificationList && notificationList.children.length === 0) {
                    notificationList.innerHTML = '<div class="empty-notification"><p>All notifications cleared</p></div>';
                    setTimeout(() => {
                        const emptyMsg = document.querySelector('.empty-notification');
                        if (emptyMsg) {
                            emptyMsg.style.animation = 'fadeOut 0.3s ease forwards';
                            setTimeout(() => emptyMsg.remove(), 300);
                        }
                    }, 2000);
                }
            }, items.length * 50 + 100);
        });
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

            headers.forEach(h => { h.classList.remove('sort-asc', 'sort-desc'); });

            rows.sort((a, b) => {
                const aVal = a.cells[idx].textContent.trim();
                const bVal = b.cells[idx].textContent.trim();
                const aNum = parseFloat(aVal.replace(/[₹,]/g, ''));
                const bNum = parseFloat(bVal.replace(/[₹,]/g, ''));
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return isAsc ? bNum - aNum : aNum - bNum;
                }
                return isAsc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
            });

            th.classList.add(isAsc ? 'sort-desc' : 'sort-asc');
            rows.forEach(r => tbody.appendChild(r));
        });
    });
}

// Chart color palette
const CHART_COLORS = {
    primary:    'rgba(59, 130, 246, 1)',
    primaryBg:  'rgba(59, 130, 246, 0.16)',
    brown:      'rgba(37, 99, 235, 1)',
    brownBg:    'rgba(37, 99, 235, 0.16)',
    accent:     'rgba(96, 165, 250, 1)',
    accentBg:   'rgba(96, 165, 250, 0.14)',
    danger:     'rgba(239, 68, 68, 1)',
    dangerBg:   'rgba(239, 68, 68, 0.15)',
    success:    'rgba(34, 197, 94, 1)',
    successBg:  'rgba(34, 197, 94, 0.15)',
    fabrics: [
        'rgba(247, 144, 77, 0.9)',     // Cotton - Orange
        'rgba(168, 85, 247, 0.9)',     // Rayon - Purple
        'rgba(236, 72, 153, 0.9)',     // Silk - Pink/Rose
        'rgba(34, 197, 94, 0.9)',      // Linen - Green
        'rgba(59, 130, 246, 0.9)',     // Denim - Blue
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
