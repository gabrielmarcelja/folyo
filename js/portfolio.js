/**
 * Folyo - Portfolio Page
 * Manages portfolio overview and wallet views with mock data
 */

// Mock Portfolio Data
const PORTFOLIO_DATA = {
    overview: {
        totalValue: 6264.03,
        change24h: -142.80,
        changePercent24h: -2.23,
        allocation: [
            { token: 'AAVE', percent: 30.53, color: '#4F46E5' },
            { token: 'LINK', percent: 14.88, color: '#06B6D4' },
            { token: 'ETH', percent: 11.33, color: '#10B981' },
            { token: 'PENDLE', percent: 9.70, color: '#F59E0B' },
            { token: 'SOL', percent: 8.63, color: '#8B5CF6' },
            { token: 'UNI', percent: 7.60, color: '#EC4899' },
            { token: 'INJ', percent: 6.26, color: '#3B82F6' },
            { token: 'Others', percent: 11.07, color: '#6B7280' }
        ],
        holdings: [
            {
                name: 'Aave',
                symbol: 'AAVE',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7278.png',
                wallets: ['hold wallet', 'work wallet'],
                price: 217.10,
                change1h: 0.95,
                change24h: -1.08,
                change7d: -10.09,
                balance: 8.80,
                value: 1912.63
            },
            {
                name: 'Chainlink',
                symbol: 'LINK',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
                wallets: ['hold wallet', 'work wallet'],
                price: 17.21,
                change1h: 0.38,
                change24h: -2.34,
                change7d: -4.61,
                balance: 54.15,
                value: 932.14
            },
            {
                name: 'Ethereum',
                symbol: 'ETH',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
                wallets: ['hold wallet', 'binance'],
                price: 3808.51,
                change1h: 0.65,
                change24h: -1.73,
                change7d: -4.58,
                balance: 0.1862,
                value: 709.47
            },
            {
                name: 'Pendle',
                symbol: 'PENDLE',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/9481.png',
                wallets: ['hold wallet', 'work wallet'],
                price: 3.0346,
                change1h: 0.72,
                change24h: -3.41,
                change7d: -7.25,
                balance: 200.15,
                value: 607.38
            },
            {
                name: 'Solana',
                symbol: 'SOL',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
                wallets: ['phantom', 'binance'],
                price: 180.33,
                change1h: 0.17,
                change24h: -2.71,
                change7d: -7.11,
                balance: 2.99,
                value: 540.62
            },
            {
                name: 'Uniswap',
                symbol: 'UNI',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png',
                wallets: ['hold wallet', 'binance'],
                price: 6.0530,
                change1h: 0.58,
                change24h: -3.66,
                change7d: -7.94,
                balance: 78.62,
                value: 475.91
            },
            {
                name: 'Injective',
                symbol: 'INJ',
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7226.png',
                wallets: ['hold wallet', 'work wallet'],
                price: 8.1815,
                change1h: 0.17,
                change24h: -3.54,
                change7d: -8.50,
                balance: 47.71,
                value: 390.32
            }
        ]
    },

    wallets: {
        'hold-wallet': {
            name: 'hold wallet',
            value: 3430.08,
            change24h: -76.58,
            changePercent24h: -2.18,
            allTimeProfit: 3430.08,
            costBasis: 0,
            bestPerformer: { token: 'AAVE', symbol: 'AAVE', profit: 1268.37, profitPercent: null },
            worstPerformer: { token: 'POL', symbol: 'POL', profit: 3313.9, profitPercent: null },
            allocation: [
                { token: 'AAVE', percent: 37.01, color: '#4F46E5' },
                { token: 'LINK', percent: 27.18, color: '#06B6D4' },
                { token: 'INJ', percent: 10.66, color: '#3B82F6' },
                { token: 'PENDLE', percent: 10.04, color: '#F59E0B' },
                { token: 'UNI', percent: 8.85, color: '#EC4899' },
                { token: 'NEAR', percent: 5.66, color: '#14B8A6' },
                { token: 'ETH', percent: 0.32, color: '#10B981' },
                { token: 'Others', percent: 0.28, color: '#6B7280' }
            ],
            assets: [
                {
                    name: 'Aave',
                    symbol: 'AAVE',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7278.png',
                    price: 217.10,
                    change1h: 0.95,
                    change24h: -1.08,
                    change7d: -10.09,
                    holdings: { amount: 5.4469, token: 'AAVE', value: 1269.37 },
                    avgBuyPrice: 0,
                    profitLoss: 1269.37,
                    profitLossPercent: null
                },
                {
                    name: 'Chainlink',
                    symbol: 'LINK',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png',
                    price: 17.21,
                    change1h: 0.38,
                    change24h: -2.34,
                    change7d: -4.61,
                    holdings: { amount: 54.15, token: 'LINK', value: 932.14 },
                    avgBuyPrice: 0,
                    profitLoss: 932.14,
                    profitLossPercent: null
                },
                {
                    name: 'Injective',
                    symbol: 'INJ',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7226.png',
                    price: 8.1815,
                    change1h: 0.17,
                    change24h: -3.54,
                    change7d: -8.50,
                    holdings: { amount: 44.71, token: 'INJ', value: 365.76 },
                    avgBuyPrice: 0,
                    profitLoss: 365.76,
                    profitLossPercent: null
                },
                {
                    name: 'Pendle',
                    symbol: 'PENDLE',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/9481.png',
                    price: 3.0346,
                    change1h: 0.72,
                    change24h: -3.41,
                    change7d: -7.25,
                    holdings: { amount: 113.52, token: 'PENDLE', value: 344.50 },
                    avgBuyPrice: 0,
                    profitLoss: 344.50,
                    profitLossPercent: null
                },
                {
                    name: 'Uniswap',
                    symbol: 'UNI',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/7083.png',
                    price: 6.0530,
                    change1h: 0.58,
                    change24h: -3.66,
                    change7d: -7.94,
                    holdings: { amount: 50.24, token: 'UNI', value: 304.00 },
                    avgBuyPrice: 0,
                    profitLoss: 304.00,
                    profitLossPercent: null
                },
                {
                    name: 'NEAR Protocol',
                    symbol: 'NEAR',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/6535.png',
                    price: 3.25,
                    change1h: 0.31,
                    change24h: -2.15,
                    change7d: -6.44,
                    holdings: { amount: 59.85, token: 'NEAR', value: 194.51 },
                    avgBuyPrice: 0,
                    profitLoss: 194.51,
                    profitLossPercent: null
                },
                {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
                    price: 3808.51,
                    change1h: 0.65,
                    change24h: -1.73,
                    change7d: -4.58,
                    holdings: { amount: 0.0029, token: 'ETH', value: 11.04 },
                    avgBuyPrice: 0,
                    profitLoss: 11.04,
                    profitLossPercent: null
                }
            ]
        }
    }
};

