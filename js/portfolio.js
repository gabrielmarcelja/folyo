/**
 * Folyo - Portfolio Page
 * Manages portfolio UI and rendering
 */

const Portfolio = {
    currentView: 'overview',
    currentWallet: null,

    /**
     * Initialize portfolio page
     */
    async init() {
        // Initialize managers
        ThemeManager.init();
        CurrencyManager.init();

        // Setup event listeners
        this.setupEventListeners();

        // Check authentication status first
        await AuthManager.init();

        // Require authentication for portfolio page
        if (!AuthManager.requireAuth()) {
            return; // Will redirect to home
        }

        // Initialize managers
        TransactionManager.init();
        await PortfolioManager.init();

        console.log('Portfolio initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Overview button
        document.getElementById('overview-btn').addEventListener('click', () => {
            PortfolioManager.loadOverview();
        });

        // Create portfolio buttons
        document.querySelectorAll('.btn-create-portfolio, .btn-primary').forEach(btn => {
            if (btn.textContent.includes('Create portfolio')) {
                btn.addEventListener('click', () => {
                    PortfolioManager.showCreatePortfolioModal();
                });
            }
        });

        // Sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('portfolio-sidebar');
        const backdrop = document.getElementById('portfolio-sidebar-backdrop');

        if (sidebarToggle && sidebar && backdrop) {
            // Toggle sidebar
            sidebarToggle.addEventListener('click', () => {
                const isOpen = sidebar.classList.contains('open');

                if (isOpen) {
                    this.closeSidebar();
                } else {
                    this.openSidebar();
                }
            });

            // Close sidebar on backdrop click
            backdrop.addEventListener('click', () => {
                this.closeSidebar();
            });

            // Close sidebar when selecting a wallet/view
            document.querySelectorAll('.sidebar-item, .wallet-item').forEach(item => {
                const originalClick = item.onclick;
                item.addEventListener('click', () => {
                    // Close sidebar on mobile after selection
                    if (window.innerWidth <= 768) {
                        setTimeout(() => this.closeSidebar(), 300);
                    }
                });
            });

            // Close on ESC key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                    this.closeSidebar();
                }
            });
        }
    },

    /**
     * Open sidebar (mobile)
     */
    openSidebar() {
        const sidebar = document.getElementById('portfolio-sidebar');
        const backdrop = document.getElementById('portfolio-sidebar-backdrop');

        if (sidebar && backdrop) {
            sidebar.classList.add('open');
            backdrop.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close sidebar (mobile)
     */
    closeSidebar() {
        const sidebar = document.getElementById('portfolio-sidebar');
        const backdrop = document.getElementById('portfolio-sidebar-backdrop');

        if (sidebar && backdrop) {
            sidebar.classList.remove('open');
            backdrop.classList.remove('open');
            document.body.style.overflow = '';
        }
    },


    /**
     * Render allocation donut chart with enhanced visuals
     * @param {string} canvasId
     * @param {array} data
     */
    renderAllocationChart(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;
        const innerRadius = 80;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let startAngle = -Math.PI / 2;

        // Draw slices with enhanced styling
        data.forEach(item => {
            const sliceAngle = (item.percent / 100) * 2 * Math.PI;

            // Draw slice
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();

            // Fill with solid color
            ctx.fillStyle = item.color;
            ctx.fill();

            // Add subtle shadow for depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            startAngle += sliceAngle;
        });

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw inner circle for clean donut hole
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-primary');
        ctx.fill();
    },

    /**
     * Render allocation legend
     * @param {string} legendId
     * @param {array} data
     */
    renderAllocationLegend(legendId, data) {
        const container = document.getElementById(legendId);
        if (!container) return;

        container.innerHTML = data.map(item => `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${item.color}"></div>
                <div class="legend-info">
                    <span class="legend-token">${item.token}</span>
                    <span class="legend-percent">${item.percent.toFixed(2)}%</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render holdings table
     * @param {array} holdings
     */
    renderHoldingsTable(holdings) {
        const tbody = document.getElementById('holdings-table-body');
        if (!tbody) return;

        tbody.innerHTML = holdings.map(asset => {
            const change1hClass = asset.change1h >= 0 ? 'change-positive' : 'change-negative';
            const change24hClass = asset.change24h >= 0 ? 'change-positive' : 'change-negative';
            const change7dClass = asset.change7d >= 0 ? 'change-positive' : 'change-negative';
            const arrow1h = asset.change1h >= 0 ? '▲' : '▼';
            const arrow24h = asset.change24h >= 0 ? '▲' : '▼';
            const arrow7d = asset.change7d >= 0 ? '▲' : '▼';

            return `
                <tr>
                    <td>
                        <div class="asset-cell">
                            <img src="${asset.logo}" alt="${asset.symbol}" class="asset-logo">
                            <div class="asset-info">
                                <div class="asset-name">${asset.name}</div>
                                <div class="asset-symbol">${asset.symbol}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="wallet-badges">
                            ${asset.wallets.map(w => `<span class="wallet-badge"><span class="wallet-badge-icon">💰</span>${w}</span>`).join('')}
                        </div>
                    </td>
                    <td>$${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td class="${change1hClass}">${arrow1h} ${Math.abs(asset.change1h)}%</td>
                    <td class="${change24hClass}">${arrow24h} ${Math.abs(asset.change24h)}%</td>
                    <td class="${change7dClass}">${arrow7d} ${Math.abs(asset.change7d)}%</td>
                    <td>${asset.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td>$${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `;
        }).join('');

        // Render mobile cards
        this.renderHoldingsCards(holdings);
    },

    /**
     * Render holdings cards for mobile
     * @param {array} holdings
     */
    renderHoldingsCards(holdings) {
        const container = document.getElementById('holdings-cards');
        if (!container) return;

        container.innerHTML = holdings.map(asset => {
            const change24hClass = asset.change24h >= 0 ? 'change-positive' : 'change-negative';
            const arrow24h = asset.change24h >= 0 ? '▲' : '▼';

            return `
                <div class="holding-card">
                    <div class="holding-card-header">
                        <img src="${asset.logo}" alt="${asset.symbol}" class="asset-logo">
                        <div class="asset-info">
                            <div class="asset-name">${asset.name}</div>
                            <div class="asset-symbol">${asset.symbol}</div>
                        </div>
                    </div>
                    <div class="holding-card-body">
                        <div class="card-field">
                            <span class="card-field-label">Price</span>
                            <span class="card-field-value">$${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div class="card-field">
                            <span class="card-field-label">24h Change</span>
                            <span class="card-field-value ${change24hClass}">${arrow24h} ${Math.abs(asset.change24h)}%</span>
                        </div>
                        <div class="card-field">
                            <span class="card-field-label">Balance</span>
                            <span class="card-field-value">${asset.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div class="card-field">
                            <span class="card-field-label">Value</span>
                            <span class="card-field-value">$${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render assets table
     * @param {array} assets
     */
    renderAssetsTable(assets) {
        const tbody = document.getElementById('assets-table-body');
        if (!tbody) return;

        tbody.innerHTML = assets.map(asset => {
            const change1hClass = asset.change1h >= 0 ? 'change-positive' : 'change-negative';
            const change24hClass = asset.change24h >= 0 ? 'change-positive' : 'change-negative';
            const change7dClass = asset.change7d >= 0 ? 'change-positive' : 'change-negative';
            const arrow1h = asset.change1h >= 0 ? '▲' : '▼';
            const arrow24h = asset.change24h >= 0 ? '▲' : '▼';
            const arrow7d = asset.change7d >= 0 ? '▲' : '▼';

            const profitLossClass = asset.profitLoss >= 0 ? 'change-positive' : 'change-negative';
            const profitLossSign = asset.profitLoss >= 0 ? '+' : '';

            return `
                <tr>
                    <td>
                        <div class="asset-cell">
                            <img src="${asset.logo}" alt="${asset.symbol}" class="asset-logo">
                            <div class="asset-info">
                                <div class="asset-name">${asset.name}</div>
                                <div class="asset-symbol">${asset.symbol}</div>
                            </div>
                        </div>
                    </td>
                    <td>$${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td class="${change1hClass}">${arrow1h} ${Math.abs(asset.change1h)}%</td>
                    <td class="${change24hClass}">${arrow24h} ${Math.abs(asset.change24h)}%</td>
                    <td class="${change7dClass}">${arrow7d} ${Math.abs(asset.change7d)}%</td>
                    <td>
                        <div class="holdings-value">
                            <span class="holdings-amount">$${asset.holdings.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span class="holdings-token">${asset.holdings.amount.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ${asset.holdings.token}</span>
                        </div>
                    </td>
                    <td>$${asset.avgBuyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td class="${profitLossClass}">
                        ${profitLossSign}$${Math.abs(asset.profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
                        <span style="font-size: 12px; color: var(--text-secondary);">${profitLossSign}${Math.abs(asset.profitLossPercent).toFixed(2)}%</span>
                    </td>
                    <td>
                        <button class="table-action-btn">+ •••</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Render mobile cards
        this.renderAssetsCards(assets);
    },

    /**
     * Render assets cards for mobile
     * @param {array} assets
     */
    renderAssetsCards(assets) {
        const container = document.getElementById('assets-cards');
        if (!container) return;

        container.innerHTML = assets.map(asset => {
            const change24hClass = asset.change24h >= 0 ? 'change-positive' : 'change-negative';
            const arrow24h = asset.change24h >= 0 ? '▲' : '▼';
            const profitLossClass = asset.profitLoss >= 0 ? 'change-positive' : 'change-negative';
            const profitLossSign = asset.profitLoss >= 0 ? '+' : '';

            return `
                <div class="asset-card">
                    <div class="asset-card-header">
                        <img src="${asset.logo}" alt="${asset.symbol}" class="asset-logo">
                        <div class="asset-info">
                            <div class="asset-name">${asset.name}</div>
                            <div class="asset-symbol">${asset.symbol}</div>
                        </div>
                    </div>
                    <div class="asset-card-body">
                        <div class="card-field">
                            <span class="card-field-label">Price</span>
                            <span class="card-field-value">$${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div class="card-field">
                            <span class="card-field-label">24h Change</span>
                            <span class="card-field-value ${change24hClass}">${arrow24h} ${Math.abs(asset.change24h)}%</span>
                        </div>
                        <div class="card-field">
                            <span class="card-field-label">Holdings</span>
                            <span class="card-field-value">$${asset.holdings.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div class="card-field">
                            <span class="card-field-label">Profit/Loss</span>
                            <span class="card-field-value ${profitLossClass}">${profitLossSign}$${Math.abs(asset.profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Portfolio.init();
});
