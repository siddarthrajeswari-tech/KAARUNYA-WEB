// ============================================
// KAARUNYA — Dashboard Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    initTableSort('topProductsTable');
    renderPurchaseChart();
    renderStockChart();
    renderFabricChart();
    updateAlertBadge();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    const low = getLowStockProducts();
    if (badge) badge.textContent = low.length;
    const countEl = document.getElementById('lowStockCount');
    if (countEl) countEl.textContent = low.length;
}

function renderPurchaseChart() {
    const ctx = document.getElementById('purchaseChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: DATA.monthlyPurchases.labels,
            datasets: [
                {
                    label: 'Purchase Amount (₹)',
                    data: DATA.monthlyPurchases.amounts,
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
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return ctx.dataset.label + ': ₹' + ctx.raw.toLocaleString('en-IN');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => '₹' + (v / 1000) + 'K'
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderStockChart() {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DATA.stockByCategory.labels,
            datasets: [{
                data: DATA.stockByCategory.values,
                backgroundColor: [
                    'rgba(37, 99, 235, 0.9)',
                    'rgba(59, 130, 246, 0.85)',
                    'rgba(96, 165, 250, 0.8)',
                    'rgba(147, 197, 253, 0.75)'
                ],
                borderColor: [
                    'rgba(37, 99, 235, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(96, 165, 250, 1)',
                    'rgba(147, 197, 253, 1)'
                ],
                borderWidth: 1,
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: { position: 'bottom' },
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            },
        }
    });
}

function renderFabricChart() {
    const ctx = document.getElementById('fabricChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: DATA.fabricDistribution.labels,
            datasets: [{
                data: DATA.fabricDistribution.values,
                backgroundColor: CHART_COLORS.fabrics,
                borderColor: '#fff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            cutout: '62%',
            plugins: {
                legend: { position: 'bottom' },
            }
        }
    });
}