const Portfolio = {
    currentView: 'overview',
    currentWallet: null,

    /**
     * Initialize portfolio page
     */
    init() {
        // Initialize managers
        ThemeManager.init();
        CurrencyManager.init();

        // Setup event listeners
        this.setupEventListeners();

        // Render initial view (overview)
        this.showOverview();

        console.log('Portfolio initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Overview button
        document.getElementById('overview-btn').addEventListener('click', () => {
            this.showOverview();
        });

        // Wallet items
        document.querySelectorAll('.wallet-item').forEach(item => {
            item.addEventListener('click', () => {
                const walletId = item.dataset.wallet;
                this.showWallet(walletId);
            });
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
     * Show overview view
     */
    showOverview() {
        this.currentView = 'overview';
        this.currentWallet = null;

        // Toggle views
        document.getElementById('overview-view').classList.add('active');
        document.getElementById('wallet-view').classList.remove('active');

        // Update sidebar
        document.querySelectorAll('.sidebar-item, .wallet-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById('overview-btn').classList.add('active');

        // Render overview
        this.renderOverview();

        // Close sidebar on mobile
        document.getElementById('portfolio-sidebar').classList.remove('open');
    },

    /**
     * Show wallet view
     * @param {string} walletId
     */
    showWallet(walletId) {
        const walletData = PORTFOLIO_DATA.wallets[walletId];
        if (!walletData) {
            console.error('Wallet not found:', walletId);
            return;
        }

        this.currentView = 'wallet';
        this.currentWallet = walletId;

        // Toggle views
        document.getElementById('overview-view').classList.remove('active');
        document.getElementById('wallet-view').classList.add('active');

        // Update sidebar
        document.querySelectorAll('.sidebar-item, .wallet-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-wallet="${walletId}"]`).classList.add('active');

        // Render wallet
        this.renderWallet(walletData);

        // Close sidebar on mobile
        document.getElementById('portfolio-sidebar').classList.remove('open');
    },

    /**
     * Render overview
     */
    renderOverview() {
        const data = PORTFOLIO_DATA.overview;

        // Render allocation chart
        this.renderAllocationChart('allocation-chart-overview', data.allocation);

        // Render allocation legend
        this.renderAllocationLegend('allocation-legend-overview', data.allocation);

        // Render holdings table
        this.renderHoldingsTable(data.holdings);
    },

    /**
     * Render wallet view
     * @param {object} walletData
     */
    renderWallet(walletData) {
        // Update header
        document.getElementById('wallet-name').textContent = walletData.name;
        document.getElementById('wallet-total-value').textContent = '$' + walletData.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const changeEl = document.getElementById('wallet-change');
        const changeClass = walletData.changePercent24h >= 0 ? 'positive' : 'negative';
        const arrow = walletData.changePercent24h >= 0 ? '▲' : '▼';
        changeEl.className = 'wallet-change ' + changeClass;
        changeEl.innerHTML = `${walletData.change24h >= 0 ? '+' : ''}$${Math.abs(walletData.change24h).toFixed(2)} <span class="arrow">${arrow}</span>${Math.abs(walletData.changePercent24h)}% (24h)`;

        // Update stats
        document.getElementById('stat-profit').textContent = '+$' + walletData.allTimeProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('stat-cost-basis').textContent = '$' + walletData.costBasis;

        document.getElementById('stat-best-performer').innerHTML = `
            <div class="performer-token">🟣 ${walletData.bestPerformer.symbol}</div>
            <div class="performer-value positive">+$${walletData.bestPerformer.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><span class="performer-percent">~%</span></div>
        `;

        document.getElementById('stat-worst-performer').innerHTML = `
            <div class="performer-token">🟣 ${walletData.worstPerformer.symbol}</div>
            <div class="performer-value positive">+$${walletData.worstPerformer.profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><span class="performer-percent">~%</span></div>
        `;

        // Render allocation chart
        this.renderAllocationChart('allocation-chart-wallet', walletData.allocation);

        // Render allocation legend
        this.renderAllocationLegend('allocation-legend-wallet', walletData.allocation);

        // Render assets table
        this.renderAssetsTable(walletData.assets);
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
                    <span class="legend-percent">${item.percent}%</span>
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
                    <td>$${asset.avgBuyPrice}</td>
                    <td class="${profitLossClass}">
                        ${profitLossSign}$${Math.abs(asset.profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
                        <span style="font-size: 12px; color: var(--text-secondary);">~%</span>
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
