// ============================================
// KAARUNYA — Purchase Orders Page Script (API-connected)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await Promise.all([
        loadStats(),
        loadOrders(),
        updateAlertBadge(),
    ]);
    initOrderFilters();
    await initOrderModal();
    initOrderDetail();
    initTableSort('orderTable');
    handleReorderFromAlerts();
});

async function loadStats() {
    try {
        const data = await API.orders.stats();
        document.getElementById('totalOrders').textContent = data.total;
        document.getElementById('pendingCount').textContent = data.pending;
        document.getElementById('orderedCount').textContent = data.ordered;
        document.getElementById('deliveredCount').textContent = data.delivered;
    } catch (e) { console.error('Failed to load stats:', e); }
}

async function loadOrders(params) {
    try {
        const { data } = await API.orders.list(params);
        renderOrderTable(data);
    } catch (e) {
        console.error('Failed to load orders:', e);
        showToast('Failed to load orders', 'error');
    }
}

function getStatusActions(order) {
    const actions = [];
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
            break;
        case 'Cancelled':
            actions.push(`<button class="btn-icon btn-status-pending" title="Reopen as Pending" onclick="changeOrderStatus('${order.id}', 'Pending')"><i class="fas fa-redo"></i></button>`);
            break;
    }
    return actions.join('');
}

