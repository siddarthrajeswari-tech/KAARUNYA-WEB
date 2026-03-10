// ============================================
// KAARUNYA — User Management Page Script
// ============================================

let allUsers = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    updateAlertBadge();

    // Auth guard
    currentUser = await requireLogin();
    if (!checkAccess(currentUser, ['admin', 'manager'])) return;

    loadSidebarUser();
    await loadUsers();
    initFilters();
    initUserModal();
});

async function loadUsers() {
    try {
        const { data } = await API.auth.listUsers();
        allUsers = data;
        renderUsers(allUsers);
        updateStats(allUsers);
    } catch (e) {
        showToast('Failed to load users: ' + e.message, 'error');
    }
}

function updateStats(users) {
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('activeUsers').textContent = users.filter(u => u.is_active).length;
    document.getElementById('adminCount').textContent = users.filter(u => u.role === 'admin').length;
    document.getElementById('tfaCount').textContent = users.filter(u => u.has_2fa).length;
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!users.length) {
        tbody.innerHTML = `
            <tr><td colspan="8" style="text-align:center; padding:40px; color:var(--clr-text-muted);">
                <i class="fas fa-users" style="font-size:2rem; margin-bottom:8px; display:block; opacity:0.3;"></i>
                No users found
            </td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const roleBadgeClass = u.role === 'admin' ? 'role-admin' : u.role === 'manager' ? 'role-manager' : 'role-staff';
        const statusBadge = u.is_active
            ? '<span class="status-badge active">Active</span>'
            : '<span class="status-badge inactive">Inactive</span>';
        const tfaBadge = u.has_2fa
            ? '<span class="status-badge active" style="font-size:0.7rem;"><i class="fas fa-shield-alt"></i> On</span>'
            : '<span style="color:var(--clr-text-muted); font-size:0.8rem;">Off</span>';

        const isSelf = currentUser && u.id === currentUser.id;

        return `
            <tr data-id="${u.id}">
                <td class="product-name">
                    <div class="user-avatar-sm ${roleBadgeClass}">
                        <i class="fas fa-user"></i>
                    </div>
                    ${u.full_name}
                </td>
                <td><code style="font-size:0.82rem; padding:2px 8px; background:var(--clr-bg-secondary); border-radius:4px;">@${u.username}</code></td>
                <td><span class="role-badge ${roleBadgeClass}">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span></td>
                <td style="font-size:0.85rem;">${u.email || '<span style="color:var(--clr-text-muted);">—</span>'}</td>
                <td>${statusBadge}</td>
                <td>${tfaBadge}</td>
                <td style="font-size:0.82rem; color:var(--clr-text-secondary);">${formatDate(u.created_at)}</td>
                <td class="admin-only">
                    <div class="action-buttons">
                        <button class="btn-icon edit-user-btn" data-id="${u.id}" title="Edit user">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!isSelf ? `
                            <button class="btn-icon delete-user-btn" data-id="${u.id}" data-name="${u.username}" title="Deactivate user"
                                style="color: var(--clr-danger);">
                                <i class="fas fa-user-slash"></i>
                            </button>
                        ` : '<span style="font-size:0.7rem; color:var(--clr-text-muted);">You</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Attach event listeners
    tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', () => deactivateUser(parseInt(btn.dataset.id), btn.dataset.name));
    });

    // Apply role-based visibility
    if (currentUser) applyRoleBasedNav(currentUser.role);
}

function initFilters() {
    document.getElementById('roleFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
}

function applyFilters() {
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = [...allUsers];
    if (role) filtered = filtered.filter(u => u.role === role);
    if (status !== '') filtered = filtered.filter(u => u.is_active === parseInt(status));
    renderUsers(filtered);
}

function initUserModal() {
    const modal = document.getElementById('userModal');
    const addBtn = document.getElementById('addUserBtn');
    const closeBtn = document.getElementById('closeUserModal');
    const cancelBtn = document.getElementById('cancelUserModal');
    const saveBtn = document.getElementById('saveUserBtn');

    if (addBtn) addBtn.addEventListener('click', () => openAddModal());
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    if (saveBtn) saveBtn.addEventListener('click', saveUser);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
}

function openAddModal() {
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('userUsername').disabled = false;
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordHint').textContent = '*';
    document.getElementById('passwordEditHint').style.display = 'none';
    document.getElementById('userStatusGroup').style.display = 'none';
    document.getElementById('userModal').style.display = 'flex';
}

function openEditModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
    document.getElementById('editUserId').value = user.id;
    document.getElementById('userFullName').value = user.full_name;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userUsername').disabled = true;
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('passwordHint').textContent = '';
    document.getElementById('passwordEditHint').style.display = 'block';
    document.getElementById('userStatusGroup').style.display = 'block';

    // Set status radio
    const statusRadio = document.querySelector(`input[name="userStatus"][value="${user.is_active ? 1 : 0}"]`);
    if (statusRadio) statusRadio.checked = true;

    document.getElementById('userModal').style.display = 'flex';
}

async function saveUser() {
    const editId = document.getElementById('editUserId').value;
    const fullName = document.getElementById('userFullName').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;

    if (!fullName || !username) {
        showToast('Full name and username are required.', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveUserBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        if (editId) {
            // Update
            const isActive = document.querySelector('input[name="userStatus"]:checked')?.value === '1';
            const data = { fullName, email, role, isActive };
            if (password) data.password = password;
            await API.auth.updateUser(editId, data);
            showToast('User updated successfully!');
        } else {
            // Create
            if (!password || password.length < 6) {
                showToast('Password must be at least 6 characters.', 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save User';
                return;
            }
            await API.auth.register({ username, password, fullName, role, email });
            showToast('User created successfully!');
        }

        document.getElementById('userModal').style.display = 'none';
        await loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save User';
    }
}

async function deactivateUser(userId, username) {
    if (!confirm(`Are you sure you want to deactivate user "@${username}"?\n\nThey will no longer be able to log in.`)) return;

    try {
        await API.auth.deleteUser(userId);
        showToast(`User "@${username}" deactivated.`);
        await loadUsers();
    } catch (e) {
        showToast(e.message, 'error');
    }
}
