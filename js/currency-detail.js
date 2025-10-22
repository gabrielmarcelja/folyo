/**
 * Folyo - Currency Detail Page
 * Handles cryptocurrency detail page logic
 */

const CurrencyDetail = {
    slug: null,
    cryptoId: null,
    cryptoInfo: null,
    cryptoQuotes: null,
    ohlcvData: null,
    currentPeriod: '7d',
    refreshIntervalId: null,

    /**
     * Initialize the page
     */
    async init() {
        // Get slug from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.slug = urlParams.get('slug');

        if (!this.slug) {
            this.showError('No cryptocurrency specified');
            return;
        }

        // Initialize managers
        ThemeManager.init();
        CurrencyManager.init();

        // Initialize chart BEFORE loading data
        PriceChart.init('price-chart');

        // Setup event listeners
        this.setupEventListeners();

        // Load data
        await this.loadData();

        // Setup auto-refresh for quotes
        this.setupAutoRefresh();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Chart period buttons
        document.querySelectorAll('.chart-period-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (btn.classList.contains('disabled')) return;

                const period = e.target.dataset.period;
                await this.changePeriod(period);
            });
        });

        // Currency change
        document.getElementById('currency-select').addEventListener('change', async () => {
            await this.refreshQuotes();
            await this.loadChartData(this.currentPeriod);
        });
    },

    /**
     * Load all data
     */
    async loadData() {
        try {
            this.showLoading();

            // Fetch crypto info and quotes in parallel
            const currency = CurrencyManager.getCurrency();
            const [infoResponse, quotesResponse] = await Promise.all([
                API.getCryptoInfo(this.slug, 'slug'),
                API.getCryptoQuotes(this.slug, 'slug', currency)
            ]);

            // Extract data (API returns object with slug as key for v2 endpoints)
            this.cryptoInfo = Object.values(infoResponse.data)[0];
            this.cryptoQuotes = Object.values(quotesResponse.data)[0];

            if (!this.cryptoInfo || !this.cryptoQuotes) {
                throw new Error('Cryptocurrency not found');
            }

            this.cryptoId = this.cryptoInfo.id;

            // Render page
            this.renderPage();

            // Verify cryptoId is set
            if (!this.cryptoId) {
                console.error('No crypto ID found after loading data');
                throw new Error('Invalid cryptocurrency data');
            }

            // Load chart data
            await this.loadChartData(this.currentPeriod);

            this.hideLoading();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load cryptocurrency data. Please try again.');
        }
    },

    /**
     * Load chart data for specific period
     * @param {string} period
     */
    async loadChartData(period) {
        try {
            PriceChart.showLoading();

            let count;
            let interval = 'daily';
            let timePeriod = 'daily';

            switch (period) {
                case '24h':
                    count = 26; // 24 hours + 1 for current incomplete period + 1 per API docs
                    interval = 'hourly';
                    timePeriod = 'hourly';
                    break;
                case '7d':
                    count = 85; // 7 days * 12 points per day (every 2 hours) + 1
                    interval = '2h'; // Sample every 2 hours for more detail
                    timePeriod = 'hourly';
                    break;
                case '30d':
                    count = 121; // 30 days * 4 points per day (every 6 hours) + 1
                    interval = '6h'; // Sample every 6 hours for good balance
                    timePeriod = 'hourly';
                    break;
                default:
                    count = 8;
                    interval = 'daily';
                    timePeriod = 'daily';
            }

            const currency = CurrencyManager.getCurrency();
            const ohlcvResponse = await API.getOHLCVHistorical(this.cryptoId, count, currency, interval, timePeriod);

            // Debug log for 24h period
            if (period === '24h') {
                console.log('=== 24h Period Debug ===');
                console.log('Request Parameters:', { cryptoId: this.cryptoId, count, currency, interval });
                console.log('Full API Response:', ohlcvResponse);
                console.log('Response Status:', ohlcvResponse.status);
                if (ohlcvResponse.status && ohlcvResponse.status.error_message) {
                    console.error('API Error Message:', ohlcvResponse.status.error_message);
                }
                if (ohlcvResponse.status && ohlcvResponse.status.notice) {
                    console.warn('API Notice:', ohlcvResponse.status.notice);
                }
                console.log('Response Data:', ohlcvResponse.data);
            }

            // Extract OHLCV data
            // The v2 API can return data in different formats:
            // 1. Single crypto: data is the crypto object directly
            // 2. Multiple cryptos: data is a map indexed by ID
            let cryptoData;

            if (period === '24h') {
                console.log('24h - Checking data structure...');
                console.log('24h - data.quotes exists?', !!(ohlcvResponse.data && ohlcvResponse.data.quotes));
                console.log('24h - data[cryptoId] exists?', !!(ohlcvResponse.data && ohlcvResponse.data[this.cryptoId]));
            }

            // Check if data has 'quotes' property directly (single crypto format)
            if (ohlcvResponse.data && ohlcvResponse.data.quotes) {
                cryptoData = ohlcvResponse.data;
                if (period === '24h') console.log('24h - Using direct data format');
            }
            // Otherwise try to access by ID (multiple cryptos format)
            else if (ohlcvResponse.data && ohlcvResponse.data[this.cryptoId]) {
                cryptoData = ohlcvResponse.data[this.cryptoId];
                if (period === '24h') console.log('24h - Using indexed data format');
            }
            // Last resort: check if data is a map and get first entry
            else if (ohlcvResponse.data && typeof ohlcvResponse.data === 'object') {
                const dataKeys = Object.keys(ohlcvResponse.data).filter(k => k !== 'id' && k !== 'name' && k !== 'symbol');
                if (period === '24h') console.log('24h - Trying first key:', dataKeys[0], 'from', dataKeys);
                if (dataKeys.length > 0) {
                    cryptoData = ohlcvResponse.data[dataKeys[0]];
                }
            }

            if (!cryptoData || !cryptoData.quotes) {
                console.error('Invalid OHLCV data structure from API');
                if (period === '24h') {
                    console.error('24h - cryptoData:', cryptoData);
                    console.error('24h - Has quotes?', cryptoData && cryptoData.quotes);
                }
                throw new Error('No chart data available');
            }

            if (period === '24h') {
                console.log('24h - cryptoData extracted successfully:', cryptoData);
                console.log('24h - Number of quotes:', cryptoData.quotes.length);

                // Check if we got insufficient data for 24h (hourly not supported)
                if (cryptoData.quotes.length < 10) {
                    console.warn('24h - Insufficient hourly data, falling back to daily data');
                    // Retry with daily interval (last 2 days)
                    const fallbackResponse = await API.getOHLCVHistorical(this.cryptoId, 3, currency, 'daily', 'daily');

                    if (fallbackResponse.data && fallbackResponse.data.quotes) {
                        cryptoData = fallbackResponse.data;
                        console.log('24h - Fallback to daily data successful:', cryptoData.quotes.length, 'points');
                    } else if (fallbackResponse.data && fallbackResponse.data[this.cryptoId]) {
                        cryptoData = fallbackResponse.data[this.cryptoId];
                        console.log('24h - Fallback to daily data successful:', cryptoData.quotes.length, 'points');
                    }
                }
            }

            this.ohlcvData = cryptoData.quotes;

            // Verify we have enough data points
            if (this.ohlcvData.length === 0) {
                throw new Error('No chart data points available');
            }

            // Render chart
            const chartData = this.ohlcvData.map(quote => {
                const quoteData = quote.quote[currency] || quote.quote.USD;
                return {
                    time_close: quote.time_close,
                    open: quoteData.open,
                    high: quoteData.high,
                    low: quoteData.low,
                    close: quoteData.close,
                    volume: quoteData.volume
                };
            });

            PriceChart.setData(chartData, currency);

        } catch (error) {
            console.error('Error loading chart data for period:', period, error);

            // Provide specific error messages based on the error type
            let errorMessage = 'Failed to load chart data';

            if (error.message && (error.message.includes('plan') || error.message.includes('tier'))) {
                errorMessage = 'Data requires plan upgrade';
            } else if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
                errorMessage = 'Historical data not available';
            } else if (period === '24h') {
                errorMessage = 'Recent price data not available';
            }

            PriceChart.showError(errorMessage);
        }
    },

    /**
     * Change chart period
     * @param {string} period
     */
    async changePeriod(period) {
        this.currentPeriod = period;

        // Update active button
        document.querySelectorAll('.chart-period-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            }
        });

        await this.loadChartData(period);
    },

    /**
     * Render page with data
     */
    renderPage() {
        const currency = CurrencyManager.getCurrency();
        const quote = this.cryptoQuotes.quote[currency] || this.cryptoQuotes.quote.USD;

        // Update page title
        document.getElementById('page-title').textContent = `${this.cryptoInfo.name} (${this.cryptoInfo.symbol}) Price, Chart & Market Cap | Folyo`;

        // Update breadcrumb
        document.getElementById('breadcrumb-name').textContent = this.cryptoInfo.name;

        // Crypto Header
        document.getElementById('crypto-logo').src = this.cryptoInfo.logo;
        document.getElementById('crypto-logo').alt = this.cryptoInfo.name;
        document.getElementById('crypto-name').textContent = this.cryptoInfo.name;
        document.getElementById('crypto-symbol').textContent = this.cryptoInfo.symbol;
        document.getElementById('crypto-rank').textContent = `Rank #${this.cryptoQuotes.cmc_rank}`;

        // Price
        document.getElementById('crypto-price').textContent = Utils.formatPrice(quote.price, currency);

        // Currency symbol for stats
        const currencySymbol = CONFIG.CURRENCY_SYMBOLS[currency] || '$';

        // Price changes
        this.renderPriceChange('change-1h', quote.percent_change_1h, '1h');
        this.renderPriceChange('change-24h', quote.percent_change_24h, '24h');
        this.renderPriceChange('change-7d', quote.percent_change_7d, '7d');

        // Stats
        document.getElementById('stat-market-cap').textContent = currencySymbol + Utils.formatFullNumber(quote.market_cap);
        document.getElementById('stat-market-cap-rank').textContent = `Rank #${this.cryptoQuotes.cmc_rank}`;
        document.getElementById('stat-volume').textContent = currencySymbol + Utils.formatFullNumber(quote.volume_24h);
        document.getElementById('stat-circulating').textContent = Utils.formatSupply(this.cryptoQuotes.circulating_supply, this.cryptoInfo.symbol);
        document.getElementById('stat-total').textContent = this.cryptoQuotes.total_supply ? Utils.formatSupply(this.cryptoQuotes.total_supply, this.cryptoInfo.symbol) : '-';
        document.getElementById('stat-max').textContent = this.cryptoQuotes.max_supply ? Utils.formatSupply(this.cryptoQuotes.max_supply, this.cryptoInfo.symbol) : '∞';

        const fdv = this.cryptoQuotes.max_supply ? quote.price * this.cryptoQuotes.max_supply : quote.price * this.cryptoQuotes.total_supply;
        document.getElementById('stat-fdv').textContent = fdv ? currencySymbol + Utils.formatFullNumber(fdv) : '-';

        // Overview Tab
        this.renderOverview();

        // About Tab
        this.renderAbout();

        // Links Tab
        this.renderLinks();
    },

    /**
     * Render price change indicator
     * @param {string} elementId
     * @param {number} value
     * @param {string} label
     */
    renderPriceChange(elementId, value, label) {
        const element = document.getElementById(elementId);
        if (value === null || value === undefined) {
            element.textContent = '-';
            element.className = 'price-change';
            return;
        }

        const className = value >= 0 ? 'price-change positive' : 'price-change negative';
        const arrow = value >= 0 ? '▲' : '▼';
        element.className = className;
        element.textContent = `${arrow} ${Math.abs(value).toFixed(2)}% (${label})`;
    },

    /**
     * Render overview tab
     */
    renderOverview() {
        // Website
        if (this.cryptoInfo.urls.website && this.cryptoInfo.urls.website.length > 0) {
            const links = this.cryptoInfo.urls.website.map(url =>
                `<a href="${url}" target="_blank" rel="noopener">${new URL(url).hostname}</a>`
            ).join(', ');
            document.getElementById('overview-website').innerHTML = links;
        } else {
            document.getElementById('overview-website').textContent = '-';
        }

        // Explorers
        if (this.cryptoInfo.urls.explorer && this.cryptoInfo.urls.explorer.length > 0) {
            const links = this.cryptoInfo.urls.explorer.slice(0, 3).map(url =>
                `<a href="${url}" target="_blank" rel="noopener">${new URL(url).hostname}</a>`
            ).join(', ');
            document.getElementById('overview-explorers').innerHTML = links;
        } else {
            document.getElementById('overview-explorers').textContent = '-';
        }

        // Community
        const communityLinks = [];
        if (this.cryptoInfo.urls.twitter && this.cryptoInfo.urls.twitter.length > 0) {
            communityLinks.push(`<a href="${this.cryptoInfo.urls.twitter[0]}" target="_blank" rel="noopener">Twitter</a>`);
        }
        if (this.cryptoInfo.urls.reddit && this.cryptoInfo.urls.reddit.length > 0) {
            communityLinks.push(`<a href="${this.cryptoInfo.urls.reddit[0]}" target="_blank" rel="noopener">Reddit</a>`);
        }
        document.getElementById('overview-community').innerHTML = communityLinks.length > 0 ? communityLinks.join(', ') : '-';

        // Tags
        if (this.cryptoInfo.tags && this.cryptoInfo.tags.length > 0) {
            const tags = this.cryptoInfo.tags.slice(0, 5).join(', ');
            document.getElementById('overview-tags').textContent = tags;
        } else {
            document.getElementById('overview-tags').textContent = '-';
        }

        // Platform
        if (this.cryptoInfo.platform) {
            document.getElementById('overview-platform').textContent = this.cryptoInfo.platform.name;
        } else {
            document.getElementById('overview-platform').textContent = '-';
        }

        // Date Added
        if (this.cryptoInfo.date_added) {
            const date = new Date(this.cryptoInfo.date_added).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('overview-date').textContent = date;
        } else {
            document.getElementById('overview-date').textContent = '-';
        }
    },

    /**
     * Render about tab
     */
    renderAbout() {
        document.getElementById('about-title').textContent = `About ${this.cryptoInfo.name}`;

        if (this.cryptoInfo.description) {
            document.getElementById('about-description').innerHTML = this.cryptoInfo.description;
        } else {
            document.getElementById('about-description').textContent = 'No description available.';
        }
    },

    /**
     * Render links tab
     */
    renderLinks() {
        // Website
        this.renderLinkSection('links-website', this.cryptoInfo.urls.website);

        // Explorers
        this.renderLinkSection('links-explorers', this.cryptoInfo.urls.explorer);

        // Social Media
        const socialLinks = [
            ...(this.cryptoInfo.urls.twitter || []),
            ...(this.cryptoInfo.urls.facebook || [])
        ];
        this.renderLinkSection('links-social', socialLinks);

        // Source Code
        this.renderLinkSection('links-source', this.cryptoInfo.urls.source_code);

        // Community
        const communityLinks = [
            ...(this.cryptoInfo.urls.reddit || []),
            ...(this.cryptoInfo.urls.message_board || [])
        ];
        this.renderLinkSection('links-community', communityLinks);

        // Chat
        this.renderLinkSection('links-chat', this.cryptoInfo.urls.chat);
    },

    /**
     * Render link section
     * @param {string} elementId
     * @param {array} urls
     */
    renderLinkSection(elementId, urls) {
        const element = document.getElementById(elementId);
        if (urls && urls.length > 0) {
            const links = urls.map(url =>
                `<a href="${url}" target="_blank" rel="noopener" class="link-item">${url}</a>`
            ).join('');
            element.innerHTML = links;
        } else {
            element.innerHTML = '<span class="no-links">No links available</span>';
        }
    },

    /**
     * Switch tab
     * @param {string} tabName
     */
    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Update panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },

    /**
     * Refresh quotes data
     */
    async refreshQuotes() {
        try {
            const currency = CurrencyManager.getCurrency();
            const quotesResponse = await API.getCryptoQuotes(this.slug, 'slug', currency);
            this.cryptoQuotes = Object.values(quotesResponse.data)[0];

            // Re-render price section
            this.renderPage();

            // Update last update time
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('Error refreshing quotes:', error);
        }
    },

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        // Refresh quotes every 60 seconds
        this.refreshIntervalId = setInterval(() => {
            this.refreshQuotes();
        }, 60000);

        console.log('⏱️ Auto-refresh enabled (every 60 seconds)');
    },

    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        const now = new Date();
        const timeText = Utils.getTimeAgo(now);
        document.getElementById('last-update').textContent = timeText;
    },

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('currency-detail').style.display = 'none';
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('currency-detail').style.display = 'block';
    },

    /**
     * Show error
     * @param {string} message
     */
    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('currency-detail').style.display = 'none';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CurrencyDetail.init();
});

// Stop auto-refresh when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (CurrencyDetail.refreshIntervalId) {
            clearInterval(CurrencyDetail.refreshIntervalId);
        }
    } else {
        CurrencyDetail.setupAutoRefresh();
        CurrencyDetail.refreshQuotes();
    }
});