function renderOrderTable(data) {
    const tbody = document.getElementById('orderTableBody');
    document.getElementById('orderCount').textContent = `${data.length} purchase orders`;

    tbody.innerHTML = data.map(o => `
        <tr>
            <td><strong>${o.id}</strong></td>
            <td>${o.supplier_name || o.supplier_id}</td>
            <td>${formatDate(o.order_date)}</td>
            <td>${o.itemCount} item${o.itemCount > 1 ? 's' : ''}</td>
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

function initOrderFilters() {
    const filterInput = document.getElementById('orderFilter');
    const statusFilter = document.getElementById('orderStatusFilter');

    function applyFilters() {
        loadOrders({ search: filterInput.value, status: statusFilter.value });
    }

    let debounceTimer;
    filterInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
    });
    statusFilter.addEventListener('change', applyFilters);
}

async function initOrderModal() {
    const modal = document.getElementById('orderModal');
    const createBtn = document.getElementById('createOrderBtn');
    const closeBtn = document.getElementById('closeOrderModal');
    const cancelBtn = document.getElementById('cancelOrderModal');
    const saveBtn = document.getElementById('saveOrder');
    const addItemBtn = document.getElementById('addItemBtn');
    const supplierSelect = document.getElementById('orderSupplier');

    // Load suppliers
    try {
        const { data } = await API.suppliers.list({ status: 'Active' });
        supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>' + data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) { console.error(e); }

    const today = new Date().toISOString().split('T')[0];

    window.openOrderModal = async function (prefill) {
        modal.classList.add('active');
        document.getElementById('orderDate').value = today;
        await populateProductSelects();
        recalcOrder();

        if (prefill) {
            if (prefill.supplierId) supplierSelect.value = prefill.supplierId;
            if (prefill.productId) {
                const firstProductSelect = document.querySelector('.item-product');
                if (firstProductSelect) firstProductSelect.value = prefill.productId;
            }
            if (prefill.qty) {
                const qtyInput = document.querySelector('.item-qty');
                if (qtyInput) qtyInput.value = prefill.qty;
            }
            if (prefill.price) {
                const priceInput = document.querySelector('.item-price');
                if (priceInput) priceInput.value = prefill.price;
            }
            const firstRow = document.querySelector('.order-item-row');
            if (firstRow) recalcRow(firstRow);
            recalcOrder();
        }
    };
    function closeModal() {
        modal.classList.remove('active');
        document.getElementById('orderForm').reset();
        const container = document.getElementById('orderItems');
        const rows = container.querySelectorAll('.order-item-row');
        rows.forEach((r, i) => { if (i > 0) r.remove(); });
    }

    createBtn.addEventListener('click', () => window.openOrderModal());
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    addItemBtn.addEventListener('click', () => { addItemRow(); populateProductSelects(); });

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
            if (rows.length > 1) { removeBtn.closest('.order-item-row').remove(); recalcOrder(); }
        }
    });

    saveBtn.addEventListener('click', async () => {
        const supplierId = supplierSelect.value;
        const orderDate = document.getElementById('orderDate').value;
        if (!supplierId || !orderDate) { showToast('Please fill supplier and date.', 'error'); return; }

        const rows = document.querySelectorAll('.order-item-row');
        const items = [];
        let valid = true;
        rows.forEach(row => {
            const productId = row.querySelector('.item-product').value;
            const quantity = parseInt(row.querySelector('.item-qty').value);
            const unitPrice = parseFloat(row.querySelector('.item-price').value);
            if (!productId || isNaN(quantity) || isNaN(unitPrice) || quantity <= 0) valid = false;
            items.push({ productId, quantity, unitPrice });
        });
        if (!valid || items.length === 0) { showToast('Please fill all item fields.', 'error'); return; }

        try {
            await API.orders.create({ supplierId, orderDate, items });
            showToast('Purchase order created successfully!');
            await Promise.all([loadOrders(), loadStats()]);
            closeModal();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    // Bi-directional filtering logic
    supplierSelect.addEventListener('change', () => {
        const selectedSupplier = supplierSelect.value;
        // Update all existing product dropdowns
        document.querySelectorAll('.item-product').forEach(sel => {
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">-- Choose Product --</option>' + cachedProducts
                .filter(p => !selectedSupplier || p.supplier_id === selectedSupplier)
                .map(p => `<option value="${p.id}" ${p.id === currentVal ? 'selected' : ''}>${p.name}</option>`)
                .join('');
            
            // If the previously selected product is no longer in the list (because it belongs to another supplier), clear it
            if (currentVal && !Array.from(sel.options).some(opt => opt.value === currentVal)) {
                sel.value = '';
            }
        });
    });

    document.getElementById('orderItems').addEventListener('change', (e) => {
        if (e.target.classList.contains('item-product')) {
            const selectedProductId = e.target.value;
            if (selectedProductId) {
                const product = cachedProducts.find(p => p.id === selectedProductId);
                if (product && product.supplier_id) {
                    // Set the supplier to match the selected product
                    supplierSelect.value = product.supplier_id;
                    // Trigger the supplier change event to filter other product dropdowns
                    supplierSelect.dispatchEvent(new Event('change'));
                }
            }
            
            // Auto-fill price when product is selected
            const row = e.target.closest('.order-item-row');
            const priceInput = row.querySelector('.item-price');
            if (selectedProductId && !priceInput.value) {
                const product = cachedProducts.find(p => p.id === selectedProductId);
                if (product) {
                    priceInput.value = product.price || 0;
                    recalcRow(row);
                    recalcOrder();
                }
            }
        }
    });

    // Reset Filters functionality
    document.getElementById('resetOrderFilters').addEventListener('click', (e) => {
        e.preventDefault();
        supplierSelect.value = '';
        
        // Reset all product dropdowns back to full list
        const opts = '<option value="">-- Choose Product --</option>' + cachedProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        document.querySelectorAll('.item-product').forEach(sel => {
            sel.innerHTML = opts;
            sel.value = '';
            
            // Reset price and subtotal for each row
            const row = sel.closest('.order-item-row');
            row.querySelector('.item-price').value = '';
            recalcRow(row);
        });
        recalcOrder();
    });
}
let cachedProducts = [];
function addItemRow() {
    const container = document.getElementById('orderItems');
    const row = document.createElement('div');
    row.className = 'order-item-row';
    row.innerHTML = `
        <div class="form-group"><label class="form-label">Product</label><select class="form-control item-product"></select></div>
        <div class="form-group"><label class="form-label">Qty</label><input type="number" class="form-control item-qty" min="1" value="1"></div>
        <div class="form-group"><label class="form-label">Unit Price (₹)</label><input type="number" class="form-control item-price" min="0"></div>
        <div class="form-group"><label class="form-label">Subtotal</label><input type="text" class="form-control item-subtotal" readonly></div>
        <button type="button" class="btn-icon remove-item" title="Remove" style="margin-bottom: 4px;"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(row);
}

async function populateProductSelects() {
    try {
        if (cachedProducts.length === 0) {
            const { data } = await API.products.list();
            cachedProducts = data;
        }
        
        const supplierSelect = document.getElementById('orderSupplier');
        const selectedSupplier = supplierSelect ? supplierSelect.value : '';
        
        const filteredProducts = cachedProducts.filter(p => !selectedSupplier || p.supplier_id === selectedSupplier);
        const opts = '<option value="">-- Choose Product --</option>' + filteredProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        document.querySelectorAll('.item-product').forEach(sel => { 
            if (!sel.innerHTML) sel.innerHTML = opts; 
        });
    } catch (e) { console.error(e); }
}

function recalcRow(row) {
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
    document.getElementById('closeDetailModal').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('closeDetailBtn').addEventListener('click', () => modal.classList.remove('active'));
}

async function viewOrder(id) {
    try {
        const { data: o } = await API.orders.get(id);
        document.getElementById('detailOrderId').textContent = o.id;
        document.getElementById('orderDetailBody').innerHTML = `
            <div style="margin-bottom: var(--space-lg);">
                <div class="summary-row"><span><strong>Supplier:</strong></span><span>${o.supplier_name || o.supplier_id}</span></div>
                <div class="summary-row"><span><strong>Date:</strong></span><span>${formatDate(o.order_date)}</span></div>
                <div class="summary-row"><span><strong>Status:</strong></span><span class="status-badge ${o.status.toLowerCase()}">${o.status}</span></div>
            </div>
            <h4 style="font-family: var(--font-display); margin-bottom: var(--space-md); color: var(--clr-primary-800);">Items</h4>
            <table class="data-table" style="margin-bottom: var(--space-md);">
                <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                <tbody>${o.items.map(i => `<tr><td>${i.product_name || i.product_id}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.subtotal)}</td></tr>`).join('')}</tbody>
            </table>
            <div class="order-summary">
                <div class="summary-row total"><span>Total</span><span>${formatCurrency(o.total)}</span></div>
            </div>`;
        document.getElementById('orderDetailModal').classList.add('active');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function changeOrderStatus(id, newStatus) {
    if (!confirm(`Change order ${id} status to "${newStatus}"?`)) return;
    try {
        await API.orders.updateStatus(id, newStatus);
        showToast(`Order ${id} marked as ${newStatus}`);
        await Promise.all([loadOrders(), loadStats()]);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function cancelOrder(id) {
    if (!confirm('Cancel this order?')) return;
    try {
        await API.orders.updateStatus(id, 'Cancelled');
        showToast('Order cancelled.');
        await Promise.all([loadOrders(), loadStats()]);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ---- Handle Reorder from Alerts Page ----
async function handleReorderFromAlerts() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('reorder');
    const supplierId = urlParams.get('supplier');

    if (productId) {
        try {
            const { data: product } = await API.products.get(productId);
            const deficit = product.min_stock - product.stock;
            const reorderQty = Math.max(deficit, 1);

            setTimeout(() => {
                window.openOrderModal({
                    supplierId: supplierId || product.supplier_id,
                    productId: productId,
                    qty: reorderQty,
                    price: product.price
                });
            }, 300);
        } catch (e) {
            console.error('Failed to load product for reorder:', e);
        }
        window.history.replaceState({}, '', 'orders.html');
    }
}
