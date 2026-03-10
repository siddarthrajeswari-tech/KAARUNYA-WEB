// ============================================
// KAARUNYA — Purchase Orders Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    renderOrderTable();
    initOrderFilters();
    initOrderModal();
    initOrderDetail();
    initTableSort('orderTable');
    updateStats();
    updateAlertBadge();
    handleReorderFromAlerts();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (badge) badge.textContent = getLowStockProducts().length;
}

function updateStats() {
    const orders = DATA.purchaseOrders;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('pendingCount').textContent = orders.filter(o => o.status === 'Pending').length;
    document.getElementById('orderedCount').textContent = orders.filter(o => o.status === 'Ordered').length;
    document.getElementById('deliveredCount').textContent = orders.filter(o => o.status === 'Delivered').length;
}

function getStatusActions(order) {
    const actions = [];
    // View is always available
    actions.push(`<button class="btn-icon" title="View Details" onclick="viewOrder('${order.id}')"><i class="fas fa-eye"></i></button>`);

    switch (order.status) {
        case 'Pending':
            actions.push(`<button class="btn-icon btn-status-ordered" title="Mark as Ordered" onclick="changeOrderStatus('${order.id}', 'Ordered')"><i class="fas fa-shipping-fast"></i></button>`);
            actions.push(`<button class="btn-icon btn-status-delivered" title="Mark as Delivered" onclick="changeOrderStatus('${order.id}', 'Delivered')"><i class="fas fa-check-circle"></i></button>`);
            actions.push(`<button class="btn-icon btn-status-cancel" title="Cancel Order" onclick="cancelOrder('${order.id}')"><i class="fas fa-times"></i></button>`);
            break;
        case 'Ordered':
            actions.push(`<button class="btn-icon btn-status-delivered" title="Mark as Delivered" onclick="changeOrderStatus('${order.id}', 'Delivered')"><i class="fas fa-check-circle"></i></button>`);
            actions.push(`<button class="btn-icon btn-status-pending" title="Mark as Pending" onclick="changeOrderStatus('${order.id}', 'Pending')"><i class="fas fa-clock"></i></button>`);
            break;
        case 'Delivered':
            // No status changes for delivered orders
            break;
        case 'Cancelled':
            actions.push(`<button class="btn-icon btn-status-pending" title="Reopen as Pending" onclick="changeOrderStatus('${order.id}', 'Pending')"><i class="fas fa-redo"></i></button>`);
            break;
    }
    return actions.join('');
}

function renderOrderTable(filteredData) {
    const tbody = document.getElementById('orderTableBody');
    const data = filteredData || DATA.purchaseOrders;
    document.getElementById('orderCount').textContent = `${data.length} purchase orders`;

    tbody.innerHTML = data.map(o => `
        <tr>
            <td><strong>${o.id}</strong></td>
            <td>${getSupplierName(o.supplier)}</td>
            <td>${formatDate(o.date)}</td>
            <td>${o.items.length} item${o.items.length > 1 ? 's' : ''}</td>
            <td>${formatCurrency(o.total)}</td>
            <td><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></td>
            <td>
                <div class="table-actions">
                    ${getStatusActions(o)}
                </div>
            </td>
        </tr>
    `).join('');
}

// ---- Manual Status Change ----
function changeOrderStatus(id, newStatus) {
    const order = DATA.purchaseOrders.find(o => o.id === id);
    if (!order) return;

    const statusLabels = { 'Ordered': 'Ordered', 'Delivered': 'Delivered', 'Pending': 'Pending' };
    const label = statusLabels[newStatus] || newStatus;

    if (!confirm(`Change order ${id} status to "${label}"?`)) return;

    order.status = newStatus;

    // Show success toast
    showToast(`Order ${id} marked as ${label}`, 'success');

    renderOrderTable();
    updateStats();
}

function cancelOrder(id) {
    if (!confirm('Cancel this order?')) return;
    const o = DATA.purchaseOrders.find(o => o.id === id);
    if (o) o.status = 'Cancelled';
    showToast(`Order ${id} has been cancelled`, 'warning');
    renderOrderTable();
    updateStats();
}

