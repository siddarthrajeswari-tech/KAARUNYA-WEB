// ============================================
// KAARUNYA — Activity Log Page Script
// ============================================

let currentPage = 0;
const PAGE_SIZE = 50;
let totalLogs = 0;

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    updateAlertBadge();

    // Auth guard
    const user = await requireLogin();
    if (!checkAccess(user, ['admin', 'manager'])) return;

    loadSidebarUser();
    await loadActivityLog();
    initFilterActions();
    initPagination();
});

async function loadActivityLog() {
    const action = document.getElementById('actionFilter').value;
    const entityType = document.getElementById('entityFilter').value;

    try {
        const { data, total } = await API.auth.activityLog({
            action: action || undefined,
            entityType: entityType || undefined,
            limit: PAGE_SIZE,
            offset: currentPage * PAGE_SIZE,
        });

        totalLogs = total;
        renderActivityLog(data);
        updatePagination();
    } catch (e) {
        showToast('Failed to load activity log: ' + e.message, 'error');
    }
}

function renderActivityLog(logs) {
    const tbody = document.getElementById('activityTableBody');
    const countEl = document.getElementById('logCount');
    countEl.textContent = `(${totalLogs} total)`;

    if (!logs.length) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--clr-text-muted);">
                <i class="fas fa-history" style="font-size:2rem; margin-bottom:8px; display:block; opacity:0.3;"></i>
                No activity logs found
            </td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map((log, idx) => {
        const actionInfo = getActionInfo(log.action);
        const entityBadge = log.entity_type
            ? `<span class="entity-badge entity-${log.entity_type}">${log.entity_type}</span>`
            : '<span style="color:var(--clr-text-muted);">—</span>';

        return `
            <tr>
                <td style="color:var(--clr-text-muted); font-size:0.8rem;">${currentPage * PAGE_SIZE + idx + 1}</td>
                <td>
                    <span class="action-badge ${actionInfo.class}">
                        <i class="${actionInfo.icon}"></i> ${actionInfo.label}
                    </span>
                </td>
                <td style="font-size:0.85rem; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${log.description || '—'}
                </td>
                <td>
                    ${entityBadge}
                    ${log.entity_id ? `<code style="font-size:0.75rem; margin-left:4px;">${log.entity_id}</code>` : ''}
                </td>
                <td style="font-size:0.85rem;">
                    ${log.user_full_name || log.user_name || '<span style="color:var(--clr-text-muted);">System</span>'}
                </td>
                <td style="font-size:0.82rem; color:var(--clr-text-secondary);" title="${log.created_at}">
                    ${timeAgo(log.created_at)}
                </td>
            </tr>
        `;
    }).join('');
}

function getActionInfo(action) {
    const map = {
        login: { label: 'Login', icon: 'fas fa-sign-in-alt', class: 'action-auth' },
        logout: { label: 'Logout', icon: 'fas fa-sign-out-alt', class: 'action-auth' },
        user_created: { label: 'User Created', icon: 'fas fa-user-plus', class: 'action-user' },
        user_updated: { label: 'User Updated', icon: 'fas fa-user-edit', class: 'action-user' },
        user_deactivated: { label: 'User Deactivated', icon: 'fas fa-user-slash', class: 'action-danger' },
        password_changed: { label: 'Password Changed', icon: 'fas fa-key', class: 'action-security' },
        password_reset: { label: 'Password Reset', icon: 'fas fa-undo', class: 'action-security' },
        password_reset_requested: { label: 'Reset Requested', icon: 'fas fa-envelope', class: 'action-security' },
        profile_updated: { label: 'Profile Updated', icon: 'fas fa-id-card', class: 'action-user' },
        '2fa_enabled': { label: '2FA Enabled', icon: 'fas fa-shield-alt', class: 'action-security' },
        '2fa_disabled': { label: '2FA Disabled', icon: 'fas fa-unlock', class: 'action-warning' },
        created: { label: 'Created', icon: 'fas fa-plus', class: 'action-create' },
        updated: { label: 'Updated', icon: 'fas fa-edit', class: 'action-update' },
        deleted: { label: 'Deleted', icon: 'fas fa-trash', class: 'action-danger' },
        alert: { label: 'Alert', icon: 'fas fa-exclamation-triangle', class: 'action-warning' },
        received: { label: 'Received', icon: 'fas fa-box', class: 'action-create' },
        sent: { label: 'Sent', icon: 'fas fa-paper-plane', class: 'action-update' },
    };
    return map[action] || { label: action, icon: 'fas fa-circle', class: 'action-default' };
}

function initFilterActions() {
    document.getElementById('applyFilters').addEventListener('click', () => {
        currentPage = 0;
        loadActivityLog();
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('actionFilter').value = '';
        document.getElementById('entityFilter').value = '';
        currentPage = 0;
        loadActivityLog();
    });
}

function initPagination() {
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadActivityLog();
        }
    });
    document.getElementById('nextPage').addEventListener('click', () => {
        if ((currentPage + 1) * PAGE_SIZE < totalLogs) {
            currentPage++;
            loadActivityLog();
        }
    });
}

function updatePagination() {
    const totalPages = Math.ceil(totalLogs / PAGE_SIZE);
    document.getElementById('pageInfo').textContent = `Page ${currentPage + 1} of ${totalPages || 1}`;
    document.getElementById('prevPage').disabled = currentPage === 0;
    document.getElementById('nextPage').disabled = (currentPage + 1) * PAGE_SIZE >= totalLogs;
}
