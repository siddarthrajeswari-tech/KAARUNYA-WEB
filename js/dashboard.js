// ============================================
// KAARUNYA — Dashboard Page Script
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotifications();
    initTableSort('topProductsTable');
    renderPurchaseChart();
    renderStockChart();
    renderFabricChart();
    updateAlertBadge();
    initGlobalSearch();
});

function updateAlertBadge() {
    const badge = document.getElementById('alertBadge');
    const low = getLowStockProducts();
    if (badge) badge.textContent = low.length;
    const countEl = document.getElementById('lowStockCount');
    if (countEl) countEl.textContent = low.length;
}

function renderPurchaseChart() {
    const ctx = document.getElementById('purchaseChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: DATA.monthlyPurchases.labels,
            datasets: [
                {
                    label: 'Purchase Amount (₹)',
                    data: DATA.monthlyPurchases.amounts,
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primaryBg,
                    fill: true,
                    pointBackgroundColor: CHART_COLORS.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                    tension: 0.4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return ctx.dataset.label + ': ₹' + ctx.raw.toLocaleString('en-IN');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: v => '₹' + (v / 1000) + 'K'
                    }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderStockChart() {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DATA.stockByCategory.labels,
            datasets: [{
                data: DATA.stockByCategory.values,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.9)',
                    'rgba(37, 99, 235, 0.85)',
                    'rgba(96, 165, 250, 0.8)',
                    'rgba(147, 197, 253, 0.75)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(37, 99, 235, 1)',
                    'rgba(96, 165, 250, 1)',
                    'rgba(147, 197, 253, 1)'
                ],
                borderWidth: 1,
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: { position: 'bottom' },
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            },
        }
    });
}

function renderFabricChart() {
    const ctx = document.getElementById('fabricChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: DATA.fabricDistribution.labels,
            datasets: [{
                data: DATA.fabricDistribution.values,
                backgroundColor: CHART_COLORS.fabrics,
                borderColor: '#fff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            cutout: '62%',
            plugins: {
                legend: { position: 'bottom' },
            }
        }
    });
}

// ============================================
// Global Search Functionality
// ============================================
function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            showSearchCleared();
            return;
        }

        performSearch(query);
    });

    // Clear search on escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            showSearchCleared();
        }
    });
}

function performSearch(query) {
    const products = DATA.products.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.fabric.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );

    const suppliers = DATA.suppliers.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
    );

    displaySearchResults(products, suppliers, query);
}

function displaySearchResults(products, suppliers, query) {
    // Remove existing results if any
    const existingResults = document.getElementById('searchResults');
    if (existingResults) existingResults.remove();

    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'searchResults';
    resultsDiv.className = 'search-results-panel';

    let html = `<div class="search-results-content">
        <div class="search-results-header">
            <h3>Search Results for "${query}"</h3>
            <button class="close-results" onclick="document.getElementById('searchResults').remove()">×</button>
        </div>
        <div class="results-container">`;

    if (products.length === 0 && suppliers.length === 0) {
        html += `<p class="no-results">No results found for "${query}"</p>`;
    } else {
        if (products.length > 0) {
            html += `<div class="results-section">
                <h4><i class="fas fa-tshirt"></i> Products (${products.length})</h4>
                <ul class="results-list">`;
            products.forEach(p => {
                html += `<li class="result-item">
                    <div class="result-name">${p.name}</div>
                    <div class="result-details">
                        <span class="badge">${p.id}</span>
                        <span class="result-meta">Fabric: ${p.fabric}</span>
                        <span class="result-meta">Stock: ${p.stock}</span>
                    </div>
                </li>`;
            });
            html += `</ul>
            </div>`;
        }

        if (suppliers.length > 0) {
            html += `<div class="results-section">
                <h4><i class="fas fa-truck"></i> Suppliers (${suppliers.length})</h4>
                <ul class="results-list">`;
            suppliers.forEach(s => {
                html += `<li class="result-item">
                    <div class="result-name">${s.name}</div>
                    <div class="result-details">
                        <span class="badge">${s.id}</span>
                        <span class="result-meta">${s.email}</span>
                        <span class="status-badge ${s.status.toLowerCase()}">${s.status}</span>
                    </div>
                </li>`;
            });
            html += `</ul>
            </div>`;
        }
    }

    html += `</div></div>`;
    resultsDiv.innerHTML = html;
    
    // Insert after header
    const header = document.querySelector('.topbar');
    if (header) {
        header.insertAdjacentElement('afterend', resultsDiv);
    } else {
        document.body.insertAdjacentElement('afterbegin', resultsDiv);
    }
}

function showSearchCleared() {
    const existingResults = document.getElementById('searchResults');
    if (existingResults) existingResults.remove();
}
