/**
 * Folyo - Main Application
 */

const App = {
    refreshIntervalId: null,

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize managers
            ThemeManager.init();
            CurrencyManager.init();
            UI.init();

            // Load initial data
            await this.loadData();

            // Setup auto-refresh
            this.setupAutoRefresh();
        } catch (error) {
            Debug.error('Error initializing app:', error);
            UI.showError('Failed to initialize application. Please refresh the page.');
        }
    },

    /**
     * Load cryptocurrency data
     */
    async loadData() {
        try {
            UI.showLoading();

            const currency = CurrencyManager.getCurrency();
            const data = await API.fetchAllData(1, 5000, currency);

            // Render global stats
            UI.renderGlobalStats(data.globalMetrics, data.fearGreed);

            // Set cryptocurrency data
            UI.setData(data.listings);

            // Update last update time
            UI.updateLastUpdateTime();

            UI.hideLoading();

            return data;
        } catch (error) {
            Debug.error('Error loading data:', error);
            UI.showError(
                'Failed to load cryptocurrency data. Please check your internet connection and try again.'
            );
            throw error;
        }
    },

    /**
     * Refresh data
     */
    async refreshData() {
        try {
            const currency = CurrencyManager.getCurrency();
            const data = await API.fetchAllData(1, 5000, currency);

            // Update global stats
            UI.renderGlobalStats(data.globalMetrics, data.fearGreed);

            // Update cryptocurrency data (preserving current page and filters)
            const currentPage = UI.currentPage;
            const searchTerm = UI.searchTerm;
            const sortField = UI.sortField;
            const sortDirection = UI.sortDirection;

            UI.setData(data.listings);

            // Restore state
            UI.currentPage = currentPage;
            UI.searchTerm = searchTerm;
            UI.sortField = sortField;
            UI.sortDirection = sortDirection;

            if (UI.searchTerm) {
                UI.filterData();
            }

            if (UI.sortField) {
                UI.filteredData = Utils.sortBy(UI.filteredData, UI.sortField, UI.sortDirection);
            }

            UI.renderTable();
            UI.renderPagination();

            // Fetch sparkline data for current page
            await UI.fetchSparklineData();

            // Update last update time
            UI.updateLastUpdateTime();
        } catch (error) {
            Debug.error('Error refreshing data:', error);
            // Don't show error on refresh failure, just log it
        }
    },

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        // Clear existing interval if any
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
        }

        // Set up new interval
        this.refreshIntervalId = setInterval(() => {
            this.refreshData();
        }, CONFIG.REFRESH_INTERVAL);
    },

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.App = App;
    App.init();
});

// Stop auto-refresh when page is hidden (battery saving)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        App.stopAutoRefresh();
    } else {
        App.setupAutoRefresh();
        App.refreshData(); // Refresh immediately when returning
    }
});

// Expose App to window for debugging
window.App = App;