// ---- Toast Notification ----
function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icons = { success: 'fa-check-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle', error: 'fa-times-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function initOrderFilters() {
    const filterInput = document.getElementById('orderFilter');
    const statusFilter = document.getElementById('orderStatusFilter');

    function applyFilters() {
        const text = filterInput.value.toLowerCase();
        const status = statusFilter.value;
        let filtered = DATA.purchaseOrders;
        if (text) {
            filtered = filtered.filter(o =>
                o.id.toLowerCase().includes(text) ||
                getSupplierName(o.supplier).toLowerCase().includes(text)
            );
        }
        if (status) filtered = filtered.filter(o => o.status === status);
        renderOrderTable(filtered);
    }

    filterInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
}

function initOrderModal() {
    const modal = document.getElementById('orderModal');
    const createBtn = document.getElementById('createOrderBtn');
    const closeBtn = document.getElementById('closeOrderModal');
    const cancelBtn = document.getElementById('cancelOrderModal');
    const saveBtn = document.getElementById('saveOrder');
    const addItemBtn = document.getElementById('addItemBtn');
    const supplierSelect = document.getElementById('orderSupplier');

    // Populate supplier select
    supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>' +
        DATA.suppliers
            .filter(s => s.status === 'Active')
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join('');

    // Set today's date
    const today = new Date().toISOString().split('T')[0];

    window.openOrderModal = function (prefill) {
        modal.classList.add('active');
        document.getElementById('orderDate').value = today;
        populateProductSelects();
        recalcOrder();

        // Pre-fill modal if reorder data is provided
        if (prefill) {
            if (prefill.supplierId) {
                supplierSelect.value = prefill.supplierId;
            }
            if (prefill.productId) {
                const firstProductSelect = document.querySelector('.item-product');
                if (firstProductSelect) {
                    firstProductSelect.value = prefill.productId;
                }
            }
            if (prefill.qty) {
                const qtyInput = document.querySelector('.item-qty');
                if (qtyInput) qtyInput.value = prefill.qty;
            }
            if (prefill.price) {
                const priceInput = document.querySelector('.item-price');
                if (priceInput) priceInput.value = prefill.price;
            }
            recalcRow(document.querySelector('.order-item-row'));
            recalcOrder();
        }
    };

    function closeModal() {
        modal.classList.remove('active');
        document.getElementById('orderForm').reset();
        // Reset to single item row
        const container = document.getElementById('orderItems');
        const rows = container.querySelectorAll('.order-item-row');
        rows.forEach((r, i) => { if (i > 0) r.remove(); });
    }

    createBtn.addEventListener('click', () => window.openOrderModal());
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    addItemBtn.addEventListener('click', () => {
        addItemRow();
        populateProductSelects();
    });

    // Delegate events for item rows
    document.getElementById('orderItems').addEventListener('input', (e) => {
        if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
            recalcRow(e.target.closest('.order-item-row'));
            recalcOrder();
        }
    });
    document.getElementById('orderItems').addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-item');
        if (removeBtn) {
            const rows = document.querySelectorAll('.order-item-row');
            if (rows.length > 1) {
                removeBtn.closest('.order-item-row').remove();
                recalcOrder();
            }
        }
    });

    saveBtn.addEventListener('click', () => {
        const supplier = supplierSelect.value;
        const date = document.getElementById('orderDate').value;
        if (!supplier || !date) { alert('Please fill supplier and date.'); return; }

        const rows = document.querySelectorAll('.order-item-row');
        const items = [];
        let valid = true;
        rows.forEach(row => {
            const product = row.querySelector('.item-product').value;
            const qty = parseInt(row.querySelector('.item-qty').value);
            const unitPrice = parseFloat(row.querySelector('.item-price').value);
            if (!product || isNaN(qty) || isNaN(unitPrice) || qty <= 0) { valid = false; }
            items.push({ product, qty, unitPrice });
        });
        if (!valid || items.length === 0) { alert('Please fill all item fields.'); return; }

        const total = items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
        const newId = 'PO-2026-' + String(parseInt(DATA.purchaseOrders[DATA.purchaseOrders.length - 1].id.split('-')[2]) + 1).padStart(3, '0');

        DATA.purchaseOrders.push({ id: newId, supplier, date, items, status: 'Pending', total });
        showToast(`Order ${newId} created successfully!`, 'success');
        renderOrderTable();
        updateStats();
        closeModal();
    });
}

