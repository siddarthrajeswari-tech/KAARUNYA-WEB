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

const EXAMPLE_PRICE_COMPARE_LIST = {
    'Cotton Saree': [
        { supplier: 'Anbu Textiles', price: 780, best: false },
        { supplier: 'Madura Fabrics', price: 740, best: true },
        { supplier: 'Sri Garments Hub', price: 790, best: false },
    ],
    'Designer Kurti': [
        { supplier: 'Anbu Textiles', price: 560, best: true },
        { supplier: 'Madura Fabrics', price: 585, best: false },
        { supplier: 'Sri Garments Hub', price: 575, best: false },
    ],
    'Kids Frock': [
        { supplier: 'Anbu Textiles', price: 320, best: false },
        { supplier: 'Madura Fabrics', price: 305, best: true },
        { supplier: 'Sri Garments Hub', price: 335, best: false },
    ],
};

function getListWithFallback(data) {
    return data && Object.keys(data).length ? data : EXAMPLE_PRICE_COMPARE_LIST;
}

function toFlatRows(groupedData) {
    const rows = [];
    Object.entries(groupedData).forEach(([product, suppliers]) => {
        const avg = suppliers.reduce((sum, s) => sum + Number(s.price || 0), 0) / suppliers.length;
        suppliers.forEach((s) => {
            const savings = Math.round(avg - Number(s.price || 0));
            const savingsPercent = avg > 0 ? ((avg - Number(s.price || 0)) / avg * 100).toFixed(1) : '0.0';
            rows.push({
                product_name: product,
                supplier_name: s.supplier,
                price: Number(s.price || 0),
                best: Boolean(s.best),
                savings,
                savingsPercent,
            });
        });
    });
    return rows;
}

async function loadComparisonCards() {
    try {
        const { data } = await API.priceCompare.list();
        const safeData = getListWithFallback(data);
        const grid = document.getElementById('comparisonGrid');

        grid.innerHTML = Object.entries(safeData).map(([product, suppliers]) => {
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
        const listResponse = await API.priceCompare.list();
        const listData = getListWithFallback(listResponse.data);
        const apiFlat = await API.priceCompare.flat();
        const data = Array.isArray(apiFlat.data) && apiFlat.data.length > 0
            ? apiFlat.data
            : toFlatRows(listData);
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
        const safeData = getListWithFallback(data);
        const products = Object.keys(safeData);

        const supplierStats = {};
        Object.values(safeData).forEach((sups) => {
            sups.forEach((s) => {
                if (!supplierStats[s.supplier]) {
                    supplierStats[s.supplier] = { count: 0 };
                }
                supplierStats[s.supplier].count += 1;
            });
        });

        let supplierList = Object.entries(supplierStats)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name]) => name)
            .slice(0, 4);

        if (supplierList.length === 0) {
            supplierList = ['No Data'];
        }

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
                const entry = safeData[prod].find(s => s.supplier === supplier);
                return entry ? entry.price : null;
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
