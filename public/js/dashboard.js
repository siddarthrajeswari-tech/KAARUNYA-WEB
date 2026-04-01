// ============================================
// KAARUNYA — Dashboard Page Script (API-connected)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await Promise.all([
        loadSummaryCards(),
        loadCharts(),
        loadActivity(),
        loadTopProducts(),
        updateAlertBadge(),
    ]);
    initTableSort('topProductsTable');
});

const EXAMPLE_STOCK_BY_CATEGORY = {
    labels: ['Women', 'Child', 'Men', 'Accessories'],
    values: [298, 115, 86, 64],
};

function withStockFallback(data) {
    const hasLabels = Array.isArray(data?.labels) && data.labels.length > 0;
    const hasValues = Array.isArray(data?.values) && data.values.length > 0;
    const hasPositiveValue = hasValues && data.values.some(v => Number(v) > 0);

    if (hasLabels && hasValues && hasPositiveValue) {
        return data;
    }

    return EXAMPLE_STOCK_BY_CATEGORY;
}

async function loadSummaryCards() {
    try {
        const data = await API.dashboard.summary();
        document.getElementById('totalProducts').textContent = data.totalProducts;
        document.getElementById('totalSuppliers').textContent = data.activeSuppliers;
        document.getElementById('pendingOrders').textContent = data.pendingOrders;
        document.getElementById('lowStockCount').textContent = data.lowStockItems;
    } catch (e) {
        console.error('Failed to load summary:', e);
    }
}

async function loadCharts() {
    try {
        const [purchaseData, stockData, fabricData] = await Promise.all([
            API.reports.monthlyPurchases(12),
            API.reports.stockByCategory(),
            API.reports.fabricDistribution(),
        ]);
        renderPurchaseChart(purchaseData);
        renderStockChart(withStockFallback(stockData));
        renderFabricChart(fabricData);
    } catch (e) {
        console.error('Failed to load charts:', e);
        renderStockChart(EXAMPLE_STOCK_BY_CATEGORY);
    }
}

async function loadActivity() {
    try {
        const { data } = await API.dashboard.activity(5);
        const container = document.getElementById('activityList');
        if (!container || !data.length) return;

        const iconMap = {
            received: { icon: 'box', cls: 'received' },
            alert: { icon: 'exclamation', cls: 'alert' },
            created: { icon: 'plus', cls: 'new' },
            sent: { icon: 'paper-plane', cls: 'order' },
            updated: { icon: 'check-circle', cls: 'received' },
            deleted: { icon: 'trash', cls: 'alert' },
        };

        container.innerHTML = data.map(a => {
            const ic = iconMap[a.action] || { icon: 'info', cls: 'new' };
            const timeAgo = getTimeAgo(a.created_at);
            return `
            <div class="activity-item">
                <div class="activity-icon ${ic.cls}"><i class="fas fa-${ic.icon}"></i></div>
                <div class="activity-details">
                    <span class="activity-text">${a.description}</span>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load activity:', e);
    }
}

async function loadTopProducts() {
    try {
        const { data } = await API.dashboard.topProducts();
        const tbody = document.querySelector('#topProductsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = data.map(p => {
            const statusCls = p.status === 'In Stock' ? 'in-stock' : p.status === 'Low Stock' ? 'low-stock' : 'out-of-stock';
            return `
            <tr>
                <td class="product-name"><i class="fas fa-tshirt"></i> ${p.name}</td>
                <td><span class="category-badge ${p.category.toLowerCase()}">${p.category}</span></td>
                <td>${p.fabric}</td>
                <td>${p.stock}</td>
                <td>${formatCurrency(p.stock * p.price)}</td>
                <td><span class="status-badge ${statusCls}">${p.status}</span></td>
            </tr>`;
        }).join('');
    } catch (e) {
        console.error('Failed to load top products:', e);
    }
}

function getTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function renderPurchaseChart(data) {
    const ctx = document.getElementById('purchaseChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Purchase Amount (₹)',
                    data: data.amounts,
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primaryBg,
                    fill: true,
                    pointBackgroundColor: CHART_COLORS.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                    tension: 0.4,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 2,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ₹' + ctx.raw.toLocaleString('en-IN')
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => '₹' + (v / 1000) + 'K' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderStockChart(data) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    let chartData = withStockFallback(data);
    const normalizedValues = (chartData.values || []).map(v => Number(v) || 0);
    const hasVisibleBars = normalizedValues.some(v => v > 0);

    if (!hasVisibleBars) {
        chartData = EXAMPLE_STOCK_BY_CATEGORY;
    }

    const finalValues = (chartData.values || []).map(v => Number(v) || 0);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Stock Quantity',
                data: finalValues,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.85)',   // Blue
                    'rgba(236, 72, 153, 0.85)',   // Pink
                    'rgba(16, 185, 129, 0.85)',   // Green
                    'rgba(245, 158, 11, 0.85)'    // Orange
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 1,
                borderRadius: 8,
                maxBarThickness: 48,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { beginAtZero: true, suggestedMax: Math.max(...finalValues, 10) + 20 },
                x: { grid: { display: false } }
            },
        }
    });
}

function renderFabricChart(data) {
    const ctx = document.getElementById('fabricChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{ data: data.values, backgroundColor: CHART_COLORS.fabrics, borderColor: '#fff', borderWidth: 2 }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 1.5,
            cutout: '62%',
            plugins: { legend: { position: 'bottom' } },
        }
    });
}
