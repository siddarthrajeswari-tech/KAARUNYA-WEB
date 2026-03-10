// ============================================
// KAARUNYA — Products Page Script (API-connected)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await loadProducts();
    initProductFilters();
    initProductModal();
    initTableSort('productTable');
    updateAlertBadge();
});

async function loadProducts(params) {
    try {
        const { data } = await API.products.list(params);
        renderProductTable(data);
    } catch (e) {
        console.error('Failed to load products:', e);
        showToast('Failed to load products', 'error');
    }
}

function renderProductTable(data) {
    const tbody = document.getElementById('productTableBody');
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = `${data.length} products in inventory`;

    tbody.innerHTML = data.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td class="product-name"><i class="fas fa-tshirt"></i> ${p.name}</td>
            <td><span class="category-badge ${p.category.toLowerCase()}">${p.category}</span></td>
            <td>${p.fabric}</td>
            <td>${p.stock}</td>
            <td>${p.min_stock}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${p.supplier_name || '—'}</td>
            <td><span class="status-badge ${p.statusClass}">${p.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" title="Edit" onclick="editProduct('${p.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" title="Delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function initProductFilters() {
    const filterInput = document.getElementById('productFilter');
    const catFilter = document.getElementById('categoryFilter');
    const fabFilter = document.getElementById('fabricFilter');
    const stockFilter = document.getElementById('stockStatusFilter');

    function applyFilters() {
        loadProducts({
            search: filterInput.value,
            category: catFilter.value,
            fabric: fabFilter.value,
            stockStatus: stockFilter.value,
        });
    }

    let debounceTimer;
    filterInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
    });
    [catFilter, fabFilter, stockFilter].forEach(el => el.addEventListener('change', applyFilters));
}

async function initProductModal() {
    const modal = document.getElementById('productModal');
    const addBtn = document.getElementById('addProductBtn');
    const closeBtn = document.getElementById('closeProductModal');
    const cancelBtn = document.getElementById('cancelProductModal');
    const saveBtn = document.getElementById('saveProduct');
    const supplierSelect = document.getElementById('prodSupplier');

    // Load suppliers for dropdown
    try {
        const { data } = await API.suppliers.list({ status: 'Active' });
        supplierSelect.innerHTML = data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (e) { console.error('Failed to load suppliers for dropdown:', e); }

    function closeModal() {
        modal.classList.remove('active');
        document.getElementById('productForm').reset();
        document.getElementById('editProductId').value = '';
    }

    addBtn.addEventListener('click', () => {
        document.getElementById('productModalTitle').textContent = 'Add New Product';
        modal.classList.add('active');
    });
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('prodName').value.trim();
        const category = document.getElementById('prodCategory').value;
        const fabric = document.getElementById('prodFabric').value;
        const stock = parseInt(document.getElementById('prodStock').value);
        const minStock = parseInt(document.getElementById('prodMinStock').value);
        const price = parseFloat(document.getElementById('prodPrice').value);
        const supplierId = document.getElementById('prodSupplier').value;
        const editId = document.getElementById('editProductId').value;

        if (!name || isNaN(stock) || isNaN(minStock) || isNaN(price)) {
            showToast('Please fill all required fields.', 'error');
            return;
        }

        try {
            if (editId) {
                await API.products.update(editId, { name, category, fabric, stock, minStock, price, supplierId });
                showToast('Product updated successfully!');
            } else {
                await API.products.create({ name, category, fabric, stock, minStock, price, supplierId });
                showToast('Product created successfully!');
            }
            await loadProducts();
            closeModal();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function editProduct(id) {
    try {
        const { data } = await API.products.get(id);
        document.getElementById('editProductId').value = data.id;
        document.getElementById('prodName').value = data.name;
        document.getElementById('prodCategory').value = data.category;
        document.getElementById('prodFabric').value = data.fabric;
        document.getElementById('prodStock').value = data.stock;
        document.getElementById('prodMinStock').value = data.min_stock;
        document.getElementById('prodPrice').value = data.price;
        document.getElementById('prodSupplier').value = data.supplier_id || '';
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('productModal').classList.add('active');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await API.products.delete(id);
        showToast('Product deleted.');
        await loadProducts();
    } catch (e) {
        showToast(e.message, 'error');
    }
}
