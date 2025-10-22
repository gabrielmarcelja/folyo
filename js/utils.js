/**
 * Folyo - Utility Functions
 */

const Utils = {
    /**
     * Format number with K, M, B, T suffixes
     * @param {number} num
     * @param {number} decimals
     * @returns {string}
     */
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined) return '-';

        const absNum = Math.abs(num);

        if (absNum >= 1e12) {
            return (num / 1e12).toFixed(decimals) + 'T';
        }
        if (absNum >= 1e9) {
            return (num / 1e9).toFixed(decimals) + 'B';
        }
        if (absNum >= 1e6) {
            return (num / 1e6).toFixed(decimals) + 'M';
        }
        if (absNum >= 1e3) {
            return (num / 1e3).toFixed(decimals) + 'K';
        }

        return num.toFixed(decimals);
    },

    /**
     * Format price with currency symbol
     * @param {number} price
     * @param {string} currency
     * @param {number} decimals
     * @returns {string}
     */
    formatPrice(price, currency = 'USD', decimals = 2) {
        if (price === null || price === undefined) return '-';

        const symbol = CONFIG.CURRENCY_SYMBOLS[currency] || '$';

        // Adjust decimals based on price magnitude
        if (price < 0.01) {
            decimals = 6;
        } else if (price < 1) {
            decimals = 4;
        }

        const formattedPrice = price.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });

        return `${symbol}${formattedPrice}`;
    },

    /**
     * Format market cap or volume
     * @param {number} value
     * @param {string} currency
     * @returns {string}
     */
    formatMarketCap(value, currency = 'USD') {
        if (value === null || value === undefined) return '-';

        const symbol = CONFIG.CURRENCY_SYMBOLS[currency] || '$';
        return symbol + this.formatNumber(value, 2);
    },

    /**
     * Format percentage
     * @param {number} percent
     * @returns {string}
     */
    formatPercent(percent) {
        if (percent === null || percent === undefined) return '-';

        const sign = percent >= 0 ? '+' : '';
        return `${sign}${percent.toFixed(2)}%`;
    },

    /**
     * Format supply number
     * @param {number} supply
     * @param {string} symbol
     * @returns {string}
     */
    formatSupply(supply, symbol) {
        if (supply === null || supply === undefined) return '-';

        return `${this.formatNumber(supply, 0)} ${symbol.toUpperCase()}`;
    },

    /**
     * Get Fear & Greed level info
     * @param {number} value
     * @returns {object}
     */
    getFearGreedLevel(value) {
        if (value === null || value === undefined) return null;

        for (const [threshold, info] of Object.entries(CONFIG.FEAR_GREED_LEVELS).reverse()) {
            if (value >= parseInt(threshold)) {
                return { ...info, value };
            }
        }

        return { ...CONFIG.FEAR_GREED_LEVELS[0], value };
    },

    /**
     * Get cryptocurrency logo URL
     * @param {number} id
     * @returns {string}
     */
    getLogoUrl(id) {
        return CONFIG.LOGO_URL_TEMPLATE.replace('{id}', id);
    },

    /**
     * Debounce function
     * @param {function} func
     * @param {number} wait
     * @returns {function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Get time ago text
     * @param {Date} date
     * @returns {string}
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    },

    /**
     * Get nested object property by path
     * @param {object} obj
     * @param {string} path
     * @returns {any}
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
    },

    /**
     * Sort array by property
     * @param {array} array
     * @param {string} property
     * @param {string} direction
     * @returns {array}
     */
    sortBy(array, property, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = this.getNestedValue(a, property);
            const bVal = this.getNestedValue(b, property);

            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;

            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }
};
