// ============================================
// KAARUNYA — Suppliers Page Script (API-connected)
// ============================================

let currentSuppliers = [];

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
        const { data } = await API.suppliers.list(params);
        currentSuppliers = data;
        renderSupplierTable(data);
    } catch (e) {
        console.error('Failed to load suppliers:', e);
        showToast('Failed to load suppliers', 'error');
    }
}

function renderSupplierTable(data) {
    const tbody = document.getElementById('supplierTableBody');
    const countEl = document.getElementById('supplierCount');
    if (countEl) countEl.textContent = `${data.length} suppliers registered`;

    tbody.innerHTML = data.map(s => `
        <tr>
            <td><strong>${s.id}</strong></td>
            <td class="product-name"><i class="fas fa-building"></i> ${s.name}</td>
            <td>${s.address || ''}</td>
            <td>${s.phone || ''}</td>
            <td><a href="mailto:${s.email}" style="color:var(--clr-primary-500)">${s.email || ''}</a></td>
            <td><span class="status-badge ${s.status.toLowerCase()}">${s.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" title="Edit" onclick="editSupplier('${s.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon" title="Delete" onclick="deleteSupplier('${s.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
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
