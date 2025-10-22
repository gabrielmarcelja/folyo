/**
 * Folyo - UI Manager
 */

const UI = {
    data: [],
    filteredData: [],
    sparklineData: {}, // Store OHLCV historical data for sparklines
    currentPage: 1,
    sortField: null,
    sortDirection: 'asc',
    searchTerm: '',

    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', Utils.debounce(async (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterData();
            this.currentPage = 1;
            this.renderTable();
            this.renderPagination();
            await this.fetchSparklineData();
        }, 300));

        // Table sorting
        document.querySelectorAll('.crypto-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                this.sortTable(field);
            });
        });

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => this.prevPage());
        document.getElementById('next-page').addEventListener('click', () => this.nextPage());

        // Window resize (for mobile/desktop switch)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.renderTable();
            }, 250);
        });
    },

    /**
     * Render global stats
     * @param {object} globalMetrics
     * @param {object} fearGreed
     */
    renderGlobalStats(globalMetrics, fearGreed) {
        const currency = CurrencyManager.getCurrency();
        const quote = globalMetrics.quote?.[currency] || globalMetrics.quote?.USD || {};

        // Total Cryptos
        document.getElementById('total-cryptos').textContent =
            globalMetrics.active_cryptocurrencies?.toLocaleString() || '-';

        // Market Cap
        document.getElementById('total-market-cap').textContent =
            Utils.formatMarketCap(quote.total_market_cap, currency);

        // 24h Volume
        document.getElementById('total-volume').textContent =
            Utils.formatMarketCap(quote.total_volume_24h, currency);

        // Fear & Greed
        const fearGreedEl = document.getElementById('fear-greed');
        if (fearGreed && fearGreed.value !== null && fearGreed.value !== undefined) {
            // Use classification from API or fallback to our own logic
            const classification = fearGreed.value_classification ||
                                 Utils.getFearGreedLevel(fearGreed.value)?.label ||
                                 'Unknown';

            // Get color based on value
            const level = Utils.getFearGreedLevel(fearGreed.value);

            fearGreedEl.textContent = `${fearGreed.value} (${classification})`;
            fearGreedEl.style.backgroundColor = level?.color || '#808A9D';
            fearGreedEl.style.color = '#FFFFFF';
        } else {
            fearGreedEl.textContent = '-';
            fearGreedEl.style.backgroundColor = '';
        }
    },

    /**
     * Set data and render
     * @param {array} cryptoData
     */
    async setData(cryptoData) {
        this.data = cryptoData;
        this.filterData();
        this.renderTable();
        this.renderPagination();

        // Fetch sparkline data for current page
        await this.fetchSparklineData();
    },

    /**
     * Fetch sparkline data for visible cryptocurrencies
     */
    async fetchSparklineData() {
        try {
            // Get IDs of cryptocurrencies on current page
            const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
            const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
            const pageData = this.filteredData.slice(startIndex, endIndex);

            if (pageData.length === 0) return;

            const ids = pageData.map(crypto => crypto.id).join(',');
            const currency = CurrencyManager.getCurrency();

            // Fetch OHLCV historical data
            const response = await API.getOHLCVHistorical(ids, 8, currency);

            if (response && response.data) {
                // Store sparkline data indexed by crypto ID
                Object.keys(response.data).forEach(id => {
                    const cryptoData = response.data[id];
                    if (cryptoData && cryptoData.quotes && cryptoData.quotes.length > 0) {
                        // Extract closing prices for sparkline
                        const prices = cryptoData.quotes.map(quote => {
                            const quoteData = quote.quote[currency] || quote.quote.USD;
                            return quoteData ? quoteData.close : null;
                        }).filter(price => price !== null && price !== undefined);

                        // Only store if we have valid data
                        if (prices.length > 0) {
                            this.sparklineData[id] = prices;
                        }
                    }
                });

                // Re-render sparklines with real data only
                this.renderAllSparklines(pageData);
            }
        } catch (error) {
            console.error('Error fetching sparkline data:', error);
            // Don't show sparklines if API fails - leave canvases empty
        }
    },

    /**
     * Filter data based on search
     */
    filterData() {
        if (!this.searchTerm) {
            this.filteredData = this.data;
            return;
        }

        this.filteredData = this.data.filter(crypto =>
            crypto.name.toLowerCase().includes(this.searchTerm) ||
            crypto.symbol.toLowerCase().includes(this.searchTerm)
        );
    },

    /**
     * Sort table by field
     * @param {string} field
     */
    async sortTable(field) {
        if (this.sortField === field) {
            // Toggle direction
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }

        this.filteredData = Utils.sortBy(this.filteredData, field, this.sortDirection);
        this.renderTable();
        await this.fetchSparklineData();
    },

    /**
     * Render cryptocurrency table
     */
    renderTable() {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            this.renderMobileCards();
        } else {
            this.renderDesktopTable();
        }
    },

    /**
     * Render desktop table
     */
    renderDesktopTable() {
        const tbody = document.getElementById('crypto-table-body');
        const currency = CurrencyManager.getCurrency();

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        // Show table, hide cards
        document.querySelector('.crypto-table').style.display = 'table';
        const cardsContainer = document.getElementById('crypto-cards');
        if (cardsContainer) cardsContainer.style.display = 'none';

        // Clear table
        tbody.innerHTML = '';

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 48px;">
                        No cryptocurrencies found.
                    </td>
                </tr>
            `;
            return;
        }

        // Render rows
        pageData.forEach(crypto => {
            const quote = crypto.quote?.[currency] || crypto.quote?.USD || {};

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="crypto-rank">${crypto.cmc_rank || '-'}</td>
                <td>
                    <div class="crypto-name">
                        <img
                            src="${Utils.getLogoUrl(crypto.id)}"
                            alt="${crypto.name}"
                            class="crypto-logo"
                            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23ccc%22/%3E%3C/svg%3E'"
                        >
                        <div class="crypto-info">
                            <div class="crypto-name-text">${crypto.name}</div>
                            <div class="crypto-symbol">${crypto.symbol}</div>
                        </div>
                    </div>
                </td>
                <td class="crypto-price">${Utils.formatPrice(quote.price, currency)}</td>
                <td>${this.renderPercentChange(quote.percent_change_1h)}</td>
                <td>${this.renderPercentChange(quote.percent_change_24h)}</td>
                <td>${this.renderPercentChange(quote.percent_change_7d)}</td>
                <td class="crypto-marketcap">${Utils.formatMarketCap(quote.market_cap, currency)}</td>
                <td class="crypto-volume">${Utils.formatMarketCap(quote.volume_24h, currency)}</td>
                <td class="crypto-supply">${Utils.formatSupply(crypto.circulating_supply, crypto.symbol)}</td>
                <td>
                    <div class="sparkline-container">
                        <canvas class="sparkline" data-crypto-id="${crypto.id}"></canvas>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Sparklines will be rendered when real data is fetched via fetchSparklineData()
    },

    /**
     * Render mobile cards
     */
    renderMobileCards() {
        const currency = CurrencyManager.getCurrency();

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        // Hide table, show cards
        document.querySelector('.crypto-table').style.display = 'none';

        // Create or get cards container
        let cardsContainer = document.getElementById('crypto-cards');
        if (!cardsContainer) {
            cardsContainer = document.createElement('div');
            cardsContainer.id = 'crypto-cards';
            cardsContainer.className = 'crypto-cards';
            document.querySelector('.table-container').appendChild(cardsContainer);
        }
        cardsContainer.style.display = 'flex';
        cardsContainer.innerHTML = '';

        if (pageData.length === 0) {
            cardsContainer.innerHTML = '<div style="text-align: center; padding: 48px; width: 100%;">No cryptocurrencies found.</div>';
            return;
        }

        // Render cards
        pageData.forEach(crypto => {
            const quote = crypto.quote?.[currency] || crypto.quote?.USD || {};

            const card = document.createElement('div');
            card.className = 'crypto-card';
            card.innerHTML = `
                <div class="crypto-card-header">
                    <div class="crypto-card-rank">#${crypto.cmc_rank || '-'}</div>
                    <img
                        src="${Utils.getLogoUrl(crypto.id)}"
                        alt="${crypto.name}"
                        class="crypto-card-logo"
                        onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23ccc%22/%3E%3C/svg%3E'"
                    >
                    <div class="crypto-card-name">
                        <div class="crypto-card-name-text">${crypto.name}</div>
                        <div class="crypto-card-symbol">${crypto.symbol}</div>
                    </div>
                </div>
                <div class="crypto-card-body">
                    <div class="crypto-card-item">
                        <div class="crypto-card-label">Price</div>
                        <div class="crypto-card-value">${Utils.formatPrice(quote.price, currency)}</div>
                    </div>
                    <div class="crypto-card-item">
                        <div class="crypto-card-label">24h Change</div>
                        <div class="crypto-card-value">${this.renderPercentChange(quote.percent_change_24h)}</div>
                    </div>
                    <div class="crypto-card-item">
                        <div class="crypto-card-label">Market Cap</div>
                        <div class="crypto-card-value">${Utils.formatMarketCap(quote.market_cap, currency)}</div>
                    </div>
                    <div class="crypto-card-item">
                        <div class="crypto-card-label">Volume 24h</div>
                        <div class="crypto-card-value">${Utils.formatMarketCap(quote.volume_24h, currency)}</div>
                    </div>
                </div>
            `;

            cardsContainer.appendChild(card);
        });
    },

    /**
     * Render percent change cell
     * @param {number} percent
     * @returns {string}
     */
    renderPercentChange(percent) {
        if (percent === null || percent === undefined) return '-';

        const className = percent >= 0 ? 'positive' : 'negative';
        return `<span class="percent-change ${className}">${Utils.formatPercent(percent)}</span>`;
    },

    /**
     * Render all sparklines
     * @param {array} cryptos
     */
    renderAllSparklines(cryptos) {
        cryptos.forEach(crypto => {
            const canvas = document.querySelector(`canvas[data-crypto-id="${crypto.id}"]`);
            if (canvas) {
                // Only use real data from API, don't show anything if not available
                const data = this.sparklineData[crypto.id];
                if (data && data.length > 0) {
                    this.drawSparkline(canvas, data);
                } else {
                    // Clear canvas if no data available
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        });
    },

    /**
     * Draw sparkline on canvas
     * @param {HTMLCanvasElement} canvas
     * @param {array} data
     */
    drawSparkline(canvas, data) {
        if (!data || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2; // Retina
        const height = canvas.height = canvas.offsetHeight * 2;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Scale data to canvas with padding
        const padding = height * 0.1; // 10% padding top and bottom
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const points = data.map((value, index) => ({
            x: (index / (data.length - 1)) * width,
            y: padding + ((max - value) / range * (height - 2 * padding))
        }));

        // Determine color (green if trending up, red if trending down)
        const color = data[data.length - 1] >= data[0] ? '#16C784' : '#EA3943';

        // Draw smooth line using quadratic curves
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        // Draw smooth curve through points
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];

            // Calculate control point for smooth curve
            const controlX = (current.x + next.x) / 2;
            const controlY = (current.y + next.y) / 2;

            ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
        }

        // Draw to last point
        const lastPoint = points[points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
        ctx.stroke();
    },

    /**
     * Render pagination
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filteredData.length / CONFIG.ITEMS_PER_PAGE);

        // Update info
        const start = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE + 1;
        const end = Math.min(this.currentPage * CONFIG.ITEMS_PER_PAGE, this.filteredData.length);
        document.getElementById('showing-start').textContent = start;
        document.getElementById('showing-end').textContent = end;
        document.getElementById('total-count').textContent = this.filteredData.length;

        // Update buttons
        document.getElementById('prev-page').disabled = this.currentPage === 1;
        document.getElementById('next-page').disabled = this.currentPage === totalPages || totalPages === 0;

        // Render page numbers
        this.renderPageNumbers(totalPages);
    },

    /**
     * Render page numbers
     * @param {number} totalPages
     */
    renderPageNumbers(totalPages) {
        const container = document.getElementById('page-numbers');
        container.innerHTML = '';

        if (totalPages <= 1) return;

        const maxButtons = 7;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // First page
        if (startPage > 1) {
            container.appendChild(this.createPageButton(1));
            if (startPage > 2) {
                container.appendChild(this.createEllipsis());
            }
        }

        // Page buttons
        for (let i = startPage; i <= endPage; i++) {
            container.appendChild(this.createPageButton(i));
        }

        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                container.appendChild(this.createEllipsis());
            }
            container.appendChild(this.createPageButton(totalPages));
        }
    },

    /**
     * Create page button
     * @param {number} page
     * @returns {HTMLElement}
     */
    createPageButton(page) {
        const button = document.createElement('div');
        button.className = 'page-number' + (page === this.currentPage ? ' active' : '');
        button.textContent = page;
        button.addEventListener('click', () => this.goToPage(page));
        return button;
    },

    /**
     * Create ellipsis
     * @returns {HTMLElement}
     */
    createEllipsis() {
        const span = document.createElement('span');
        span.textContent = '...';
        span.style.padding = '0 8px';
        return span;
    },

    /**
     * Go to page
     * @param {number} page
     */
    async goToPage(page) {
        this.currentPage = page;
        this.renderTable();
        this.renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Fetch sparkline data for new page
        await this.fetchSparklineData();
    },

    /**
     * Next page
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / CONFIG.ITEMS_PER_PAGE);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    },

    /**
     * Previous page
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        document.getElementById('error').style.display = 'none';
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.querySelector('.table-container').style.display = 'block';
    },

    /**
     * Show error
     * @param {string} message
     */
    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error').style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
    },

    /**
     * Update last update time
     */
    updateLastUpdateTime() {
        const now = new Date();
        const timeText = Utils.getTimeAgo(now);
        document.getElementById('last-update').textContent = `Updated ${timeText}`;
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_UPDATE, now.toISOString());
    }
};
