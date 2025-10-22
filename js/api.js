/**
 * Folyo - API Functions
 */

const API = {
    /**
     * Fetch cryptocurrency listings
     * @param {number} start
     * @param {number} limit
     * @param {string} convert
     * @returns {Promise}
     */
    async getCryptoListings(start = 1, limit = 100, convert = 'USD') {
        try {
            const url = `${CONFIG.API_BASE_URL}?endpoint=listings&start=${start}&limit=${limit}&convert=${convert}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status && data.status.error_code !== 0) {
                throw new Error(data.status.error_message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('Error fetching cryptocurrency listings:', error);
            throw error;
        }
    },

    /**
     * Fetch global metrics
     * @param {string} convert
     * @returns {Promise}
     */
    async getGlobalMetrics(convert = 'USD') {
        try {
            const url = `${CONFIG.API_BASE_URL}?endpoint=global-metrics&convert=${convert}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status && data.status.error_code !== 0) {
                throw new Error(data.status.error_message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('Error fetching global metrics:', error);
            throw error;
        }
    },

    /**
     * Fetch Fear & Greed Index (from Alternative.me)
     * @returns {Promise}
     */
    async getFearGreedIndex() {
        try {
            const url = `${CONFIG.API_BASE_URL}?endpoint=fear-greed`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Alternative.me API returns: { data: [{ value: "25", value_classification: "Extreme Fear" }] }
            // Convert to our expected format: { data: { value: 25, value_classification: "Extreme Fear" } }
            if (result.data && result.data.length > 0) {
                const fngData = result.data[0];
                return {
                    data: {
                        value: parseInt(fngData.value, 10), // Convert string to number
                        value_classification: fngData.value_classification
                    }
                };
            }

            throw new Error('Invalid Fear & Greed Index response');
        } catch (error) {
            console.error('Error fetching Fear & Greed Index:', error);
            // Return fallback data instead of throwing
            return { data: { value: null, value_classification: 'Unknown' } };
        }
    },

    /**
     * Fetch cryptocurrency info (metadata, logo, description, urls, etc.)
     * @param {string} identifier - ID, slug, or symbol
     * @param {string} identifierType - 'id', 'slug', or 'symbol'
     * @returns {Promise}
     */
    async getCryptoInfo(identifier, identifierType = 'id') {
        try {
            let url;
            if (identifierType === 'slug') {
                url = `${CONFIG.API_BASE_URL}?endpoint=crypto-info&slug=${identifier}`;
            } else if (identifierType === 'symbol') {
                url = `${CONFIG.API_BASE_URL}?endpoint=crypto-info&symbol=${identifier}`;
            } else {
                url = `${CONFIG.API_BASE_URL}?endpoint=crypto-info&ids=${identifier}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status && data.status.error_code !== 0) {
                throw new Error(data.status.error_message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('Error fetching crypto info:', error);
            throw error;
        }
    },

    /**
     * Fetch cryptocurrency quotes (current prices, market data)
     * @param {string} identifier - ID, slug, or symbol
     * @param {string} identifierType - 'id', 'slug', or 'symbol'
     * @param {string} convert - Currency to convert to
     * @returns {Promise}
     */
    async getCryptoQuotes(identifier, identifierType = 'id', convert = 'USD') {
        try {
            let url;
            if (identifierType === 'slug') {
                url = `${CONFIG.API_BASE_URL}?endpoint=crypto-quotes&slug=${identifier}&convert=${convert}`;
            } else if (identifierType === 'symbol') {
                url = `${CONFIG.API_BASE_URL}?endpoint=crypto-quotes&symbol=${identifier}&convert=${convert}`;
            } else {
                url = `${CONFIG.API_BASE_URL}?endpoint=crypto-quotes&ids=${identifier}&convert=${convert}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status && data.status.error_code !== 0) {
                throw new Error(data.status.error_message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('Error fetching crypto quotes:', error);
            throw error;
        }
    },

    /**
     * Fetch historical OHLCV data for sparklines
     * @param {string} ids - Comma-separated cryptocurrency IDs
     * @param {number} count - Number of data points (default 8 for 7 days)
     * @param {string} convert - Currency to convert to
     * @param {string} interval - Time interval (daily or hourly)
     * @param {string} timePeriod - Time period aggregate (daily or hourly)
     * @returns {Promise}
     */
    async getOHLCVHistorical(ids, count = 8, convert = 'USD', interval = 'daily', timePeriod = 'daily') {
        try {
            const url = `${CONFIG.API_BASE_URL}?endpoint=ohlcv-historical&ids=${ids}&count=${count}&interval=${interval}&time_period=${timePeriod}&convert=${convert}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status && data.status.error_code !== 0) {
                throw new Error(data.status.error_message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('Error fetching OHLCV historical data:', error);
            throw error;
        }
    },

    /**
     * Fetch all data needed for the app
     * @param {number} start
     * @param {number} limit
     * @param {string} currency
     * @returns {Promise}
     */
    async fetchAllData(start = 1, limit = 100, currency = 'USD') {
        try {
            const [listings, globalMetrics, fearGreed] = await Promise.all([
                this.getCryptoListings(start, limit, currency),
                this.getGlobalMetrics(currency),
                this.getFearGreedIndex()
            ]);

            return {
                listings: listings.data || [],
                globalMetrics: globalMetrics.data || {},
                fearGreed: fearGreed.data || {},
                status: listings.status
            };
        } catch (error) {
            console.error('Error fetching all data:', error);
            throw error;
        }
    }
};
