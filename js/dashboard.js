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
        type: 'bar',
        data: {
            labels: DATA.monthlyPurchases.labels,
            datasets: [
                {
                    label: 'Purchase Amount (₹)',
                    data: DATA.monthlyPurchases.amounts,
                    backgroundColor: CHART_COLORS.primaryBg,
                    borderColor: CHART_COLORS.primary,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.6,
                },
                {
                    label: 'Number of Orders',
                    data: DATA.monthlyPurchases.counts.map(c => c * 10000),
                    type: 'line',
                    borderColor: CHART_COLORS.accent,
                    backgroundColor: CHART_COLORS.accentBg,
                    pointBackgroundColor: CHART_COLORS.accent,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y',
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
                            if (ctx.dataset.label.includes('Amount')) {
                                return ctx.dataset.label + ': ₹' + ctx.raw.toLocaleString('en-IN');
                            }
                            return 'Orders: ' + (ctx.raw / 10000);
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
        type: 'doughnut',
        data: {
            labels: DATA.stockByCategory.labels,
            datasets: [{
                data: DATA.stockByCategory.values,
                backgroundColor: [CHART_COLORS.primary, CHART_COLORS.accent],
                borderColor: '#fff',
                borderWidth: 4,
                hoverOffset: 10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom' },
            }
        }
    });
}

function renderFabricChart() {
    const ctx = document.getElementById('fabricChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'polarArea',
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
            plugins: {
                legend: { position: 'bottom' },
            },
            scales: {
                r: {
                    ticks: { display: false },
                    grid: { color: 'rgba(232,224,216,0.4)' },
                }
            }
        }
    });
}
