// ============================================
// KAARUNYA — Low Stock Alerts Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    renderAlerts();
    initAlertFilters();
    initTableSort('alertTable');
    updateAlertBadge();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (badge) badge.textContent = getLowStockProducts().length;
}

function getSeverity(product) {
    if (product.stock <= 3) return 'critical';
    return 'warning';
}

function renderAlerts(filteredData) {
    const lowStock = filteredData || getLowStockProducts();
    const container = document.getElementById('alertCardsContainer');
    const tbody = document.getElementById('alertTableBody');
    const countEl = document.getElementById('alertCount');

    if (countEl) countEl.textContent = `${lowStock.length} items below minimum stock level`;

    // Sort: critical first
    lowStock.sort((a, b) => a.stock - b.stock);

    // Render cards
    container.innerHTML = lowStock.map((p, i) => {
        const severity = getSeverity(p);
        const fillPct = Math.max((p.stock / p.minStock) * 100, 5);
        const reorderUrl = `orders.html?reorder=${p.id}&supplier=${p.supplier}`;
        return `
        <div class="alert-card ${severity}" style="animation-delay: ${i * 0.08}s">
            <div class="alert-card-header">
                <span class="alert-severity ${severity}">${severity === 'critical' ? '⚠ Critical' : '⚡ Warning'}</span>
                <span class="category-badge ${p.category.toLowerCase()}">${p.category}</span>
            </div>
            <div class="alert-product">${p.name}</div>
            <div class="alert-details">
                <span><i class="fas fa-layer-group"></i> Current Stock: <strong>${p.stock}</strong> / Min: ${p.minStock}</span>
                <span><i class="fas fa-arrow-down"></i> Deficit: <strong style="color: var(--clr-danger);">${p.minStock - p.stock} units</strong></span>
                <span><i class="fas fa-truck"></i> Supplier: ${getSupplierName(p.supplier)}</span>
                <span><i class="fas fa-tag"></i> Fabric: ${p.fabric}</span>
            </div>
            <div class="alert-meta">
                <div class="alert-stock-bar">
                    <div class="alert-stock-fill ${severity}" style="width: ${fillPct}%"></div>
                </div>
                <a href="${reorderUrl}" class="btn btn-sm btn-primary"><i class="fas fa-redo"></i> Reorder</a>
            </div>
        </div>`;
    }).join('');

    // Render table
    tbody.innerHTML = lowStock.map(p => {
        const severity = getSeverity(p);
        const reorderUrl = `orders.html?reorder=${p.id}&supplier=${p.supplier}`;
        return `
        <tr>
            <td class="product-name"><i class="fas fa-tshirt"></i> ${p.name}</td>
            <td><span class="category-badge ${p.category.toLowerCase()}">${p.category}</span></td>
            <td>${p.fabric}</td>
            <td><strong style="color: var(--clr-danger);">${p.stock}</strong></td>
            <td>${p.minStock}</td>
            <td><strong>${p.minStock - p.stock}</strong></td>
            <td>${getSupplierName(p.supplier)}</td>
            <td><span class="alert-severity ${severity}">${severity === 'critical' ? 'Critical' : 'Warning'}</span></td>
            <td><a href="${reorderUrl}" class="btn btn-sm btn-primary" title="Reorder this product"><i class="fas fa-redo"></i> Reorder</a></td>
        </tr>`;
    }).join('');
}

function initAlertFilters() {
    const severityFilter = document.getElementById('severityFilter');
    const fabricFilter = document.getElementById('alertFabricFilter');

    function applyFilters() {
        let data = getLowStockProducts();
        const severity = severityFilter.value;
        const fabric = fabricFilter.value;
        if (severity === 'critical') data = data.filter(p => p.stock <= 3);
        if (severity === 'warning') data = data.filter(p => p.stock > 3);
        if (fabric) data = data.filter(p => p.fabric === fabric);
        renderAlerts(data);
    }

    severityFilter.addEventListener('change', applyFilters);
    fabricFilter.addEventListener('change', applyFilters);
}
