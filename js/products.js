// ============================================
// KAARUNYA — Products Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    renderProductTable();
    initProductFilters();
    initProductModal();
    initTableSort('productTable');
    updateAlertBadge();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (badge) badge.textContent = getLowStockProducts().length;
}

function getStockStatus(product) {
    if (product.stock <= 0) return { label: 'Out of Stock', cls: 'out-of-stock' };
    if (product.stock <= product.minStock) return { label: 'Low Stock', cls: 'low-stock' };
    return { label: 'In Stock', cls: 'in-stock' };
}

function renderProductTable(filteredData) {
    const tbody = document.getElementById('productTableBody');
    const data = filteredData || DATA.products;
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = `${data.length} products in inventory`;

    tbody.innerHTML = data.map(p => {
        const status = getStockStatus(p);
        return `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td class="product-name"><i class="fas fa-tshirt"></i> ${p.name}</td>
            <td><span class="category-badge ${p.category.toLowerCase()}">${p.category}</span></td>
            <td>${p.fabric}</td>
            <td>${p.stock}</td>
            <td>${p.minStock}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${getSupplierName(p.supplier)}</td>
            <td><span class="status-badge ${status.cls}">${status.label}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" title="Edit" onclick="editProduct('${p.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" title="Delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function initProductFilters() {
    const filterInput = document.getElementById('productFilter');
    const catFilter = document.getElementById('categoryFilter');
    const fabFilter = document.getElementById('fabricFilter');
    const stockFilter = document.getElementById('stockStatusFilter');

    function applyFilters() {
        const text = filterInput.value.toLowerCase();
        const cat = catFilter.value;
        const fab = fabFilter.value;
        const stock = stockFilter.value;

        let filtered = DATA.products;
        if (text) filtered = filtered.filter(p => p.name.toLowerCase().includes(text) || p.id.toLowerCase().includes(text));
        if (cat) filtered = filtered.filter(p => p.category === cat);
        if (fab) filtered = filtered.filter(p => p.fabric === fab);
        if (stock === 'low') filtered = filtered.filter(p => p.stock <= p.minStock);
        if (stock === 'in') filtered = filtered.filter(p => p.stock > p.minStock);

        renderProductTable(filtered);
    }

    [filterInput].forEach(el => el.addEventListener('input', applyFilters));
    [catFilter, fabFilter, stockFilter].forEach(el => el.addEventListener('change', applyFilters));
}

function initProductModal() {
    const modal = document.getElementById('productModal');
    const addBtn = document.getElementById('addProductBtn');
    const closeBtn = document.getElementById('closeProductModal');
    const cancelBtn = document.getElementById('cancelProductModal');
    const saveBtn = document.getElementById('saveProduct');
    const supplierSelect = document.getElementById('prodSupplier');

    // Populate supplier dropdown
    supplierSelect.innerHTML = DATA.suppliers
        .filter(s => s.status === 'Active')
        .map(s => `<option value="${s.id}">${s.name}</option>`)
        .join('');

    function openModal(isEdit) {
        document.getElementById('productModalTitle').textContent = isEdit ? 'Edit Product' : 'Add New Product';
        modal.classList.add('active');
    }
    function closeModal() {
        modal.classList.remove('active');
        document.getElementById('productForm').reset();
        document.getElementById('editProductId').value = '';
    }

    addBtn.addEventListener('click', () => openModal(false));
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', () => {
        const name = document.getElementById('prodName').value.trim();
        const category = document.getElementById('prodCategory').value;
        const fabric = document.getElementById('prodFabric').value;
        const stock = parseInt(document.getElementById('prodStock').value);
        const minStock = parseInt(document.getElementById('prodMinStock').value);
        const price = parseFloat(document.getElementById('prodPrice').value);
        const supplier = document.getElementById('prodSupplier').value;
        const editId = document.getElementById('editProductId').value;

        if (!name || isNaN(stock) || isNaN(minStock) || isNaN(price)) {
            alert('Please fill all required fields.');
            return;
        }

        if (editId) {
            const idx = DATA.products.findIndex(p => p.id === editId);
            if (idx !== -1) {
                DATA.products[idx] = { ...DATA.products[idx], name, category, fabric, stock, minStock, price, supplier };
            }
        } else {
            const newId = 'PRD-' + String(DATA.products.length + 1).padStart(3, '0');
            DATA.products.push({ id: newId, name, category, fabric, stock, minStock, price, supplier });
        }

        renderProductTable();
        closeModal();
    });
}

function editProduct(id) {
    const p = DATA.products.find(p => p.id === id);
    if (!p) return;
    document.getElementById('editProductId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCategory').value = p.category;
    document.getElementById('prodFabric').value = p.fabric;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodMinStock').value = p.minStock;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodSupplier').value = p.supplier;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productModal').classList.add('active');
}

function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    DATA.products = DATA.products.filter(p => p.id !== id);
    renderProductTable();
}
