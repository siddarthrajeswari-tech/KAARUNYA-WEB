// ============================================
// KAARUNYA — Reports Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    computeKPIs();
    renderPurchaseTrendChart();
    renderFabricStockChart();
    renderSupplierVolumeChart();
    renderCategoryValueChart();
    renderSupplierPerformance();
    updateAlertBadge();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (badge) badge.textContent = getLowStockProducts().length;
}

function computeKPIs() {
    // Total purchase value
    const totalPurchase = DATA.monthlyPurchases.amounts.reduce((s, v) => s + v, 0);
    document.getElementById('totalPurchaseValue').textContent = formatCurrency(totalPurchase);

    // Total stock value
    const stockValue = DATA.products.reduce((s, p) => s + (p.stock * p.price), 0);
    document.getElementById('totalStockValue').textContent = formatCurrency(stockValue);

    // Average order value
    const avgOrder = DATA.purchaseOrders.reduce((s, o) => s + o.total, 0) / DATA.purchaseOrders.length;
    document.getElementById('avgOrderValue').textContent = formatCurrency(Math.round(avgOrder));

    // Turnover alerts
    document.getElementById('turnoverAlerts').textContent = getLowStockProducts().length;
}

function renderPurchaseTrendChart() {
    const ctx = document.getElementById('purchaseTrendChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: DATA.monthlyPurchases.labels,
            datasets: [{
                label: 'Purchase Amount (₹)',
                data: DATA.monthlyPurchases.amounts,
                borderColor: CHART_COLORS.primary,
                backgroundColor: CHART_COLORS.primaryBg,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: CHART_COLORS.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => 'Purchases: ' + formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '₹' + (v / 1000) + 'K' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderFabricStockChart() {
    const ctx = document.getElementById('fabricStockChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: DATA.fabricDistribution.labels,
            datasets: [{
                data: DATA.fabricDistribution.values,
                backgroundColor: CHART_COLORS.fabrics,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 12,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            cutout: '60%',
            plugins: {
                legend: { position: 'right' },
            }
        }
    });
}

function renderSupplierVolumeChart() {
    const ctx = document.getElementById('supplierVolumeChart');
    if (!ctx) return;

    // Aggregate order volume by supplier
    const supplierVolume = {};
    DATA.purchaseOrders.forEach(o => {
        const name = getSupplierName(o.supplier);
        supplierVolume[name] = (supplierVolume[name] || 0) + o.total;
    });

    const labels = Object.keys(supplierVolume);
    const values = Object.values(supplierVolume);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Order Volume (₹)',
                data: values,
                backgroundColor: labels.map((_, i) => CHART_COLORS.fabrics[i % CHART_COLORS.fabrics.length]),
                borderColor: labels.map((_, i) => CHART_COLORS.fabrics[i % CHART_COLORS.fabrics.length].replace('0.85', '1')),
                borderWidth: 2,
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => formatCurrency(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: v => '₹' + (v / 1000) + 'K' }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderCategoryValueChart() {
    const ctx = document.getElementById('categoryValueChart');
    if (!ctx) return;

    const womenValue = DATA.products.filter(p => p.category === 'Women').reduce((s, p) => s + p.stock * p.price, 0);
    const childValue = DATA.products.filter(p => p.category === 'Child').reduce((s, p) => s + p.stock * p.price, 0);

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Women', 'Child'],
            datasets: [{
                data: [womenValue, childValue],
                backgroundColor: [CHART_COLORS.primary, CHART_COLORS.accent],
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.label + ': ' + formatCurrency(ctx.raw)
                    }
                }
            }
        }
    });
}

function renderSupplierPerformance() {
    const tbody = document.getElementById('supplierPerfBody');

    // Compute per-supplier stats
    const supplierStats = {};
    DATA.purchaseOrders.forEach(o => {
        const name = getSupplierName(o.supplier);
        if (!supplierStats[name]) {
            supplierStats[name] = { orders: 0, totalValue: 0, delivered: 0 };
        }
        supplierStats[name].orders++;
        supplierStats[name].totalValue += o.total;
        if (o.status === 'Delivered') supplierStats[name].delivered++;
    });

    const ratingStars = (score) => {
        const full = Math.floor(score);
        const half = score - full >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        return '<span style="color: var(--clr-gold);">' +
            '★'.repeat(full) +
            (half ? '½' : '') +
            '<span style="color: var(--clr-border);">' + '★'.repeat(empty) + '</span></span>';
    };

    tbody.innerHTML = Object.entries(supplierStats)
        .sort((a, b) => b[1].totalValue - a[1].totalValue)
        .map(([name, stats]) => {
            const avgOrder = Math.round(stats.totalValue / stats.orders);
            const onTime = stats.orders > 0 ? Math.round((stats.delivered / stats.orders) * 100) : 0;
            const rating = Math.min(5, (onTime / 20) + (stats.orders > 2 ? 0.5 : 0));
            return `
            <tr>
                <td class="product-name"><i class="fas fa-building"></i> ${name}</td>
                <td>${stats.orders}</td>
                <td>${formatCurrency(stats.totalValue)}</td>
                <td>${formatCurrency(avgOrder)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; height: 6px; background: var(--clr-surface-alt); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${onTime}%; height: 100%; background: ${onTime >= 80 ? 'var(--clr-success)' : onTime >= 50 ? 'var(--clr-warning)' : 'var(--clr-danger)'}; border-radius: 3px;"></div>
                        </div>
                        <span style="font-size: 0.82rem; font-weight: 500;">${onTime}%</span>
                    </div>
                </td>
                <td>${ratingStars(rating)}</td>
            </tr>`;
        }).join('');
}
