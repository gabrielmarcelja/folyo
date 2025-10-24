/**
 * Folyo - API Client
 * Centralized API communication for frontend
 */

const APIClient = {
    baseURL: '/api',
    csrfToken: null,

    /**
     * Set CSRF token
     * @param {string} token CSRF token
     */
    setCsrfToken(token) {
        this.csrfToken = token;
    },

    /**
     * Make HTTP request
     * @param {string} endpoint API endpoint
     * @param {string} method HTTP method
     * @param {object} data Request body
     * @param {object} options Additional options (retry, etc.)
     * @returns {Promise<object>} Response data
     */
    async request(endpoint, method = 'GET', data = null, options = {}) {
        const requestFn = async () => {
            const fetchOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies for session
            };

            // Add CSRF token for state-changing requests
            if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
                fetchOptions.headers['X-CSRF-Token'] = this.csrfToken;
            }

            if (data && method !== 'GET') {
                fetchOptions.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, fetchOptions);

            // Try to parse JSON response
            let result;
            try {
                result = await response.json();
            } catch (e) {
                // If JSON parsing fails, throw a generic error
                throw {
                    status: response.status,
                    message: `Request failed with status ${response.status}`,
                    error: 'Invalid JSON response'
                };
            }

            if (!response.ok) {
                // Create error object with status code
                const error = new Error(result.error || 'Request failed');
                error.status = response.status;
                error.response = result;
                throw error;
            }

            return result.data;
        };

        try {
            // Use retry logic for GET requests or if explicitly enabled
            if (options.retry !== false && (method === 'GET' || options.retry === true)) {
                return await ErrorHandler.withRetry(requestFn, options.maxRetries || 3, options.retryDelay || 1000);
            } else {
                return await requestFn();
            }
        } catch (error) {
            Debug.error('API Error:', error);

            // Enhance error with additional context
            error.endpoint = endpoint;
            error.method = method;

            throw error;
        }
    },

    // ========================================
    // AUTHENTICATION
    // ========================================

    /**
     * Register new user
     * @param {string} email User email
     * @param {string} password User password
     */
    async register(email, password) {
        return this.request('/auth.php?action=register', 'POST', { email, password });
    },

    /**
     * Login user
     * @param {string} email User email
     * @param {string} password User password
     */
    async login(email, password) {
        return this.request('/auth.php?action=login', 'POST', { email, password });
    },

    /**
     * Logout user
     */
    async logout() {
        return this.request('/auth.php?action=logout', 'POST');
    },

    /**
     * Get authentication status
     */
    async getAuthStatus() {
        return this.request('/auth.php?action=status', 'GET');
    },

    // ========================================
    // PORTFOLIOS
    // ========================================

    /**
     * Get all portfolios for current user
     */
    async getPortfolios() {
        return this.request('/portfolios.php', 'GET');
    },

    /**
     * Get single portfolio with holdings
     * @param {number} portfolioId Portfolio ID
     */
    async getPortfolio(portfolioId) {
        return this.request(`/portfolios.php?id=${portfolioId}`, 'GET');
    },

    /**
     * Create new portfolio
     * @param {string} name Portfolio name
     * @param {string} description Portfolio description (optional)
     */
    async createPortfolio(name, description = '') {
        return this.request('/portfolios.php', 'POST', { name, description });
    },

    /**
     * Update portfolio
     * @param {number} portfolioId Portfolio ID
     * @param {object} data Update data
     */
    async updatePortfolio(portfolioId, data) {
        return this.request(`/portfolios.php?id=${portfolioId}`, 'PUT', data);
    },

    /**
     * Delete portfolio
     * @param {number} portfolioId Portfolio ID
     */
    async deletePortfolio(portfolioId) {
        return this.request(`/portfolios.php?id=${portfolioId}`, 'DELETE');
    },

    // ========================================
    // TRANSACTIONS
    // ========================================

    /**
     * Get transactions for portfolio
     * @param {number} portfolioId Portfolio ID
     */
    async getTransactions(portfolioId) {
        return this.request(`/transactions.php?portfolio_id=${portfolioId}`, 'GET');
    },

    /**
     * Get single transaction
     * @param {number} transactionId Transaction ID
     */
    async getTransaction(transactionId) {
        return this.request(`/transactions.php?id=${transactionId}`, 'GET');
    },

    /**
     * Create transaction
     * @param {object} transactionData Transaction data
     */
    async createTransaction(transactionData) {
        return this.request('/transactions.php', 'POST', transactionData);
    },

    /**
     * Update transaction
     * @param {number} transactionId Transaction ID
     * @param {object} data Update data
     */
    async updateTransaction(transactionId, data) {
        return this.request(`/transactions.php?id=${transactionId}`, 'PUT', data);
    },

    /**
     * Delete transaction
     * @param {number} transactionId Transaction ID
     */
    async deleteTransaction(transactionId) {
        return this.request(`/transactions.php?id=${transactionId}`, 'DELETE');
    },

    // ========================================
    // HOLDINGS
    // ========================================

    /**
     * Get holdings for portfolio with current prices
     * @param {number} portfolioId Portfolio ID
     */
    async getHoldings(portfolioId) {
        return this.request(`/holdings.php?portfolio_id=${portfolioId}`, 'GET');
    },

    /**
     * Get portfolio overview with calculations
     * @param {number} portfolioId Portfolio ID
     */
    async getPortfolioOverview(portfolioId) {
        return this.request(`/holdings.php?portfolio_id=${portfolioId}&overview`, 'GET');
    },

    /**
     * Get all holdings for current user
     */
    async getAllUserHoldings() {
        return this.request('/holdings.php', 'GET');
    },

    // ========================================
    // PORTFOLIO HISTORY
    // ========================================

    /**
     * Get portfolio history data for charting
     * @param {number|null} portfolioId - Portfolio ID (null for all portfolios)
     * @param {string} period - Period: 24h, 7d, 30d
     * @returns {Promise<object>} History data with points and summary
     */
    async getPortfolioHistory(portfolioId, period = '24h') {
        const params = new URLSearchParams({ period });
        if (portfolioId) {
            params.append('portfolio_id', portfolioId);
        }
        return this.request(`/portfolio-history.php?${params.toString()}`, 'GET');
    }
};
