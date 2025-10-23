/**
 * Folyo - Portfolio Manager
 * Manages portfolio data, API integration, and state
 */

const PortfolioManager = {
    portfolios: [],
    currentPortfolio: null,
    allHoldings: [],
    isLoading: false,
    loadingTimeout: null,

    /**
     * Initialize portfolio manager
     */
    async init() {
        // Check authentication
        if (!AuthManager.isAuthenticated) {
            console.log('User not authenticated, skipping portfolio load');
            this.showEmptyState();
            return;
        }

        // Load portfolios
        await this.loadPortfolios();
    },

    /**
     * Load all portfolios for current user
     */
    async loadPortfolios() {
        this.isLoading = true;
        this.showLoadingState();

        try {
            const portfolios = await APIClient.getPortfolios();
            this.portfolios = portfolios;

            if (portfolios.length === 0) {
                this.showEmptyState();
            } else {
                // Render portfolios in sidebar
                this.renderPortfoliosSidebar();

                // Load overview by default
                await this.loadOverview();
            }
        } catch (error) {
            console.error('Error loading portfolios:', error);
            this.showError('Failed to load portfolios');
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Load overview with all holdings across portfolios
     */
    async loadOverview() {
        try {
            this.showLoadingState();

            // Fetch all holdings across all portfolios
            const holdingsData = await APIClient.getAllUserHoldings();
            this.allHoldings = holdingsData;

            // Calculate overview statistics
            const overview = this.calculateOverview(holdingsData);

            // Render overview
            this.renderOverview(overview);

        } catch (error) {
            console.error('Error loading overview:', error);
            this.showError('Failed to load portfolio overview');
        }
    },

    /**
     * Load specific portfolio with holdings
     * @param {number} portfolioId
     */
    async loadPortfolio(portfolioId) {
        // Prevent rapid successive clicks (debounce)
        if (this.isLoading) {
            console.log('Already loading portfolio, please wait...');
            return;
        }

        try {
            this.isLoading = true;
            this.showLoadingState();
            this.currentPortfolio = portfolioId;

            // Fetch portfolio with holdings and real-time prices
            const portfolioData = await APIClient.getHoldings(portfolioId);

            // Validate API response structure
            if (!portfolioData) {
                throw new Error('No data received from API');
            }

            if (!portfolioData.portfolio) {
                throw new Error('Portfolio data is missing from API response');
            }

            if (!portfolioData.summary) {
                throw new Error('Summary data is missing from API response');
            }

            if (!portfolioData.holdings) {
                portfolioData.holdings = []; // Default to empty array if missing
            }

            // Render portfolio view
            this.renderPortfolioView(portfolioData);

            this.isLoading = false;

        } catch (error) {
            console.error('Error loading portfolio:', error);
            console.error('Portfolio ID:', portfolioId);
            console.error('Error details:', error.message);

            // Show user-friendly error message
            const errorMessage = error.message || 'Failed to load portfolio data';
            this.showError(errorMessage);

            this.isLoading = false;
        }
    },

    /**
     * Create new portfolio
     * @param {string} name
     * @param {string} description
     */
    async createPortfolio(name, description = '') {
        try {
            const portfolio = await APIClient.createPortfolio(name, description);

            // Add to local list
            this.portfolios.push(portfolio);

            // Re-render sidebar
            this.renderPortfoliosSidebar();

            // Show success message
            AuthManager.showMessage('Portfolio created successfully!', 'success');

            // Load the new portfolio
            await this.loadPortfolio(portfolio.id);

            return portfolio;
        } catch (error) {
            console.error('Error creating portfolio:', error);
            AuthManager.showMessage(error.message || 'Failed to create portfolio', 'error');
            throw error;
        }
    },

    /**
     * Delete portfolio
     * @param {number} portfolioId
     */
    async deletePortfolio(portfolioId) {
        if (!confirm('Are you sure you want to delete this portfolio? All transactions will be lost.')) {
            return;
        }

        try {
            await APIClient.deletePortfolio(portfolioId);

            // Remove from local list
            this.portfolios = this.portfolios.filter(p => p.id !== portfolioId);

            // Re-render sidebar
            this.renderPortfoliosSidebar();

            // Show success message
            AuthManager.showMessage('Portfolio deleted successfully', 'success');

            // Load overview
            await this.loadOverview();

        } catch (error) {
            console.error('Error deleting portfolio:', error);
            AuthManager.showMessage(error.message || 'Failed to delete portfolio', 'error');
        }
    },

    /**
     * Render portfolios in sidebar
     */
    renderPortfoliosSidebar() {
        const walletsListContainer = document.querySelector('.wallets-list');
        if (!walletsListContainer) return;

        if (this.portfolios.length === 0) {
            walletsListContainer.innerHTML = '<div class="empty-portfolios">No portfolios yet</div>';
            return;
        }

        // Update portfolio count
        const countEl = document.querySelector('.sidebar-section-header h3');
        if (countEl) {
            countEl.textContent = `My portfolios (${this.portfolios.length})`;
        }

        // Render portfolio items
        walletsListContainer.innerHTML = this.portfolios.map(portfolio => {
            const icon = this.getPortfolioIcon(portfolio.name);
            const value = portfolio.total_invested || 0;

            return `
                <div class="wallet-item-wrapper">
                    <button class="wallet-item" data-portfolio-id="${portfolio.id}" aria-label="Open ${this.escapeHtml(portfolio.name)} portfolio">
                        <span class="wallet-icon" aria-hidden="true">${icon}</span>
                        <div class="wallet-info">
                            <div class="wallet-name">${this.escapeHtml(portfolio.name)}</div>
                            <div class="wallet-value">$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                    </button>
                    <button class="wallet-item-edit" data-portfolio-id="${portfolio.id}" title="Edit portfolio" aria-label="Edit ${this.escapeHtml(portfolio.name)} portfolio settings" onclick="event.stopPropagation(); PortfolioManager.showEditPortfolioModal(${portfolio.id})">⚙️</button>
                </div>
            `;
        }).join('');

        // Add event listeners to portfolio items
        document.querySelectorAll('.wallet-item').forEach(item => {
            item.addEventListener('click', () => {
                const portfolioId = parseInt(item.dataset.portfolioId);
                this.loadPortfolio(portfolioId);

                // Update active state
                document.querySelectorAll('.wallet-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    Portfolio.closeSidebar();
                }
            });
        });
    },

    /**
     * Calculate overview statistics from all holdings
     * @param {array} holdingsData
     */
    calculateOverview(holdingsData) {
        let totalValue = 0;
        let totalChange24h = 0;
        let allocationMap = new Map();
        let holdings = [];

        // Process holdings data
        if (holdingsData && holdingsData.length > 0) {
            holdingsData.forEach(holding => {
                const currentValue = parseFloat(holding.current_value || 0);
                totalValue += currentValue;
                totalChange24h += parseFloat(holding.value_change_24h || 0);

                // Group by crypto for allocation
                if (allocationMap.has(holding.crypto_symbol)) {
                    const existing = allocationMap.get(holding.crypto_symbol);
                    existing.value += currentValue;
                } else {
                    allocationMap.set(holding.crypto_symbol, {
                        token: holding.crypto_symbol,
                        value: currentValue,
                        color: this.getColorForToken(holding.crypto_symbol)
                    });
                }

                // Add to holdings array
                holdings.push({
                    name: holding.crypto_name,
                    symbol: holding.crypto_symbol,
                    logo: `https://s2.coinmarketcap.com/static/img/coins/64x64/${holding.crypto_id}.png`,
                    price: parseFloat(holding.current_price || 0),
                    change1h: parseFloat(holding.price_change_1h || 0),
                    change24h: parseFloat(holding.price_change_24h || 0),
                    change7d: parseFloat(holding.price_change_7d || 0),
                    balance: parseFloat(holding.total_quantity || 0),
                    value: currentValue
                });
            });
        }

        // Calculate allocation percentages
        const allocation = Array.from(allocationMap.values()).map(item => ({
            token: item.token,
            percent: totalValue > 0 ? (item.value / totalValue * 100) : 0,
            color: item.color
        })).sort((a, b) => b.percent - a.percent);

        // Show top 7 and group others
        let allocationFinal = allocation.slice(0, 7);
        if (allocation.length > 7) {
            const othersPercent = allocation.slice(7).reduce((sum, item) => sum + item.percent, 0);
            allocationFinal.push({ token: 'Others', percent: othersPercent, color: '#6B7280' });
        }

        const changePercent24h = totalValue > 0 ? (totalChange24h / totalValue * 100) : 0;

        return {
            totalValue,
            change24h: totalChange24h,
            changePercent24h,
            allocation: allocationFinal,
            holdings
        };
    },

    /**
     * Render overview
     * @param {object} overview
     */
    renderOverview(overview) {
        // Update header values
        const totalValueEl = document.querySelector('.portfolio-total-value');
        if (totalValueEl) {
            totalValueEl.textContent = '$' + overview.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        const changeEl = document.querySelector('.portfolio-change');
        if (changeEl) {
            const changeClass = overview.changePercent24h >= 0 ? 'positive' : 'negative';
            const arrow = overview.changePercent24h >= 0 ? '▲' : '▼';
            changeEl.className = 'portfolio-change ' + changeClass;
            changeEl.innerHTML = `${overview.change24h >= 0 ? '+' : ''}$${Math.abs(overview.change24h).toFixed(2)} <span class="arrow">${arrow}</span>${Math.abs(overview.changePercent24h).toFixed(2)}% (24h)`;
        }

        // Update overview button value in sidebar
        const overviewBtn = document.getElementById('overview-btn');
        if (overviewBtn) {
            const sidebarValue = overviewBtn.querySelector('.sidebar-value');
            if (sidebarValue) {
                sidebarValue.textContent = '$' + overview.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }

        // Update asset count in chart center
        const chartCenter = document.getElementById('chart-center-overview');
        if (chartCenter) {
            chartCenter.textContent = overview.holdings.length;
        }

        // Use existing Portfolio rendering methods
        if (overview.allocation.length > 0) {
            Portfolio.renderAllocationChart('allocation-chart-overview', overview.allocation);
            Portfolio.renderAllocationLegend('allocation-legend-overview', overview.allocation);
        }

        if (overview.holdings.length > 0) {
            Portfolio.renderHoldingsTable(overview.holdings);
        } else {
            const tbody = document.getElementById('holdings-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="empty-message">No holdings yet. Create a portfolio and add transactions to get started.</td></tr>';
            }
        }

        // Show overview view
        document.getElementById('overview-view').classList.add('active');
        document.getElementById('wallet-view').classList.remove('active');

        // Update sidebar active state
        document.querySelectorAll('.sidebar-item, .wallet-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById('overview-btn').classList.add('active');
    },

    /**
     * Render portfolio view
     * @param {object} portfolioData
     */
    renderPortfolioView(portfolioData) {
        const { portfolio, holdings, summary } = portfolioData;
        const portfolioId = portfolio.id; // Fix: Define portfolioId for use in this scope

        // Update header
        const nameEl = document.getElementById('wallet-name');
        if (nameEl) nameEl.textContent = portfolio.name;

        const valueEl = document.getElementById('wallet-total-value');
        if (valueEl) {
            valueEl.textContent = '$' + (summary.total_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        const changeEl = document.getElementById('wallet-change');
        if (changeEl) {
            // Use profit/loss as change (since we don't have 24h change yet)
            const change = summary.total_profit_loss || 0;
            const changePercent = summary.total_profit_loss_percent || 0;
            const changeClass = changePercent >= 0 ? 'positive' : 'negative';
            const arrow = changePercent >= 0 ? '▲' : '▼';
            changeEl.className = 'wallet-change ' + changeClass;
            changeEl.innerHTML = `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)} <span class="arrow">${arrow}</span>${Math.abs(changePercent).toFixed(2)}% (P/L)`;
        }

        // Update stats
        const profitEl = document.getElementById('stat-profit');
        if (profitEl) {
            const profit = summary.total_profit_loss || 0;
            const profitClass = profit >= 0 ? 'positive' : 'negative';
            const profitSign = profit >= 0 ? '+' : '';
            profitEl.className = `stat-value ${profitClass}`;
            profitEl.textContent = `${profitSign}$${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        const costBasisEl = document.getElementById('stat-cost-basis');
        if (costBasisEl) {
            costBasisEl.textContent = '$' + (summary.total_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Best/Worst performers - Calculate from holdings
        if (holdings && holdings.length > 0) {
            const sortedByProfit = [...holdings].sort((a, b) => parseFloat(b.profit_loss) - parseFloat(a.profit_loss));

            const bestPerformer = sortedByProfit[0];
            const worstPerformer = sortedByProfit[sortedByProfit.length - 1];

            const bestEl = document.getElementById('stat-best-performer');
            if (bestEl && bestPerformer) {
                const profit = parseFloat(bestPerformer.profit_loss || 0);
                const profitPercent = parseFloat(bestPerformer.profit_loss_percent || 0);
                bestEl.innerHTML = `
                    <div class="performer-token">🟣 ${bestPerformer.crypto_symbol}</div>
                    <div class="performer-value ${profit >= 0 ? 'positive' : 'negative'}">
                        ${profit >= 0 ? '+' : ''}$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
                        <span class="performer-percent">${profit >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%</span>
                    </div>
                `;
            }

            const worstEl = document.getElementById('stat-worst-performer');
            if (worstEl && worstPerformer) {
                const profit = parseFloat(worstPerformer.profit_loss || 0);
                const profitPercent = parseFloat(worstPerformer.profit_loss_percent || 0);
                worstEl.innerHTML = `
                    <div class="performer-token">🟣 ${worstPerformer.crypto_symbol}</div>
                    <div class="performer-value ${profit >= 0 ? 'positive' : 'negative'}">
                        ${profit >= 0 ? '+' : ''}$${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
                        <span class="performer-percent">${profit >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%</span>
                    </div>
                `;
            }
        }

        // Calculate allocation
        const allocation = holdings.map(holding => ({
            token: holding.crypto_symbol,
            percent: (parseFloat(holding.current_value) / summary.total_value * 100) || 0,
            color: this.getColorForToken(holding.crypto_symbol)
        })).sort((a, b) => b.percent - a.percent);

        // Show top 7 and group others
        let allocationFinal = allocation.slice(0, 7);
        if (allocation.length > 7) {
            const othersPercent = allocation.slice(7).reduce((sum, item) => sum + item.percent, 0);
            allocationFinal.push({ token: 'Others', percent: othersPercent, color: '#6B7280' });
        }

        // Update chart center
        const chartCenter = document.getElementById('chart-center-wallet');
        if (chartCenter) {
            chartCenter.textContent = holdings.length;
        }

        // Render allocation
        if (allocationFinal.length > 0) {
            Portfolio.renderAllocationChart('allocation-chart-wallet', allocationFinal);
            Portfolio.renderAllocationLegend('allocation-legend-wallet', allocationFinal);
        }

        // Prepare assets for table
        const assets = holdings.map(holding => ({
            name: holding.crypto_name,
            symbol: holding.crypto_symbol,
            logo: `https://s2.coinmarketcap.com/static/img/coins/64x64/${holding.crypto_id}.png`,
            price: parseFloat(holding.current_price || 0),
            change1h: parseFloat(holding.price_change_1h || 0),
            change24h: parseFloat(holding.price_change_24h || 0),
            change7d: parseFloat(holding.price_change_7d || 0),
            holdings: {
                amount: parseFloat(holding.total_quantity || 0),
                token: holding.crypto_symbol,
                value: parseFloat(holding.current_value || 0)
            },
            avgBuyPrice: parseFloat(holding.avg_buy_price || 0),
            profitLoss: parseFloat(holding.profit_loss || 0),
            profitLossPercent: parseFloat(holding.profit_loss_percent || 0)
        }));

        // Render assets table
        if (assets.length > 0) {
            Portfolio.renderAssetsTable(assets);
        } else {
            const tbody = document.getElementById('assets-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-message">No assets yet. Click "+ Add Transaction" to get started.</td></tr>';
            }
        }

        // Load transactions
        TransactionManager.loadTransactions(portfolioId);

        // Setup export button (transactions section)
        const exportBtn = document.getElementById('export-transactions');
        if (exportBtn) {
            exportBtn.onclick = () => TransactionManager.exportTransactionsCSV(portfolioId);
        }

        // Setup export button (wallet header)
        const exportWalletBtn = document.getElementById('export-wallet-btn');
        if (exportWalletBtn) {
            exportWalletBtn.onclick = () => TransactionManager.exportTransactionsCSV(portfolioId);
        }

        // Show wallet view
        document.getElementById('overview-view').classList.remove('active');
        document.getElementById('wallet-view').classList.add('active');
    },

    /**
     * Show loading state
     */
    showLoadingState() {
        console.log('Loading portfolio...');

        // Simply log - don't modify DOM as it causes issues
        // The actual loading is fast enough not to need a spinner
        // If needed, we can add a subtle loader later without breaking structure
    },

    /**
     * Show empty state when no portfolios
     */
    showEmptyState() {
        const overviewView = document.getElementById('overview-view');
        if (overviewView) {
            overviewView.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <h2>Welcome to Folyo!</h2>
                    <p>Start tracking your crypto portfolio by creating your first wallet.</p>
                    <button class="btn-primary" onclick="PortfolioManager.showCreatePortfolioModal()">+ Create Portfolio</button>
                </div>
            `;
            overviewView.classList.add('active');
        }

        // Clear sidebar
        const walletsListContainer = document.querySelector('.wallets-list');
        if (walletsListContainer) {
            walletsListContainer.innerHTML = '<div class="empty-portfolios">No portfolios yet</div>';
        }
    },

    /**
     * Show error message
     * @param {string} message
     */
    showError(message) {
        AuthManager.showMessage(message, 'error');
    },

    /**
     * Show create portfolio modal
     */
    showCreatePortfolioModal() {
        const modal = document.getElementById('create-portfolio-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('create-portfolio-form').reset();
        document.getElementById('create-portfolio-error').style.display = 'none';

        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // Setup event listeners if not already done
        if (!modal.dataset.listenersAdded) {
            // Form submission
            document.getElementById('create-portfolio-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('portfolio-name').value.trim();
                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    // Show loading state
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 8px;"></span>Creating...';

                    await this.createPortfolio(name, '');

                    // Close modal on success
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');

                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                } catch (error) {
                    // Show error
                    const errorDiv = document.getElementById('create-portfolio-error');
                    errorDiv.textContent = error.message || 'Failed to create portfolio';
                    errorDiv.style.display = 'block';

                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });

            // Cancel button
            document.getElementById('cancel-create-portfolio').addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            });

            // Close button
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            });

            // Backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            });

            modal.dataset.listenersAdded = 'true';
        }
    },

    /**
     * Show edit portfolio modal
     * @param {number} portfolioId
     */
    async showEditPortfolioModal(portfolioId) {
        const modal = document.getElementById('edit-portfolio-modal');
        if (!modal) return;

        // Find portfolio
        const portfolio = this.portfolios.find(p => p.id === portfolioId);
        if (!portfolio) return;

        // Fill form
        document.getElementById('edit-portfolio-id').value = portfolio.id;
        document.getElementById('edit-portfolio-name').value = portfolio.name;
        document.getElementById('edit-portfolio-description').value = portfolio.description || '';
        document.getElementById('edit-portfolio-error').style.display = 'none';

        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');

        // Setup event listeners if not already done
        if (!modal.dataset.listenersAdded) {
            // Form submission
            document.getElementById('edit-portfolio-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = parseInt(document.getElementById('edit-portfolio-id').value);
                const name = document.getElementById('edit-portfolio-name').value.trim();
                const description = document.getElementById('edit-portfolio-description').value.trim();

                try {
                    await APIClient.updatePortfolio(id, { name, description });

                    // Update local data
                    const portfolio = this.portfolios.find(p => p.id === id);
                    if (portfolio) {
                        portfolio.name = name;
                        portfolio.description = description;
                    }

                    // Re-render sidebar
                    this.renderPortfoliosSidebar();

                    AuthManager.showMessage('Portfolio updated successfully!', 'success');
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');

                    // Reload if currently viewing this portfolio
                    if (this.currentPortfolio === id) {
                        await this.loadPortfolio(id);
                    }
                } catch (error) {
                    const errorDiv = document.getElementById('edit-portfolio-error');
                    errorDiv.textContent = error.message || 'Failed to update portfolio';
                    errorDiv.style.display = 'block';
                }
            });

            // Delete button
            document.getElementById('delete-portfolio-btn').addEventListener('click', async () => {
                const id = parseInt(document.getElementById('edit-portfolio-id').value);
                await this.deletePortfolio(id);
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            });

            // Cancel button
            document.getElementById('cancel-edit-portfolio').addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            });

            // Close button
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.classList.remove('modal-open');
            });

            // Backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            });

            modal.dataset.listenersAdded = 'true';
        }
    },

    /**
     * Get icon for portfolio name
     * @param {string} name
     * @returns {string}
     */
    getPortfolioIcon(name) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes('binance')) return '🔶';
        if (nameLower.includes('phantom')) return '👻';
        if (nameLower.includes('kraken')) return '🦑';
        if (nameLower.includes('work')) return '💼';
        if (nameLower.includes('hold')) return '💰';
        if (nameLower.includes('gate')) return '🚪';
        if (nameLower.includes('bybit')) return '📈';
        if (nameLower.includes('future')) return '🔮';
        return '💰'; // Default
    },

    /**
     * Get color for token
     * @param {string} symbol
     * @returns {string}
     */
    getColorForToken(symbol) {
        const colors = {
            'BTC': '#F7931A',
            'ETH': '#627EEA',
            'USDT': '#26A17B',
            'BNB': '#F3BA2F',
            'SOL': '#14F195',
            'USDC': '#2775CA',
            'XRP': '#23292F',
            'DOGE': '#C2A633',
            'ADA': '#0033AD',
            'TRX': '#FF060A',
            'LINK': '#2A5ADA',
            'MATIC': '#8247E5',
            'DOT': '#E6007A',
            'UNI': '#FF007A',
            'AAVE': '#B6509E',
            'PENDLE': '#F59E0B',
            'INJ': '#3B82F6',
            'NEAR': '#14B8A6'
        };
        return colors[symbol] || this.generateColorFromString(symbol);
    },

    /**
     * Generate consistent color from string
     * @param {string} str
     * @returns {string}
     */
    generateColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
