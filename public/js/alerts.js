// ============================================
// KAARUNYA — Low Stock Alerts Page Script (API-connected)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await loadAlerts();
    initAlertFilters();
    initTableSort('alertTable');
    updateAlertBadge();
});

async function loadAlerts(params) {
    try {
        const data = await API.alerts.list(params);
        renderAlerts(data.data);
    } catch (e) {
        console.error('Failed to load alerts:', e);
        showToast('Failed to load alerts', 'error');
    }
}

function renderAlerts(alerts) {
    const container = document.getElementById('alertCardsContainer');
    const tbody = document.getElementById('alertTableBody');
    const countEl = document.getElementById('alertCount');

    if (countEl) countEl.textContent = `${alerts.length} items below minimum stock level`;

    container.innerHTML = alerts.map((p, i) => {
        const fillPct = Math.max((p.stock / p.min_stock) * 100, 5);
        const reorderUrl = `orders.html?reorder=${p.id}&supplier=${p.supplier_id}`;
        return `
        <div class="alert-card ${p.severity}" style="animation-delay: ${i * 0.08}s">
            <div class="alert-card-header">
                <span class="alert-severity ${p.severity}">${p.severity === 'critical' ? '⚠ Critical' : '⚡ Warning'}</span>
                <span class="category-badge ${p.category.toLowerCase()}">${p.category}</span>
            </div>
            <div class="alert-product">${p.name}</div>
            <div class="alert-details">
                <span><i class="fas fa-layer-group"></i> Current Stock: <strong>${p.stock}</strong> / Min: ${p.min_stock}</span>
                <span><i class="fas fa-arrow-down"></i> Deficit: <strong style="color: var(--clr-danger);">${p.deficit} units</strong></span>
                <span><i class="fas fa-truck"></i> Supplier: ${p.supplier_name || '—'}</span>
                <span><i class="fas fa-tag"></i> Fabric: ${p.fabric}</span>
            </div>
            <div class="alert-meta">
                <div class="alert-stock-bar">
                    <div class="alert-stock-fill ${p.severity}" style="width: ${fillPct}%"></div>
                </div>
                <a href="${reorderUrl}" class="btn btn-sm btn-primary"><i class="fas fa-redo"></i> Reorder</a>
            </div>
        </div>`;
    }).join('');

    tbody.innerHTML = alerts.map(p => {
        const reorderUrl = `orders.html?reorder=${p.id}&supplier=${p.supplier_id}`;
        return `
        <tr>
            <td class="product-name"><i class="fas fa-tshirt"></i> ${p.name}</td>
            <td><span class="category-badge ${p.category.toLowerCase()}">${p.category}</span></td>
            <td>${p.fabric}</td>
            <td><strong style="color: var(--clr-danger);">${p.stock}</strong></td>
            <td>${p.min_stock}</td>
            <td><strong>${p.deficit}</strong></td>
            <td>${p.supplier_name || '—'}</td>
            <td><span class="alert-severity ${p.severity}">${p.severity === 'critical' ? 'Critical' : 'Warning'}</span></td>
            <td><a href="${reorderUrl}" class="btn btn-sm btn-primary" title="Reorder"><i class="fas fa-redo"></i> Reorder</a></td>
        </tr>`;
    }).join('');
}

function initAlertFilters() {
    const severityFilter = document.getElementById('severityFilter');
    const fabricFilter = document.getElementById('alertFabricFilter');

    function applyFilters() {
        loadAlerts({ severity: severityFilter.value, fabric: fabricFilter.value });
    }

    severityFilter.addEventListener('change', applyFilters);
    fabricFilter.addEventListener('change', applyFilters);
}
