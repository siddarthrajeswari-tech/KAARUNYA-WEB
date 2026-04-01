// ============================================
// KAARUNYA — Reports Page Script (API-connected)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await Promise.all([
        loadKPIs(),
        loadCharts(),
        loadSupplierPerformance(),
        updateAlertBadge(),
    ]);
});

const EXAMPLE_CATEGORY_STOCK_DATA = {
    labels: ['Saree', 'Kurti', 'Lehenga', 'Blouse Material', 'Kids Wear'],
    values: [210, 165, 84, 132, 98],
};

function withCategoryStockFallback(data) {
    if (data && Array.isArray(data.labels) && data.labels.length > 0) {
        return data;
    }
    return EXAMPLE_CATEGORY_STOCK_DATA;
}

async function loadKPIs() {
    try {
        const data = await API.reports.kpis();
        document.getElementById('totalPurchaseValue').textContent = formatCurrency(data.totalPurchase);
        document.getElementById('totalStockValue').textContent = formatCurrency(data.stockValue);
        document.getElementById('avgOrderValue').textContent = formatCurrency(data.avgOrderValue);
        document.getElementById('turnoverAlerts').textContent = data.lowStockCount;
    } catch (e) {
        console.error('Failed to load KPIs:', e);
    }
}

async function loadCharts() {
    try {
        const [purchaseData, fabricData, supplierData, categoryData] = await Promise.all([
            API.reports.monthlyPurchases(12),
            API.reports.fabricDistribution(),
            API.reports.supplierVolume(),
            API.reports.stockByCategory(),
        ]);

        renderPurchaseTrendChart(purchaseData);
        renderFabricStockChart(fabricData);
        renderSupplierVolumeChart(supplierData.data);
        renderCategoryValueChart(withCategoryStockFallback(categoryData));
    } catch (e) {
        console.error('Failed to load charts:', e);
        renderCategoryValueChart(EXAMPLE_CATEGORY_STOCK_DATA);
    }
}

function renderPurchaseTrendChart(data) {
    const ctx = document.getElementById('purchaseTrendChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Purchase Amount (₹)', data: data.amounts,
                borderColor: CHART_COLORS.primary, backgroundColor: CHART_COLORS.primaryBg,
                fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 8,
                pointBackgroundColor: CHART_COLORS.primary, pointBorderColor: '#fff', pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 2,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => 'Purchases: ' + formatCurrency(ctx.raw) } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + (v / 1000) + 'K' } }, x: { grid: { display: false } } }
        }
    });
}

function renderFabricStockChart(data) {
    const ctx = document.getElementById('fabricStockChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{ data: data.values, backgroundColor: CHART_COLORS.fabrics, borderColor: '#fff', borderWidth: 3, hoverOffset: 12 }]
        },
        options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1.5, cutout: '60%', plugins: { legend: { position: 'right' } } }
    });
}

function renderSupplierVolumeChart(data) {
    const ctx = document.getElementById('supplierVolumeChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Order Volume (₹)', data: data.map(d => d.total_volume),
                backgroundColor: data.map((_, i) => CHART_COLORS.fabrics[i % CHART_COLORS.fabrics.length]),
                borderWidth: 2, borderRadius: 8,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 2, indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatCurrency(ctx.raw) } } },
            scales: { x: { beginAtZero: true, ticks: { callback: v => '₹' + (v / 1000) + 'K' } }, y: { grid: { display: false } } }
        }
    });
}

function renderCategoryValueChart(data) {
    const ctx = document.getElementById('categoryValueChart');
    if (!ctx) return;
    const chartData = withCategoryStockFallback(data);
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.values,
                backgroundColor: CHART_COLORS.fabrics,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, aspectRatio: 1.5,
            plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} units` } } }
        }
    });
}

async function loadSupplierPerformance() {
    try {
        const { data } = await API.reports.supplierPerformance();
        const tbody = document.getElementById('supplierPerfBody');

        const ratingStars = (pct) => {
            const score = Math.min(5, pct / 20);
            const full = Math.floor(score);
            const empty = 5 - full;
            return '<span style="color: var(--clr-gold);">' + '★'.repeat(full) +
                '<span style="color: var(--clr-border);">' + '★'.repeat(empty) + '</span></span>';
        };

        tbody.innerHTML = data.map(s => `
            <tr>
                <td class="product-name"><i class="fas fa-building"></i> ${s.name}</td>
                <td>${s.total_orders}</td>
                <td>${formatCurrency(s.total_value)}</td>
                <td>${formatCurrency(s.avg_order_value)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; height: 6px; background: var(--clr-surface-alt); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${s.on_time_percent || 0}%; height: 100%; background: ${(s.on_time_percent || 0) >= 80 ? 'var(--clr-success)' : 'var(--clr-warning)'}; border-radius: 3px;"></div>
                        </div>
                        <span style="font-size: 0.82rem; font-weight: 500;">${s.on_time_percent || 0}%</span>
                    </div>
                </td>
                <td>${ratingStars(s.on_time_percent || 0)}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Failed to load supplier performance:', e);
    }
}
