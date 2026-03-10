// ============================================
// KAARUNYA — Price Comparison Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    renderComparisonCards();
    renderPriceTable();
    renderPriceChart();
    updateAlertBadge();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (badge) badge.textContent = getLowStockProducts().length;
}

function renderComparisonCards() {
    const grid = document.getElementById('comparisonGrid');
    const comparisons = DATA.priceComparisons;

    grid.innerHTML = Object.entries(comparisons).map(([product, suppliers]) => {
        const rows = suppliers.map(s => `
            <div class="comparison-row">
                <span class="comparison-supplier">${s.supplier}</span>
                <span class="comparison-price ${s.best ? 'best' : ''}">${formatCurrency(s.price)}</span>
            </div>
        `).join('');

        const bestSupplier = suppliers.find(s => s.best);
        return `
        <div class="comparison-card">
            <div class="comparison-card-header">
                <h4><i class="fas fa-tshirt" style="margin-right: 8px; color: var(--clr-primary-500);"></i>${product}</h4>
                <p>Best: ${bestSupplier ? bestSupplier.supplier : 'N/A'}</p>
            </div>
            <div class="comparison-card-body">${rows}</div>
        </div>`;
    }).join('');
}

function renderPriceTable() {
    const tbody = document.getElementById('priceTableBody');
    const comparisons = DATA.priceComparisons;

    let rows = '';
    Object.entries(comparisons).forEach(([product, suppliers]) => {
        const avgPrice = suppliers.reduce((s, sup) => s + sup.price, 0) / suppliers.length;
        suppliers.forEach(s => {
            const savings = avgPrice - s.price;
            const savingsPct = ((savings / avgPrice) * 100).toFixed(1);
            rows += `
            <tr>
                <td class="product-name"><i class="fas fa-tshirt"></i> ${product}</td>
                <td>${s.supplier}</td>
                <td><strong>${formatCurrency(s.price)}</strong></td>
                <td>${s.best ? '<span class="status-badge active">✓ Best Price</span>' : '<span style="color: var(--clr-text-muted)">—</span>'}</td>
                <td style="color: ${savings > 0 ? 'var(--clr-success)' : savings < 0 ? 'var(--clr-danger)' : 'var(--clr-text-muted)'}">
                    ${savings > 0 ? '+' : ''}${formatCurrency(Math.round(savings))} (${savings > 0 ? '+' : ''}${savingsPct}%)
                </td>
            </tr>`;
        });
    });
    tbody.innerHTML = rows;
}

function renderPriceChart() {
    const ctx = document.getElementById('priceComparisonChart');
    if (!ctx) return;

    const comparisons = DATA.priceComparisons;
    const products = Object.keys(comparisons);

    // Get all unique suppliers
    const allSuppliers = new Set();
    Object.values(comparisons).forEach(sups => sups.forEach(s => allSuppliers.add(s.supplier)));
    const supplierList = Array.from(allSuppliers);

    const colors = [
        { bg: 'rgba(196, 168, 130, 0.7)', border: 'rgba(196, 168, 130, 1)' },
        { bg: 'rgba(212, 165, 116, 0.7)', border: 'rgba(212, 165, 116, 1)' },
        { bg: 'rgba(139, 115, 85, 0.7)', border: 'rgba(139, 115, 85, 1)' },
        { bg: 'rgba(107, 158, 118, 0.7)', border: 'rgba(107, 158, 118, 1)' },
        { bg: 'rgba(201, 115, 107, 0.7)', border: 'rgba(201, 115, 107, 1)' },
        { bg: 'rgba(107, 141, 168, 0.7)', border: 'rgba(107, 141, 168, 1)' },
    ];

    const datasets = supplierList.map((supplier, i) => ({
        label: supplier,
        data: products.map(prod => {
            const entry = comparisons[prod].find(s => s.supplier === supplier);
            return entry ? entry.price : 0;
        }),
        backgroundColor: colors[i % colors.length].bg,
        borderColor: colors[i % colors.length].border,
        borderWidth: 2,
        borderRadius: 6,
        barPercentage: 0.7,
    }));

    new Chart(ctx, {
        type: 'bar',
        data: { labels: products, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '₹' + v }
                },
                x: { grid: { display: false } }
            }
        }
    });
}
