// ============================================
// KAARUNYA — Suppliers Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    renderSupplierTable();
    initSupplierFilters();
    initSupplierModal();
    initTableSort('supplierTable');
    updateAlertBadge();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    if (badge) badge.textContent = getLowStockProducts().length;
}

function renderSupplierTable(filteredData) {
    const tbody = document.getElementById('supplierTableBody');
    const data = filteredData || DATA.suppliers;
    const countEl = document.getElementById('supplierCount');
    if (countEl) countEl.textContent = `${data.length} suppliers registered`;

    tbody.innerHTML = data.map(s => `
        <tr>
            <td><strong>${s.id}</strong></td>
            <td class="product-name"><i class="fas fa-building"></i> ${s.name}</td>
            <td>${s.address}</td>
            <td>${s.phone}</td>
            <td><a href="mailto:${s.email}" style="color:var(--clr-primary-500)">${s.email}</a></td>
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
        const text = filterInput.value.toLowerCase();
        const status = statusFilter.value;
        let filtered = DATA.suppliers;
        if (text) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(text) ||
                s.email.toLowerCase().includes(text) ||
                s.address.toLowerCase().includes(text) ||
                s.id.toLowerCase().includes(text)
            );
        }
        if (status) {
            filtered = filtered.filter(s => s.status === status);
        }
        renderSupplierTable(filtered);
    }

    filterInput.addEventListener('input', applyFilters);
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

    saveBtn.addEventListener('click', () => {
        const form = document.getElementById('supplierForm');
        const name = document.getElementById('supName').value.trim();
        const phone = document.getElementById('supPhone').value.trim();
        const address = document.getElementById('supAddress').value.trim();
        const email = document.getElementById('supEmail').value.trim();
        const status = document.getElementById('supStatus').value;
        const editId = document.getElementById('editSupplierId').value;

        if (!name || !phone || !address || !email) {
            alert('Please fill all required fields.');
            return;
        }

        if (editId) {
            const idx = DATA.suppliers.findIndex(s => s.id === editId);
            if (idx !== -1) {
                DATA.suppliers[idx] = { ...DATA.suppliers[idx], name, phone, address, email, status };
            }
        } else {
            const newId = 'SUP-' + String(DATA.suppliers.length + 1).padStart(3, '0');
            DATA.suppliers.push({ id: newId, name, address, phone, email, status });
        }

        renderSupplierTable();
        closeModal();
    });
}

function editSupplier(id) {
    const s = DATA.suppliers.find(s => s.id === id);
    if (!s) return;
    document.getElementById('editSupplierId').value = s.id;
    document.getElementById('supName').value = s.name;
    document.getElementById('supPhone').value = s.phone;
    document.getElementById('supAddress').value = s.address;
    document.getElementById('supEmail').value = s.email;
    document.getElementById('supStatus').value = s.status;
    document.getElementById('modalTitle').textContent = 'Edit Supplier';
    document.getElementById('supplierModal').classList.add('active');
}

function deleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    DATA.suppliers = DATA.suppliers.filter(s => s.id !== id);
    renderSupplierTable();
}
