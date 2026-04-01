// ============================================
// KAARUNYA — Suppliers Page Script (API-connected)
// ============================================

let currentSuppliers = [];
let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    loadSidebarUser();
    await loadSuppliers();
    initSupplierFilters();
    initSupplierModal();
    initTableSort('supplierTable');
    updateAlertBadge();
});

async function loadSuppliers(params) {
    try {
        const [suppRes, prodRes] = await Promise.all([
            API.suppliers.list(params),
            API.products.list()
        ]);
        currentSuppliers = suppRes.data;
        allProducts = prodRes.data;
        renderSupplierTable(currentSuppliers);
    } catch (e) {
        console.error('Failed to load suppliers:', e);
        showToast('Failed to load suppliers', 'error');
    }
}

function renderSupplierTable(data) {
    const tbody = document.getElementById('supplierTableBody');
    const countEl = document.getElementById('supplierCount');
    if (countEl) countEl.textContent = `${data.length} suppliers registered`;

    tbody.innerHTML = data.map(s => {
        const supplierProducts = allProducts.filter(p => p.supplier_id === s.id);
        const productsHTML = supplierProducts.length > 0 
            ? supplierProducts.map(p => `<span class="status-badge in-stock" style="margin:2px; font-size:0.75rem; font-weight:normal">${p.name}</span>`).join('')
            : '<span style="color:var(--clr-gray-400); font-size:0.85rem">None</span>';

        return `
        <tr>
            <td><strong>${s.id}</strong></td>
            <td class="product-name"><i class="fas fa-building"></i> ${s.name}</td>
            <td>${s.address || ''}</td>
            <td>${s.phone || ''}</td>
            <td><a href="mailto:${s.email}" style="color:var(--clr-primary-500)">${s.email || ''}</a></td>
            <td><div style="display:flex; flex-wrap:wrap; max-width:200px;">${productsHTML}</div></td>
            <td><span class="status-badge ${s.status.toLowerCase()}">${s.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" title="View" onclick="viewSupplier('${s.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon" title="Edit" onclick="editSupplier('${s.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" title="Delete" onclick="deleteSupplier('${s.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function initSupplierFilters() {
    const filterInput = document.getElementById('supplierFilter');
    const statusFilter = document.getElementById('statusFilter');

    function applyFilters() {
        const search = filterInput.value;
        const status = statusFilter.value;
        loadSuppliers({ search, status });
    }

    let debounceTimer;
    filterInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
    });
    statusFilter.addEventListener('change', applyFilters);
}

function initSupplierModal() {
    const modal = document.getElementById('supplierModal');
    const addBtn = document.getElementById('addSupplierBtn');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelModal');
    const saveBtn = document.getElementById('saveSupplier');

    function openModal(isEdit) {
        document.getElementById('modalTitle').textContent = isEdit ? 'Edit Supplier' : 'Add New Supplier';
        modal.classList.add('active');
    }
    function closeModal() {
        modal.classList.remove('active');
        document.getElementById('supplierForm').reset();
        document.getElementById('editSupplierId').value = '';
    }

    addBtn.addEventListener('click', () => openModal(false));
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('supName').value.trim();
        const phone = document.getElementById('supPhone').value.trim();
        const address = document.getElementById('supAddress').value.trim();
        const email = document.getElementById('supEmail').value.trim();
        const status = document.getElementById('supStatus').value;
        const editId = document.getElementById('editSupplierId').value;

        if (!name || !phone || !address || !email) {
            showToast('Please fill all required fields.', 'error');
            return;
        }

        try {
            if (editId) {
                await API.suppliers.update(editId, { name, phone, address, email, status });
                showToast('Supplier updated successfully!');
            } else {
                await API.suppliers.create({ name, phone, address, email, status });
                showToast('Supplier created successfully!');
            }
            await loadSuppliers();
            closeModal();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function editSupplier(id) {
    try {
        const { data } = await API.suppliers.get(id);
        document.getElementById('editSupplierId').value = data.id;
        document.getElementById('supName').value = data.name;
        document.getElementById('supPhone').value = data.phone || '';
        document.getElementById('supAddress').value = data.address || '';
        document.getElementById('supEmail').value = data.email || '';
        document.getElementById('supStatus').value = data.status;
        document.getElementById('modalTitle').textContent = 'Edit Supplier';
        document.getElementById('supplierModal').classList.add('active');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
        await API.suppliers.delete(id);
        showToast('Supplier deleted.');
        await loadSuppliers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ---- View Supplier Logic ----
document.getElementById('closeViewModal').addEventListener('click', () => {
    document.getElementById('viewSupplierModal').classList.remove('active');
});
document.getElementById('closeViewModalBtn').addEventListener('click', () => {
    document.getElementById('viewSupplierModal').classList.remove('active');
});

async function viewSupplier(id) {
    try {
        // Fetch supplier details
        const { data: supplier } = await API.suppliers.get(id);
        
        // Fetch products specifically for this supplier
        // In a real app, you might have an endpoint for this, e.g., `/products?supplier_id=id`
        // For now we'll fetch all and filter, or if the API supports it, pass the param.
        const { data: products } = await API.products.list();
        const supplierProducts = products.filter(p => p.supplier_id === id);
        
        const header = document.getElementById('supplierDetailHeader');
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="margin:0;font-size:1.2rem;color:var(--clr-gray-800)">${supplier.name}</h4>
                    <p style="color:var(--clr-gray-500);font-size:0.9rem;margin:5px 0;">ID: ${supplier.id}</p>
                </div>
                <span class="status-badge ${supplier.status.toLowerCase()}">${supplier.status}</span>
            </div>
            <div style="margin-top:15px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.95rem;">
                <div><strong>Email:</strong> ${supplier.email || 'N/A'}</div>
                <div><strong>Phone:</strong> ${supplier.phone || 'N/A'}</div>
                <div style="grid-column: span 2;"><strong>Address:</strong> ${supplier.address || 'N/A'}</div>
            </div>
        `;

        const tbody = document.getElementById('supplier-product-list');
        if (supplierProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No products found for this supplier.</td></tr>';
        } else {
            tbody.innerHTML = supplierProducts.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td><strong>${p.name}</strong></td>
                    <td><span class="badge category">${p.category}</span></td>
                    <td>₹${p.price.toLocaleString('en-IN')}</td>
                </tr>
            `).join('');
        }

        document.getElementById('viewSupplierModal').classList.add('active');
    } catch (e) {
        showToast('Failed to load supplier details', 'error');
        console.error(e);
    }
}
