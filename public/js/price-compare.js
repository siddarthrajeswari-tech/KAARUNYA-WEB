// ============================================
// KAARUNYA — Price Comparison Page Script (API-connected)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await Promise.all([
        loadComparisonCards(),
        loadPriceTable(),
        loadPriceChart(),
        updateAlertBadge(),
    ]);
});

async function loadComparisonCards() {
    try {
        const { data } = await API.priceCompare.list();
        const grid = document.getElementById('comparisonGrid');

        grid.innerHTML = Object.entries(data).map(([product, suppliers]) => {
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
    } catch (e) {
        console.error('Failed to load comparisons:', e);
    }
}

async function loadPriceTable() {
    try {
        const { data } = await API.priceCompare.flat();
        const tbody = document.getElementById('priceTableBody');

        tbody.innerHTML = data.map(r => `
            <tr>
                <td class="product-name"><i class="fas fa-tshirt"></i> ${r.product_name}</td>
                <td>${r.supplier_name}</td>
                <td><strong>${formatCurrency(r.price)}</strong></td>
                <td>${r.best ? '<span class="status-badge active">✓ Best Price</span>' : '<span style="color: var(--clr-text-muted)">—</span>'}</td>
                <td style="color: ${r.savings > 0 ? 'var(--clr-success)' : r.savings < 0 ? 'var(--clr-danger)' : 'var(--clr-text-muted)'}">
                    ${r.savings > 0 ? '+' : ''}${formatCurrency(r.savings)} (${r.savings > 0 ? '+' : ''}${r.savingsPercent}%)
                </td>
            </tr>`).join('');
    } catch (e) {
        console.error('Failed to load price table:', e);
    }
}

async function loadPriceChart() {
    const ctx = document.getElementById('priceComparisonChart');
    if (!ctx) return;

    try {
        const { data } = await API.priceCompare.list();
        const products = Object.keys(data);

        const allSuppliers = new Set();
        Object.values(data).forEach(sups => sups.forEach(s => allSuppliers.add(s.supplier)));
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
                const entry = data[prod].find(s => s.supplier === supplier);
                return entry ? entry.price : 0;
            }),
            backgroundColor: colors[i % colors.length].bg,
            borderColor: colors[i % colors.length].border,
            borderWidth: 2, borderRadius: 6, barPercentage: 0.7,
        }));

        new Chart(ctx, {
            type: 'bar',
            data: { labels: products, datasets },
            options: {
                responsive: true, maintainAspectRatio: true, aspectRatio: 2.5,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => '₹' + v } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (e) {
        console.error('Failed to load price chart:', e);
    }
}
