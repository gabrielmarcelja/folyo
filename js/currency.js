/**
 * Folyo - Currency Selector
 */

const CurrencyManager = {
    currentCurrency: 'USD',

    /**
     * Initialize currency selector
     */
    init() {
        // Load saved currency from localStorage
        const savedCurrency = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENCY);
        if (savedCurrency) {
            this.currentCurrency = savedCurrency;
            document.getElementById('currency-select').value = savedCurrency;
        }

        // Add event listener
        document.getElementById('currency-select').addEventListener('change', (e) => {
            this.changeCurrency(e.target.value);
        });
    },

    /**
     * Change currency
     * @param {string} currency
     */
    changeCurrency(currency) {
        this.currentCurrency = currency;
        localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENCY, currency);

        // Trigger app reload with new currency
        if (window.App) {
            window.App.loadData();
        }
    },

    /**
     * Get current currency
     * @returns {string}
     */
    getCurrency() {
        return this.currentCurrency;
    }
};
