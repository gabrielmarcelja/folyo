/**
 * Folyo - Transaction Manager
 * Manages all transaction operations, modal, and validations
 */

const TransactionManager = {
    transactionModal: null,
    currentPortfolioId: null,
    selectedCrypto: null,
    searchTimeout: null,
    cryptoCache: null,
    isSubmitting: false,

    /**
     * Initialize transaction manager
     */
    init() {
        this.transactionModal = document.getElementById('transaction-modal');
        this.setupEventListeners();
        console.log('✅ Transaction Manager initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Transaction type tabs
        document.querySelectorAll('.transaction-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTransactionType(tab.dataset.type));
        });

        // Crypto search
        const searchInput = document.getElementById('crypto-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleCryptoSearch(e.target.value));
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim()) {
                    this.showSearchResults();
                }
            });
        }

        // Remove selected crypto
        const removeBtn = document.querySelector('.btn-remove-crypto');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.clearSelectedCrypto());
        }

        // Date input change - validate and fetch price
        const dateInput = document.getElementById('transaction-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => this.handleDateChange());
        }

        // Auto-calculate total
        ['transaction-quantity', 'transaction-price', 'transaction-fee'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateTotal());
            }
        });

        // Form submission
        const form = document.getElementById('transaction-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancel-transaction');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Close modal on backdrop click
        if (this.transactionModal) {
            this.transactionModal.addEventListener('click', (e) => {
                if (e.target === this.transactionModal) {
                    this.closeModal();
                }
            });
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.transactionModal?.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Modal close button
        const closeBtn = this.transactionModal?.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Add Transaction button (use specific ID)
        const addTransactionBtn = document.getElementById('add-transaction-btn');
        const submitTransactionBtn = document.getElementById('submit-transaction');

        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => {
                console.log('Add Transaction clicked, currentPortfolio:', PortfolioManager.currentPortfolio);
                if (PortfolioManager.currentPortfolio) {
                    this.showModal(PortfolioManager.currentPortfolio);
                } else {
                    console.error('No portfolio selected!');
                    AuthManager.showMessage('Please select a portfolio first', 'error');
                }
            });
        }

        // Also handle any other Add Transaction buttons (but NOT the submit button!)
        document.querySelectorAll('.btn-primary').forEach(btn => {
            if (btn.textContent.includes('Add Transaction') &&
                btn !== addTransactionBtn &&
                btn !== submitTransactionBtn) {
                btn.addEventListener('click', () => {
                    if (PortfolioManager.currentPortfolio) {
                        this.showModal(PortfolioManager.currentPortfolio);
                    }
                });
            }
        });
    },

    /**
     * Show transaction modal
     * @param {number} portfolioId
     */
    showModal(portfolioId) {
        console.log('📂 showModal() CALLED - portfolioId:', portfolioId);
        this.currentPortfolioId = portfolioId;
        this.clearSelectedCrypto();
        this.resetForm();

        // Set current date/time as default
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        document.getElementById('transaction-date').value = localDateTime;

        // Show modal
        if (this.transactionModal) {
            this.transactionModal.classList.add('active');
            document.body.classList.add('modal-open');

            // Focus on search input
            setTimeout(() => {
                document.getElementById('crypto-search')?.focus();
            }, 100);
        }
    },

    /**
     * Close transaction modal
     */
    closeModal() {
        console.log('📁 closeModal() CALLED');
        if (this.transactionModal) {
            this.transactionModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
        this.resetForm();
        this.clearSelectedCrypto();
        console.log('📁 closeModal() COMPLETED');
    },

    /**
     * Switch transaction type (buy/sell)
     * @param {string} type
     */
    switchTransactionType(type) {
        document.querySelectorAll('.transaction-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        document.getElementById('transaction-type').value = type;

        // Update button text
        const submitBtn = document.getElementById('submit-transaction');
        const btnText = submitBtn?.querySelector('.btn-text');
        if (btnText) {
            btnText.textContent = type === 'buy' ? 'Buy Crypto' : 'Sell Crypto';
        }
    },

    /**
     * Handle crypto search
     * @param {string} query
     */
    async handleCryptoSearch(query) {
        const resultsDiv = document.getElementById('crypto-search-results');

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Hide results if query is empty
        if (!query.trim()) {
            resultsDiv.classList.remove('active');
            return;
        }

        // Debounce search
        this.searchTimeout = setTimeout(async () => {
            try {
                // Show loading
                resultsDiv.innerHTML = '<div class="crypto-search-loading">Searching...</div>';
                resultsDiv.classList.add('active');

                // Fetch from cache or API
                const cryptos = await this.searchCryptos(query);

                if (cryptos.length === 0) {
                    resultsDiv.innerHTML = '<div class="crypto-search-empty">No cryptocurrencies found</div>';
                    return;
                }

                // Render results
                resultsDiv.innerHTML = cryptos.map(crypto => `
                    <div class="crypto-search-item" data-crypto='${JSON.stringify(crypto)}'>
                        <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png" alt="${crypto.symbol}">
                        <div class="crypto-search-item-info">
                            <div class="crypto-search-item-name">${crypto.name}</div>
                            <div class="crypto-search-item-symbol">${crypto.symbol}</div>
                        </div>
                        <div class="crypto-search-item-price">$${this.formatPrice(crypto.quote.USD.price)}</div>
                    </div>
                `).join('');

                // Add click handlers
                resultsDiv.querySelectorAll('.crypto-search-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const crypto = JSON.parse(item.dataset.crypto);
                        this.selectCrypto(crypto);
                    });
                });

            } catch (error) {
                console.error('Search error:', error);
                resultsDiv.innerHTML = '<div class="crypto-search-empty">Error searching cryptocurrencies</div>';
            }
        }, 300);
    },

    /**
     * Search cryptocurrencies
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async searchCryptos(query) {
        // Load crypto cache if not loaded
        if (!this.cryptoCache) {
            const response = await fetch('/api/proxy.php?endpoint=listings&limit=200');
            const data = await response.json();
            this.cryptoCache = data.data;
        }

        // Filter cached results
        const lowerQuery = query.toLowerCase();
        return this.cryptoCache.filter(crypto =>
            crypto.name.toLowerCase().includes(lowerQuery) ||
            crypto.symbol.toLowerCase().includes(lowerQuery)
        ).slice(0, 10);
    },

    /**
     * Select a cryptocurrency
     * @param {object} crypto
     */
    selectCrypto(crypto) {
        console.log('🟢 selectCrypto() CALLED - crypto:', crypto);
        this.selectedCrypto = crypto;

        // Hide search input and results
        document.getElementById('crypto-search').style.display = 'none';
        document.getElementById('crypto-search-results').classList.remove('active');

        // Show selected crypto
        const selectedDiv = document.getElementById('selected-crypto');
        selectedDiv.style.display = 'flex';
        selectedDiv.querySelector('.selected-crypto-logo').src = `https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`;
        selectedDiv.querySelector('.selected-crypto-name').textContent = crypto.name;
        selectedDiv.querySelector('.selected-crypto-symbol').textContent = crypto.symbol;

        // Set hidden fields
        const hiddenField = document.getElementById('transaction-crypto-id');
        hiddenField.value = crypto.id;
        console.log('🟢 selectCrypto() - Set hidden field value to:', hiddenField.value);
        console.log('🟢 selectCrypto() - this.selectedCrypto is now:', this.selectedCrypto);

        // Check date and set price if possible
        this.handleDateChange();
    },

    /**
     * Clear selected cryptocurrency
     */
    clearSelectedCrypto() {
        console.log('🔴 clearSelectedCrypto() CALLED');
        console.trace('🔴 Call stack:');
        this.selectedCrypto = null;
        document.getElementById('crypto-search').style.display = 'block';
        document.getElementById('crypto-search').value = '';
        document.getElementById('selected-crypto').style.display = 'none';
        document.getElementById('transaction-crypto-id').value = '';
        document.getElementById('transaction-price').value = '';
        document.getElementById('price-helper').textContent = '';
        console.log('🔴 clearSelectedCrypto() - Crypto cleared, hidden field now:', document.getElementById('transaction-crypto-id').value);
    },

    /**
     * Show search results dropdown
     */
    showSearchResults() {
        const resultsDiv = document.getElementById('crypto-search-results');
        if (resultsDiv.innerHTML) {
            resultsDiv.classList.add('active');
        }
    },

    /**
     * Handle date change - validate and fetch price if possible
     */
    async handleDateChange() {
        if (!this.selectedCrypto) return;

        const dateInput = document.getElementById('transaction-date');
        const priceInput = document.getElementById('transaction-price');
        const priceHelper = document.getElementById('price-helper');
        const dateHelper = document.getElementById('date-helper');

        if (!dateInput.value) return;

        const selectedDate = new Date(dateInput.value);
        const now = new Date();
        const daysDiff = Math.floor((now - selectedDate) / (1000 * 60 * 60 * 24));

        // Clear previous messages
        dateHelper.className = 'form-helper';
        priceHelper.className = 'form-helper';

        if (daysDiff < 0) {
            // Future date
            dateHelper.textContent = '⚠️ Cannot select a future date';
            dateHelper.classList.add('error');
            dateInput.value = '';
            return;
        }

        if (daysDiff <= 30) {
            // Within 30 days - can fetch price from API
            dateHelper.textContent = '✓ Auto-fetching price...';
            dateHelper.classList.add('success');

            try {
                // For current date (within 1 day), use current price from selected crypto
                if (daysDiff === 0) {
                    const currentPrice = this.selectedCrypto.quote.USD.price;
                    priceInput.value = currentPrice.toFixed(8);
                    priceHelper.textContent = '✓ Current price set automatically';
                    priceHelper.classList.add('success');
                } else {
                    // TODO: Implement historical price fetch for dates within 30 days
                    // For now, use current price as fallback
                    const currentPrice = this.selectedCrypto.quote.USD.price;
                    priceInput.value = currentPrice.toFixed(8);
                    priceHelper.textContent = `⚠️ Using current price (historical price fetch not yet implemented)`;
                    priceHelper.classList.add('warning');
                }

                this.calculateTotal();
            } catch (error) {
                console.error('Error fetching price:', error);
                priceHelper.textContent = '⚠️ Could not fetch price automatically. Please enter manually.';
                priceHelper.classList.add('warning');
                priceInput.value = '';
            }
        } else {
            // Older than 30 days - manual entry required
            dateHelper.textContent = `✓ Date is ${daysDiff} days ago`;
            priceHelper.textContent = '⚠️ Date > 30 days. Please enter price manually.';
            priceHelper.classList.add('warning');
            priceInput.value = '';
            priceInput.focus();
        }
    },

    /**
     * Calculate total amount
     */
    calculateTotal() {
        const quantity = parseFloat(document.getElementById('transaction-quantity').value) || 0;
        const price = parseFloat(document.getElementById('transaction-price').value) || 0;
        const fee = parseFloat(document.getElementById('transaction-fee').value) || 0;

        const total = (quantity * price) + fee;
        document.getElementById('transaction-total').value = total.toFixed(2);
    },

    /**
     * Handle form submission
     * @param {Event} e
     */
    async handleSubmit(e) {
        console.log('🔵 handleSubmit() CALLED');
        e.preventDefault();
        console.log('🔵 handleSubmit() - preventDefault() called');

        if (this.isSubmitting) {
            console.log('🔵 handleSubmit() - Already submitting, returning');
            return;
        }

        // Validate crypto is selected
        const cryptoId = document.getElementById('transaction-crypto-id').value;
        console.log('🔵 handleSubmit() - selectedCrypto:', this.selectedCrypto);
        console.log('🔵 handleSubmit() - cryptoId hidden field value:', cryptoId);

        if (!this.selectedCrypto || !cryptoId) {
            console.log('🔵 handleSubmit() - VALIDATION FAILED - No crypto selected');
            this.showError('Please select a cryptocurrency');
            return;
        }

        console.log('🔵 handleSubmit() - Validation passed, proceeding with transaction...');

        // Get form data
        const formData = {
            portfolio_id: this.currentPortfolioId,
            transaction_type: document.getElementById('transaction-type').value,
            crypto_id: parseInt(document.getElementById('transaction-crypto-id').value),
            crypto_symbol: this.selectedCrypto.symbol,
            crypto_name: this.selectedCrypto.name,
            quantity: parseFloat(document.getElementById('transaction-quantity').value),
            price_per_coin: parseFloat(document.getElementById('transaction-price').value),
            total_amount: parseFloat(document.getElementById('transaction-total').value),
            fee: parseFloat(document.getElementById('transaction-fee').value) || 0,
            currency: 'USD',
            transaction_date: this.convertToUTCDateTime(document.getElementById('transaction-date').value),
            notes: document.getElementById('transaction-notes').value.trim() || null
        };

        // Validate
        if (formData.quantity <= 0) {
            this.showError('Quantity must be greater than 0');
            return;
        }

        if (formData.price_per_coin <= 0) {
            this.showError('Price must be greater than 0');
            return;
        }

        try {
            this.isSubmitting = true;
            this.showLoading(true);

            // Submit to API
            const result = await APIClient.createTransaction(formData);

            // Success!
            AuthManager.showMessage(`Transaction added successfully!`, 'success');
            this.closeModal();

            // Reload portfolio data
            await PortfolioManager.loadPortfolio(this.currentPortfolioId);

        } catch (error) {
            console.error('Transaction error:', error);
            this.showError(error.message || 'Failed to create transaction');
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
        }
    },

    /**
     * Convert local datetime to UTC for API
     * @param {string} localDateTime
     * @returns {string}
     */
    convertToUTCDateTime(localDateTime) {
        const date = new Date(localDateTime);
        return date.toISOString().slice(0, 19).replace('T', ' ');
    },

    /**
     * Show loading state
     * @param {boolean} loading
     */
    showLoading(loading) {
        const submitBtn = document.getElementById('submit-transaction');
        if (submitBtn) {
            if (loading) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            } else {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }
    },

    /**
     * Show error message
     * @param {string} message
     */
    showError(message) {
        const errorDiv = document.getElementById('transaction-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';

            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    },

    /**
     * Reset form
     */
    resetForm() {
        console.log('🟡 resetForm() CALLED');
        console.log('🟡 resetForm() - Hidden field BEFORE reset:', document.getElementById('transaction-crypto-id').value);

        // Reset individual fields instead of form.reset() to preserve hidden fields
        document.getElementById('transaction-quantity').value = '';
        document.getElementById('transaction-price').value = '';
        document.getElementById('transaction-fee').value = '0';
        document.getElementById('transaction-total').value = '';
        document.getElementById('transaction-notes').value = '';

        // Set date to now
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        document.getElementById('transaction-date').value = localDateTime;

        // Reset to buy tab
        this.switchTransactionType('buy');

        // Clear error
        const errorDiv = document.getElementById('transaction-error');
        if (errorDiv) errorDiv.style.display = 'none';

        // Clear helpers
        document.getElementById('price-helper').textContent = '';
        document.getElementById('date-helper').textContent = '';

        console.log('🟡 resetForm() - Hidden field AFTER reset:', document.getElementById('transaction-crypto-id').value);
        console.log('🟡 resetForm() - COMPLETED (hidden fields should be preserved)');
    },

    /**
     * Format price for display
     * @param {number} price
     * @returns {string}
     */
    formatPrice(price) {
        if (price >= 1) {
            return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else if (price >= 0.01) {
            return price.toFixed(4);
        } else {
            return price.toFixed(8);
        }
    },

    /**
     * Load and render transactions for portfolio
     * @param {number} portfolioId
     */
    async loadTransactions(portfolioId) {
        try {
            const transactions = await APIClient.getTransactions(portfolioId);

            const emptyState = document.getElementById('transactions-empty');
            const tableWrapper = document.querySelector('.transactions-section .table-wrapper');
            const cardsContainer = document.getElementById('transactions-cards');

            if (transactions.length === 0) {
                // Show empty state
                emptyState.style.display = 'block';
                tableWrapper.style.display = 'none';
                cardsContainer.style.display = 'none';
                return;
            }

            // Hide empty state
            emptyState.style.display = 'none';
            tableWrapper.style.display = 'block';

            // Render transactions table
            this.renderTransactionsTable(transactions);
            this.renderTransactionsCards(transactions);

        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    },

    /**
     * Render transactions table
     * @param {array} transactions
     */
    renderTransactionsTable(transactions) {
        const tbody = document.getElementById('transactions-table-body');
        if (!tbody) return;

        tbody.innerHTML = transactions.map(tx => {
            const date = new Date(tx.transaction_date);
            const formattedDate = date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr>
                    <td>${formattedDate}</td>
                    <td><span class="transaction-type ${tx.transaction_type}">${tx.transaction_type}</span></td>
                    <td>
                        <div class="transaction-crypto">
                            <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/${tx.crypto_id}.png" alt="${tx.crypto_symbol}">
                            <div class="transaction-crypto-info">
                                <div class="transaction-crypto-name">${tx.crypto_name}</div>
                                <div class="transaction-crypto-symbol">${tx.crypto_symbol}</div>
                            </div>
                        </div>
                    </td>
                    <td>${parseFloat(tx.quantity).toFixed(8)}</td>
                    <td>$${this.formatPrice(parseFloat(tx.price_per_coin))}</td>
                    <td>$${parseFloat(tx.fee).toFixed(2)}</td>
                    <td>$${parseFloat(tx.total_amount).toFixed(2)}</td>
                    <td>
                        <div class="transaction-actions">
                            <button class="btn-icon-sm" onclick="TransactionManager.editTransaction(${tx.id})" title="Edit">
                                ✏️
                            </button>
                            <button class="btn-icon-sm danger" onclick="TransactionManager.deleteTransaction(${tx.id})" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render transactions cards for mobile
     * @param {array} transactions
     */
    renderTransactionsCards(transactions) {
        const container = document.getElementById('transactions-cards');
        if (!container) return;

        container.innerHTML = transactions.map(tx => {
            const date = new Date(tx.transaction_date);
            const formattedDate = date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="transaction-card">
                    <div class="transaction-card-header">
                        <span class="transaction-card-date">${formattedDate}</span>
                        <span class="transaction-type ${tx.transaction_type}">${tx.transaction_type}</span>
                    </div>
                    <div class="transaction-card-body">
                        <div class="transaction-card-field">
                            <span class="transaction-card-field-label">Asset</span>
                            <div class="transaction-crypto">
                                <img src="https://s2.coinmarketcap.com/static/img/coins/64x64/${tx.crypto_id}.png" alt="${tx.crypto_symbol}">
                                <div class="transaction-crypto-info">
                                    <div class="transaction-crypto-name">${tx.crypto_name}</div>
                                    <div class="transaction-crypto-symbol">${tx.crypto_symbol}</div>
                                </div>
                            </div>
                        </div>
                        <div class="transaction-card-field">
                            <span class="transaction-card-field-label">Quantity</span>
                            <span class="transaction-card-field-value">${parseFloat(tx.quantity).toFixed(8)}</span>
                        </div>
                        <div class="transaction-card-field">
                            <span class="transaction-card-field-label">Price</span>
                            <span class="transaction-card-field-value">$${this.formatPrice(parseFloat(tx.price_per_coin))}</span>
                        </div>
                        <div class="transaction-card-field">
                            <span class="transaction-card-field-label">Total</span>
                            <span class="transaction-card-field-value">$${parseFloat(tx.total_amount).toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="transaction-card-footer">
                        <button class="btn-icon-sm" onclick="TransactionManager.editTransaction(${tx.id})" title="Edit">
                            ✏️
                        </button>
                        <button class="btn-icon-sm danger" onclick="TransactionManager.deleteTransaction(${tx.id})" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Edit transaction
     * @param {number} transactionId
     */
    async editTransaction(transactionId) {
        // TODO: Implement edit transaction modal
        // For now, just log
        console.log('Edit transaction:', transactionId);
        AuthManager.showMessage('Edit transaction feature coming soon!', 'info');
    },

    /**
     * Delete transaction
     * @param {number} transactionId
     */
    async deleteTransaction(transactionId) {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            await APIClient.deleteTransaction(transactionId);
            AuthManager.showMessage('Transaction deleted successfully!', 'success');

            // Reload portfolio
            if (PortfolioManager.currentPortfolio) {
                await PortfolioManager.loadPortfolio(PortfolioManager.currentPortfolio);
            }
        } catch (error) {
            console.error('Delete error:', error);
            AuthManager.showMessage(error.message || 'Failed to delete transaction', 'error');
        }
    },

    /**
     * Export transactions to CSV
     * @param {number} portfolioId
     */
    async exportTransactionsCSV(portfolioId) {
        try {
            const transactions = await APIClient.getTransactions(portfolioId);

            if (transactions.length === 0) {
                AuthManager.showMessage('No transactions to export', 'info');
                return;
            }

            // Create CSV content
            const headers = ['Date', 'Type', 'Crypto', 'Symbol', 'Quantity', 'Price Per Coin', 'Fee', 'Total', 'Notes'];
            const rows = transactions.map(tx => [
                tx.transaction_date,
                tx.transaction_type,
                tx.crypto_name,
                tx.crypto_symbol,
                tx.quantity,
                tx.price_per_coin,
                tx.fee,
                tx.total_amount,
                tx.notes || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const portfolio = PortfolioManager.portfolios.find(p => p.id === portfolioId);
            const filename = `${portfolio?.name || 'portfolio'}_transactions_${new Date().toISOString().split('T')[0]}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            AuthManager.showMessage('Transactions exported successfully!', 'success');

        } catch (error) {
            console.error('Export error:', error);
            AuthManager.showMessage(error.message || 'Failed to export transactions', 'error');
        }
    }
};