// ---- Handle Reorder from Alerts Page ----
function handleReorderFromAlerts() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('reorder');
    const supplierId = urlParams.get('supplier');

    if (productId) {
        const product = DATA.products.find(p => p.id === productId);
        if (product) {
            const deficit = product.minStock - product.stock;
            const reorderQty = Math.max(deficit, 1);

            // Small delay to let the modal initialize
            setTimeout(() => {
                window.openOrderModal({
                    supplierId: supplierId || product.supplier,
                    productId: productId,
                    qty: reorderQty,
                    price: product.price
                });
            }, 300);
        }
        // Clean up URL
        window.history.replaceState({}, '', 'orders.html');
    }
}

function addItemRow() {
    const container = document.getElementById('orderItems');
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.innerHTML = `
        <div class="form-group">
            <label class="form-label">Product</label>
            <select class="form-control item-product"></select>
        </div>
        <div class="form-group">
            <label class="form-label">Qty</label>
            <input type="number" class="form-control item-qty" min="1" value="1">
        </div>
        <div class="form-group">
            <label class="form-label">Unit Price (₹)</label>
            <input type="number" class="form-control item-price" min="0">
        </div>
        <div class="form-group">
            <label class="form-label">Subtotal</label>
            <input type="text" class="form-control item-subtotal" readonly>
        </div>
        <button type="button" class="btn-icon remove-item" title="Remove" style="margin-bottom: 4px;"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

function populateProductSelects() {
    const selects = document.querySelectorAll('.item-product');
    const opts = DATA.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    selects.forEach(sel => {
        if (!sel.innerHTML) sel.innerHTML = opts;
    });
}

function recalcRow(row) {
    if (!row) return;
    const qty = parseInt(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    row.querySelector('.item-subtotal').value = formatCurrency(qty * price);
}

function recalcOrder() {
    const rows = document.querySelectorAll('.order-item-row');
    let subtotal = 0;
    rows.forEach(row => {
        const qty = parseInt(row.querySelector('.item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        subtotal += qty * price;
    });
    const tax = subtotal * 0.18;
    document.getElementById('summarySubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summaryTax').textContent = formatCurrency(Math.round(tax));
    document.getElementById('summaryTotal').textContent = formatCurrency(Math.round(subtotal + tax));
}

function initOrderDetail() {
    const modal = document.getElementById('orderDetailModal');
    const closeBtn = document.getElementById('closeDetailModal');
    const closeBtn2 = document.getElementById('closeDetailBtn');
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    closeBtn2.addEventListener('click', () => modal.classList.remove('active'));
}

function viewOrder(id) {
    const o = DATA.purchaseOrders.find(o => o.id === id);
    if (!o) return;
    document.getElementById('detailOrderId').textContent = o.id;
    const body = document.getElementById('orderDetailBody');
    body.innerHTML = `
        <div style="margin-bottom: var(--space-lg);">
            <div class="summary-row"><span><strong>Supplier:</strong></span><span>${getSupplierName(o.supplier)}</span></div>
            <div class="summary-row"><span><strong>Date:</strong></span><span>${formatDate(o.date)}</span></div>
            <div class="summary-row"><span><strong>Status:</strong></span><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></div>
        </div>
        <h4 style="font-family: var(--font-display); margin-bottom: var(--space-md); color: var(--clr-primary-800);">Items</h4>
        <table class="data-table" style="margin-bottom: var(--space-md);">
            <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
            <tbody>
                ${o.items.map(i => `
                    <tr>
                        <td>${getProductName(i.product)}</td>
                        <td>${i.qty}</td>
                        <td>${formatCurrency(i.unitPrice)}</td>
                        <td>${formatCurrency(i.qty * i.unitPrice)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="order-summary">
            <div class="summary-row total"><span>Total</span><span>${formatCurrency(o.total)}</span></div>
        </div>
    `;
    document.getElementById('orderDetailModal').classList.add('active');
}
