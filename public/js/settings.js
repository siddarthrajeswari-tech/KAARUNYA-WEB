// ============================================
// KAARUNYA — Settings Page Script
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initNotifications();
    initLogout();
    updateAlertBadge();

    // Auth guard
    const user = await requireLogin();
    loadSidebarUser();
    await loadUserProfile();
    initProfileSave();
    initPasswordChange();
    initShopForm();
    initDataManagement();
    init2FA();
});

async function loadUserProfile() {
    try {
        const { user } = await API.auth.me();
        // Update profile display
        document.getElementById('profileName').textContent = user.fullName || user.full_name;
        document.getElementById('profileRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById('profileEmail').textContent = user.email || 'No email set';

        // Fill form fields
        document.getElementById('fullName').value = user.fullName || user.full_name;
        document.getElementById('emailAddr').value = user.email || '';
        document.getElementById('username').value = user.username;

        // Update sidebar
        document.getElementById('sidebarUserName').textContent = user.fullName || user.full_name;
        document.getElementById('sidebarUserRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        // Update 2FA status
        update2FAStatus(user.has2FA);
    } catch (e) {
        console.warn('Not logged in, redirecting...', e);
        window.location.href = '/login.html';
    }
}

function initProfileSave() {
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('emailAddr').value.trim();

        if (!fullName) {
            showToast('Full name is required.', 'error');
            return;
        }

        try {
            await API.auth.updateProfile({ fullName, email });
            showToast('Profile updated successfully!');
            await loadUserProfile();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

function initPasswordChange() {
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }

        try {
            await API.auth.changePassword({ currentPassword, newPassword });
            showToast('Password changed successfully!');
            document.getElementById('passwordForm').reset();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}

async function initShopForm() {
    document.getElementById('shopForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const btn = document.querySelector('#shopForm button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const shopData = {
                shop_name: document.getElementById('shopName').value,
                shop_phone: document.getElementById('shopPhone').value,
                shop_address: document.getElementById('shopAddress').value,
                shop_email: document.getElementById('shopEmail').value,
                shop_gst: document.getElementById('shopGst').value,
            };
            
            await API.dashboard.saveSettings(shopData);
            showToast('Shop information saved!');
            
            btn.innerHTML = originalText;
            btn.disabled = false;
        } catch (err) {
            showToast(err.message, 'error');
            const btn = document.querySelector('#shopForm button[type="submit"]');
            btn.innerHTML = '<i class="fas fa-save"></i> Save Shop Info';
            btn.disabled = false;
        }
    });

    try {
        const { data } = await API.dashboard.getSettings();
        if (data) {
            document.getElementById('shopName').value = data.shop_name || '';
            document.getElementById('shopPhone').value = data.shop_phone || '';
            document.getElementById('shopAddress').value = data.shop_address || '';
            document.getElementById('shopEmail').value = data.shop_email || '';
            document.getElementById('shopGst').value = data.shop_gst || '';
        }
    } catch (e) {
        console.error('Failed to load shop info', e);
    }
}

function initDataManagement() {
    // Export
    document.getElementById('exportDataBtn').addEventListener('click', async () => {
        try {
            showToast('Exporting data...', 'info');
            const exportData = await API.dashboard.exportDb();

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kaarunya-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            showToast('Data exported successfully!');
        } catch (e) {
            showToast('Export failed: ' + e.message, 'error');
        }
    });

    // Import (placeholder)
    document.getElementById('importDataBtn').addEventListener('click', () => {
        showToast('Import feature coming soon!', 'info');
    });

    // Reset
    document.getElementById('resetDataBtn').addEventListener('click', async () => {
        if (!confirm('⚠️ Are you sure you want to reset ALL data?\n\nThis will delete all your inventory data and replace it with sample data. This action CANNOT be undone!')) return;
        if (!confirm('FINAL WARNING: This will permanently delete all your data. Type OK to confirm.')) return;
        
        try {
            showToast('Resetting database...', 'info');
            await API.dashboard.resetDb();
            showToast('Database reset successfully!', 'success');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            showToast('Reset failed: ' + err.message, 'error');
        }
    });
}

// ============================================
// Two-Factor Authentication
// ============================================
function update2FAStatus(isEnabled) {
    const icon = document.getElementById('tfa-status-icon');
    const text = document.getElementById('tfa-status-text');
    const desc = document.getElementById('tfa-status-desc');
    const setupArea = document.getElementById('tfa-setup-area');
    const disableArea = document.getElementById('tfa-disable-area');

    if (isEnabled) {
        icon.style.background = 'linear-gradient(135deg, rgba(107,158,118,0.15), rgba(107,158,118,0.05))';
        icon.style.color = 'var(--clr-success)';
        text.textContent = '2FA is Enabled';
        text.style.color = 'var(--clr-success)';
        desc.textContent = 'Your account is protected with two-factor authentication.';
        setupArea.style.display = 'none';
        disableArea.style.display = 'block';
    } else {
        icon.style.background = 'linear-gradient(135deg, rgba(201,115,107,0.15), rgba(201,115,107,0.05))';
        icon.style.color = 'var(--clr-danger)';
        text.textContent = '2FA is Disabled';
        text.style.color = 'var(--clr-danger)';
        desc.textContent = 'Enable two-factor authentication for enhanced security.';
        setupArea.style.display = 'block';
        disableArea.style.display = 'none';
    }
}

function init2FA() {
    // Setup 2FA
    document.getElementById('setup2FABtn').addEventListener('click', async () => {
        const btn = document.getElementById('setup2FABtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';

        try {
            const data = await API.auth.setup2FA();
            document.getElementById('tfa-qr-image').src = data.qrCode;
            document.getElementById('tfa-secret').textContent = data.secret;
            document.getElementById('tfa-qr-area').style.display = 'block';
            btn.style.display = 'none';
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-qrcode"></i> Set Up 2FA';
        }
    });

    // Verify 2FA
    document.getElementById('verify2FABtn').addEventListener('click', async () => {
        const code = document.getElementById('tfa-verify-code').value.trim();
        if (!code || code.length !== 6) {
            showToast('Please enter a 6-digit code.', 'error');
            return;
        }

        const btn = document.getElementById('verify2FABtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        try {
            await API.auth.verify2FA({ code });
            showToast('Two-factor authentication enabled! 🎉');
            update2FAStatus(true);
            document.getElementById('tfa-qr-area').style.display = 'none';
            document.getElementById('setup2FABtn').style.display = '';
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Verify & Enable';
        }
    });

    // Disable 2FA
    document.getElementById('disable2FABtn').addEventListener('click', async () => {
        const password = document.getElementById('tfa-disable-password').value;
        if (!password) {
            showToast('Password is required to disable 2FA.', 'error');
            return;
        }

        if (!confirm('Are you sure you want to disable two-factor authentication?')) return;

        const btn = document.getElementById('disable2FABtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Disabling...';

        try {
            await API.auth.disable2FA({ password });
            showToast('Two-factor authentication disabled.');
            update2FAStatus(false);
            document.getElementById('tfa-disable-password').value = '';
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-unlock"></i> Disable 2FA';
        }
    });
}
