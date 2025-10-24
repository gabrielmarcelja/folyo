/**
 * Folyo - Portfolio Page
 * Manages portfolio UI and rendering
 */

const Portfolio = {
    currentView: 'overview',
    currentWallet: null,
    historyChartOverview: null,
    historyChartWallet: null,
    currentSort: {
        column: 'value',  // Default sort by value
        direction: 'desc' // Descending (highest first)
    },
    holdingsData: [],
    // Store allocation data for re-rendering when theme changes
    allocationDataOverview: [],
    allocationDataWallet: [],
    // Store original token allocation data separately
    tokenAllocationOverview: [],
    tokenAllocationWallet: [],

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

        // Initialize history charts (BEFORE loading data)
        this.initHistoryCharts();

        // Load portfolio data (charts already exist)
        await PortfolioManager.init();
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

        // Sortable table headers
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortColumn = header.dataset.sort;
                this.handleSort(sortColumn);
            });
        });

        // Show charts toggle - Overview
        const showChartsOverview = document.getElementById('show-charts-overview');
        if (showChartsOverview) {
            // Set default to checked (charts visible)
            showChartsOverview.checked = true;

            showChartsOverview.addEventListener('change', (e) => {
                const overviewView = document.getElementById('overview-view');
                const chartsGrid = overviewView?.querySelector('.charts-grid');
                if (chartsGrid) {
                    chartsGrid.style.display = e.target.checked ? 'grid' : 'none';
                }
            });
        }

        // Show charts toggle - Wallet
        const showChartsWallet = document.getElementById('show-charts-wallet');
        if (showChartsWallet) {
            // Set default to checked (charts visible)
            showChartsWallet.checked = true;

            showChartsWallet.addEventListener('change', (e) => {
                const walletView = document.getElementById('wallet-view');
                const chartsGrid = walletView?.querySelector('.charts-grid');
                if (chartsGrid) {
                    chartsGrid.style.display = e.target.checked ? 'grid' : 'none';
                }
            });
        }

        // Listen for theme changes to re-render allocation charts
        window.addEventListener('themeChanged', () => {
            this.reRenderAllocationCharts();
        });

        // Allocation tab switching
        document.querySelectorAll('.allocation-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const parent = button.closest('.allocation-section');
                const allTabs = parent.querySelectorAll('.allocation-tab');

                // Update active state
                allTabs.forEach(t => t.classList.remove('active'));
                button.classList.add('active');

                // Determine which view we're in (overview or wallet)
                const isOverview = parent.closest('#overview-view') !== null;
                const viewType = button.textContent.trim();

                // Re-render chart based on selected tab
                if (viewType === 'Token') {
                    // Show allocation by token (default)
                    if (isOverview) {
                        if (this.tokenAllocationOverview.length > 0) {
                            this.renderAllocationChart('allocation-chart-overview', this.tokenAllocationOverview);
                            this.renderAllocationLegend('allocation-legend-overview', this.tokenAllocationOverview);
                        }
                    } else {
                        if (this.tokenAllocationWallet.length > 0) {
                            this.renderAllocationChart('allocation-chart-wallet', this.tokenAllocationWallet);
                            this.renderAllocationLegend('allocation-legend-wallet', this.tokenAllocationWallet);
                        }
                    }
                } else if (viewType === 'Portfolio') {
                    // Show allocation by portfolio (only in overview)
                    if (isOverview) {
                        this.renderPortfolioAllocation();
                    }
                }
            });
        });
    },

    /**
     * Re-render allocation charts when theme changes
     */
    reRenderAllocationCharts() {
        // Re-render overview allocation chart if data exists
        if (this.allocationDataOverview.length > 0) {
            this.renderAllocationChart('allocation-chart-overview', this.allocationDataOverview);
        }

        // Re-render wallet allocation chart if data exists
        if (this.allocationDataWallet.length > 0) {
            this.renderAllocationChart('allocation-chart-wallet', this.allocationDataWallet);
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
     * Initialize history charts
     */
    initHistoryCharts() {
        // Initialize Overview chart
        this.historyChartOverview = new PortfolioChart('history-chart-overview', {
            tooltipId: 'history-tooltip-overview',
            loadingId: 'history-loading-overview',
            emptyId: 'history-empty-overview'
        });

        // Initialize Wallet chart
        this.historyChartWallet = new PortfolioChart('history-chart-wallet', {
            tooltipId: 'history-tooltip-wallet',
            loadingId: 'history-loading-wallet',
            emptyId: 'history-empty-wallet'
        });

        // Setup period button event listeners for Overview
        document.querySelectorAll('#overview-view .period-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                // Remove active from all buttons
                document.querySelectorAll('#overview-view .period-btn').forEach(b => b.classList.remove('active'));
                // Add active to clicked button
                btn.classList.add('active');

                const period = btn.dataset.period;
                await this.historyChartOverview.loadData(null, period); // null = all portfolios
            });
        });

        // Setup period button event listeners for Wallet
        document.querySelectorAll('#wallet-view .period-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                // Remove active from all buttons
                document.querySelectorAll('#wallet-view .period-btn').forEach(b => b.classList.remove('active'));
                // Add active to clicked button
                btn.classList.add('active');

                const period = btn.dataset.period;
                if (PortfolioManager.currentPortfolio) {
                    await this.historyChartWallet.loadData(PortfolioManager.currentPortfolio, period);
                }
            });
        });
    },

    /**
     * Render allocation donut chart with enhanced visuals
     * @param {string} canvasId
     * @param {array} data
     * @param {boolean} isTokenData - True if this is token allocation data (for storing separately)
     */
    renderAllocationChart(canvasId, data, isTokenData = false) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Store data for re-rendering when theme changes
        if (canvasId === 'allocation-chart-overview') {
            this.allocationDataOverview = data;
            // Also store as token data if specified
            if (isTokenData) {
                this.tokenAllocationOverview = data;
            }
        } else if (canvasId === 'allocation-chart-wallet') {
            this.allocationDataWallet = data;
            // Also store as token data if specified
            if (isTokenData) {
                this.tokenAllocationWallet = data;
            }
        }

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
     * Render portfolio allocation (allocation by portfolio instead of by token)
     */
    renderPortfolioAllocation() {
        // Get all portfolios and their values
        const portfolios = PortfolioManager.portfolios || [];

        if (portfolios.length === 0) return;

        // Calculate total value across all portfolios
        const totalValue = portfolios.reduce((sum, p) => sum + (parseFloat(p.total_invested) || 0), 0);

        // Create allocation data by portfolio
        const portfolioAllocation = portfolios.map(portfolio => {
            const value = parseFloat(portfolio.total_invested) || 0;
            const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;

            return {
                token: portfolio.name,
                value: value,
                percent: percent,
                color: this.getPortfolioColor(portfolio.id)
            };
        }).filter(item => item.value > 0);

        // Render chart and legend
        if (portfolioAllocation.length > 0) {
            this.renderAllocationChart('allocation-chart-overview', portfolioAllocation);
            this.renderAllocationLegend('allocation-legend-overview', portfolioAllocation);
        }
    },

    /**
     * Get color for portfolio (consistent colors)
     */
    getPortfolioColor(portfolioId) {
        const colors = [
            '#16C784', '#3B82F6', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
            '#06B6D4', '#84CC16', '#A855F7', '#EAB308'
        ];
        return colors[portfolioId % colors.length];
    },

    /**
     * Render holdings table
     * @param {array} holdings
     */
    renderHoldingsTable(holdings) {
        const tbody = document.getElementById('holdings-table-body');
        if (!tbody) return;

        // Store holdings data for sorting
        this.holdingsData = holdings;

        // Apply current sort
        const sortedHoldings = this.sortHoldings([...holdings]);

        // Update sort header indicators
        this.updateSortHeaders();

        tbody.innerHTML = sortedHoldings.map(asset => {
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
    },

    /**
     * Handle table column sort
     * @param {string} column - Column to sort by
     */
    handleSort(column) {
        // Toggle sort direction if clicking same column
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New column - default to descending for values, ascending for names
            this.currentSort.column = column;
            this.currentSort.direction = column === 'name' ? 'asc' : 'desc';
        }

        // Update header UI
        this.updateSortHeaders();

        // Re-render with sorted data
        if (this.holdingsData.length > 0) {
            const sorted = this.sortHoldings([...this.holdingsData]);
            this.renderHoldingsTable(sorted);
        }
    },

    /**
     * Update sort indicator on table headers
     */
    updateSortHeaders() {
        // Remove all sort classes
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add current sort class
        const currentHeader = document.querySelector(`.sortable[data-sort="${this.currentSort.column}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${this.currentSort.direction}`);
        }
    },

    /**
     * Sort holdings array
     * @param {array} holdings - Holdings to sort
     * @returns {array} Sorted holdings
     */
    sortHoldings(holdings) {
        return holdings.sort((a, b) => {
            let aVal, bVal;

            switch (this.currentSort.column) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'price':
                    aVal = a.price;
                    bVal = b.price;
                    break;
                case 'change1h':
                    aVal = a.change1h;
                    bVal = b.change1h;
                    break;
                case 'change24h':
                    aVal = a.change24h;
                    bVal = b.change24h;
                    break;
                case 'change7d':
                    aVal = a.change7d;
                    bVal = b.change7d;
                    break;
                case 'balance':
                    aVal = a.balance || a.holdings?.quantity || 0;
                    bVal = b.balance || b.holdings?.quantity || 0;
                    break;
                case 'value':
                    aVal = a.value || a.holdings?.value || 0;
                    bVal = b.value || b.holdings?.value || 0;
                    break;
                case 'avgBuyPrice':
                    aVal = a.avgBuyPrice || 0;
                    bVal = b.avgBuyPrice || 0;
                    break;
                case 'profitLoss':
                    aVal = a.profitLoss || 0;
                    bVal = b.profitLoss || 0;
                    break;
                default:
                    return 0;
            }

            // Handle string vs number comparison
            if (typeof aVal === 'string') {
                return this.currentSort.direction === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return this.currentSort.direction === 'asc'
                    ? aVal - bVal
                    : bVal - aVal;
            }
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Portfolio.init();
});
