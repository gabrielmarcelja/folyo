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
    eventController: null, // AbortController for event listeners
    editingTransactionId: null, // ID of transaction being edited (null for new transaction)
    allTransactions: [], // Store all transactions for filtering
    filteredTransactions: [], // Store filtered transactions
    filters: {
        search: '',
        type: 'all',
        date: 'all'
    },

    /**
     * Initialize transaction manager
     */
    init() {
        this.transactionModal = document.getElementById('transaction-modal');
        this.setupEventListeners();
        Debug.log('✅ Transaction Manager initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Clean up previous event listeners if they exist
        if (this.eventController) {
            this.eventController.abort();
        }

        // Create new AbortController
        this.eventController = new AbortController();
        const { signal } = this.eventController;

        // Transaction type tabs
        document.querySelectorAll('.transaction-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTransactionType(tab.dataset.type), { signal });
        });

        // Crypto search
        const searchInput = document.getElementById('crypto-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleCryptoSearch(e.target.value), { signal });
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim()) {
                    this.showSearchResults();
                }
            }, { signal });
        }

        // Remove selected crypto
        const removeBtn = document.querySelector('.btn-remove-crypto');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.clearSelectedCrypto(), { signal });
        }

        // Date input change - validate and fetch price
        const dateInput = document.getElementById('transaction-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => this.handleDateChange(), { signal });
        }

        // Auto-calculate total
        ['transaction-quantity', 'transaction-price', 'transaction-fee'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.calculateTotal(), { signal });
            }
        });

        // Form submission
        const form = document.getElementById('transaction-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e), { signal });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancel-transaction');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal(), { signal });
        }

        // Close modal on backdrop click
        if (this.transactionModal) {
            this.transactionModal.addEventListener('click', (e) => {
                if (e.target === this.transactionModal) {
                    this.closeModal();
                }
            }, { signal });
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.transactionModal?.classList.contains('active')) {
                this.closeModal();
            }
        }, { signal });

        // Modal close button
        const closeBtn = this.transactionModal?.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal(), { signal });
        }

        // Add Transaction button (use specific ID)
        const addTransactionBtn = document.getElementById('add-transaction-btn');
        const submitTransactionBtn = document.getElementById('submit-transaction');

        if (addTransactionBtn) {
            addTransactionBtn.addEventListener('click', () => {
                Debug.log('Add Transaction clicked, currentPortfolio:', PortfolioManager.currentPortfolio);
                if (PortfolioManager.currentPortfolio) {
                    this.showModal(PortfolioManager.currentPortfolio);
                } else {
                    Debug.error('No portfolio selected!');
                    AuthManager.showMessage('Please select a portfolio first', 'error');
                }
            }, { signal });
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
                }, { signal });
            }
        });

        // Transaction filters
        const transactionSearchInput = document.getElementById('transaction-search');
        if (transactionSearchInput) {
            transactionSearchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
                this.updateClearButtonVisibility();
            }, { signal });
        }

        const typeFilter = document.getElementById('transaction-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filters.type = e.target.value;
                this.applyFilters();
                this.updateClearButtonVisibility();
            }, { signal });
        }

        const dateFilter = document.getElementById('transaction-date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.date = e.target.value;
                this.applyFilters();
                this.updateClearButtonVisibility();
            }, { signal });
        }

        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters(), { signal });
        }
    },

    /**
     * Show transaction modal
     * @param {number} portfolioId
     * @param {object|null} transaction - Transaction data for edit mode (null for create mode)
     */
    showModal(portfolioId, transaction = null) {
        Debug.log('📂 showModal() CALLED - portfolioId:', portfolioId, 'transaction:', transaction);
        this.currentPortfolioId = portfolioId;

        // If no transaction provided, we're in create mode
        if (!transaction) {
            this.editingTransactionId = null;
            this.clearSelectedCrypto();
            this.resetForm();

            // Set current date/time as default
            const now = new Date();
            const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            document.getElementById('transaction-date').value = localDateTime;

            // Update modal title and button
            this.updateModalForMode('create');
        } else {
            // Edit mode - populate form with transaction data
            this.resetForm();
            this.populateFormWithTransaction(transaction);

            // Update modal title and button
            this.updateModalForMode('edit');
        }

        // Show modal
        if (this.transactionModal) {
            this.transactionModal.classList.add('active');
            document.body.classList.add('modal-open');

            // Focus appropriately
            setTimeout(() => {
                if (transaction) {
                    // In edit mode, focus on quantity field
                    document.getElementById('transaction-quantity')?.focus();
                } else {
                    // In create mode, focus on search
                    document.getElementById('crypto-search')?.focus();
                }
            }, 100);
        }
    },

    /**
     * Populate form with transaction data (for edit mode)
     * @param {object} transaction
     */
    populateFormWithTransaction(transaction) {
        // Set transaction type
        this.switchTransactionType(transaction.transaction_type);

        // Select crypto (create a crypto object from transaction data)
        const crypto = {
            id: transaction.crypto_id,
            name: transaction.crypto_name,
            symbol: transaction.crypto_symbol,
            quote: {
                USD: {
                    price: transaction.price_per_coin
                }
            }
        };
        this.selectCrypto(crypto);

        // Set form fields
        document.getElementById('transaction-quantity').value = parseFloat(transaction.quantity);
        document.getElementById('transaction-price').value = parseFloat(transaction.price_per_coin);
        document.getElementById('transaction-fee').value = parseFloat(transaction.fee);
        document.getElementById('transaction-total').value = parseFloat(transaction.total_amount);
        document.getElementById('transaction-notes').value = transaction.notes || '';

        // Set transaction date (convert UTC to local)
        const utcDate = new Date(transaction.transaction_date + 'Z'); // Add Z to indicate UTC
        const localDateTime = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        document.getElementById('transaction-date').value = localDateTime;
    },

    /**
     * Update modal UI based on mode (create or edit)
     * @param {string} mode - 'create' or 'edit'
     */
    updateModalForMode(mode) {
        const modalTitle = this.transactionModal?.querySelector('.modal-header h2');
        const submitBtn = document.getElementById('submit-transaction');
        const btnText = submitBtn?.querySelector('.btn-text');

        if (mode === 'edit') {
            if (modalTitle) modalTitle.textContent = 'Edit Transaction';
            if (btnText) btnText.textContent = 'Update Transaction';
        } else {
            if (modalTitle) modalTitle.textContent = 'Add Transaction';
            const transactionType = document.getElementById('transaction-type').value;
            if (btnText) btnText.textContent = transactionType === 'buy' ? 'Buy Crypto' : 'Sell Crypto';
        }
    },

    /**
     * Close transaction modal
     */
    closeModal() {
        Debug.log('📁 closeModal() CALLED');
        if (this.transactionModal) {
            this.transactionModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
        this.editingTransactionId = null; // Reset edit mode
        this.resetForm();
        this.clearSelectedCrypto();
        Debug.log('📁 closeModal() COMPLETED');
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
                Debug.error('Search error:', error);
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
        Debug.log('🟢 selectCrypto() CALLED - crypto:', crypto);
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
        Debug.log('🟢 selectCrypto() - Set hidden field value to:', hiddenField.value);
        Debug.log('🟢 selectCrypto() - this.selectedCrypto is now:', this.selectedCrypto);

        // Check date and set price if possible
        this.handleDateChange();
    },

    /**
     * Clear selected cryptocurrency
     */
    clearSelectedCrypto() {
        Debug.log('🔴 clearSelectedCrypto() CALLED');
        console.trace('🔴 Call stack:');
        this.selectedCrypto = null;
        document.getElementById('crypto-search').style.display = 'block';
        document.getElementById('crypto-search').value = '';
        document.getElementById('selected-crypto').style.display = 'none';
        document.getElementById('transaction-crypto-id').value = '';
        document.getElementById('transaction-price').value = '';
        document.getElementById('price-helper').textContent = '';
        Debug.log('🔴 clearSelectedCrypto() - Crypto cleared, hidden field now:', document.getElementById('transaction-crypto-id').value);
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
                Debug.error('Error fetching price:', error);
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
        Debug.log('🔵 handleSubmit() CALLED');
        e.preventDefault();
        Debug.log('🔵 handleSubmit() - preventDefault() called');

        if (this.isSubmitting) {
            Debug.log('🔵 handleSubmit() - Already submitting, returning');
            return;
        }

        // Validate crypto is selected
        const cryptoId = document.getElementById('transaction-crypto-id').value;
        Debug.log('🔵 handleSubmit() - selectedCrypto:', this.selectedCrypto);
        Debug.log('🔵 handleSubmit() - cryptoId hidden field value:', cryptoId);

        if (!this.selectedCrypto || !cryptoId) {
            Debug.log('🔵 handleSubmit() - VALIDATION FAILED - No crypto selected');
            this.showError('Please select a cryptocurrency');
            return;
        }

        Debug.log('🔵 handleSubmit() - Validation passed, proceeding with transaction...');

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

            // Check if we're editing or creating
            if (this.editingTransactionId) {
                // Update existing transaction
                const result = await APIClient.updateTransaction(this.editingTransactionId, formData);
                AuthManager.showMessage(`Transaction updated successfully!`, 'success');
            } else {
                // Create new transaction
                const result = await APIClient.createTransaction(formData);
                AuthManager.showMessage(`Transaction added successfully!`, 'success');
            }

            this.closeModal();

            // Reload portfolio data
            await PortfolioManager.loadPortfolio(this.currentPortfolioId);

            // Also reload overview to update total statistics across all portfolios
            await PortfolioManager.loadOverview();

        } catch (error) {
            Debug.error('Transaction error:', error);
            ErrorHandler.handleApiError(error, 'Failed to save transaction. Please check your input and try again.');
            this.showError(error.message || 'Failed to save transaction');
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
        Debug.log('🟡 resetForm() CALLED');
        Debug.log('🟡 resetForm() - Hidden field BEFORE reset:', document.getElementById('transaction-crypto-id').value);

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

        Debug.log('🟡 resetForm() - Hidden field AFTER reset:', document.getElementById('transaction-crypto-id').value);
        Debug.log('🟡 resetForm() - COMPLETED (hidden fields should be preserved)');
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
        const emptyState = document.getElementById('transactions-empty');
        const tableWrapper = document.querySelector('.transactions-section .table-wrapper');

        try {
            // Show skeleton loaders while loading
            emptyState.style.display = 'none';
            tableWrapper.style.display = 'block';
            this.showTransactionsTableSkeleton();

            const transactions = await APIClient.getTransactions(portfolioId);

            // Store all transactions
            this.allTransactions = transactions;
            this.filteredTransactions = transactions;

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

            // Apply current filters
            this.applyFilters();

        } catch (error) {
            Debug.error('Error loading transactions:', error);
        }
    },

    /**
     * Show skeleton loaders for transactions table
     */
    showTransactionsTableSkeleton() {
        const tbody = document.getElementById('transactions-table-body');
        if (!tbody) return;

        const skeletonRows = Array(5).fill(0).map(() => `
            <tr>
                <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
                <td><div class="skeleton" style="height: 24px; width: 50px;"></div></td>
                <td><div class="skeleton" style="height: 40px; width: 140px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 50px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
                <td><div class="skeleton" style="height: 24px; width: 60px;"></div></td>
            </tr>
        `).join('');

        tbody.innerHTML = skeletonRows;
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
     * Edit transaction
     * @param {number} transactionId
     */
    async editTransaction(transactionId) {
        try {
            // Fetch transaction details
            const transaction = await APIClient.getTransaction(transactionId);

            // Set editing mode
            this.editingTransactionId = transactionId;
            this.currentPortfolioId = transaction.portfolio_id;

            // Show modal with transaction data
            this.showModal(transaction.portfolio_id, transaction);

        } catch (error) {
            Debug.error('Error loading transaction for edit:', error);
            AuthManager.showMessage(error.message || 'Failed to load transaction', 'error');
        }
    },

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} True if confirmed, false if canceled
     */
    showConfirmDialog(options = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7); display: flex; align-items: center;
                justify-content: center; z-index: 10000; animation: fadeIn 0.2s ease-out;
            `;

            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.style.cssText = `
                background: var(--bg-secondary, #2a2a2a); border-radius: 12px;
                padding: 24px; max-width: 400px; width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                animation: slideIn 0.3s ease-out;
            `;

            modal.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 18px; font-weight: 600;">
                        ${options.title || 'Confirm Action'}
                    </h3>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.5;">
                        ${options.message || 'Are you sure?'}
                    </p>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="confirm-cancel" style="
                        padding: 10px 20px; border: 1px solid var(--border-color);
                        background: transparent; color: var(--text-primary);
                        border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
                    ">${options.cancelText || 'Cancel'}</button>
                    <button id="confirm-ok" style="
                        padding: 10px 20px; border: none; background: #EA3943;
                        color: white; border-radius: 8px; cursor: pointer;
                        font-size: 14px; font-weight: 500;
                    ">${options.confirmText || 'Confirm'}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const handleConfirm = () => {
                overlay.remove();
                resolve(true);
            };

            const handleCancel = () => {
                overlay.remove();
                resolve(false);
            };

            modal.querySelector('#confirm-ok').addEventListener('click', handleConfirm);
            modal.querySelector('#confirm-cancel').addEventListener('click', handleCancel);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleCancel();
            });

            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    handleCancel();
                    document.removeEventListener('keydown', escHandler);
                }
            });
        });
    },

    /**
     * Delete transaction with confirmation
     * @param {number} transactionId
     */
    async deleteTransaction(transactionId) {
        const confirmed = await this.showConfirmDialog({
            title: 'Delete Transaction',
            message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            await APIClient.deleteTransaction(transactionId);
            AuthManager.showMessage('Transaction deleted successfully!', 'success');

            if (PortfolioManager.currentPortfolio) {
                await PortfolioManager.loadPortfolio(PortfolioManager.currentPortfolio);
            }

            await PortfolioManager.loadOverview();
        } catch (error) {
            Debug.error('Delete error:', error);
            ErrorHandler.handleApiError(error, 'Failed to delete transaction. Please try again.');
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
            Debug.error('Export error:', error);
            AuthManager.showMessage(error.message || 'Failed to export transactions', 'error');
        }
    },

    /**
     * Apply filters to transactions
     */
    applyFilters() {
        let filtered = [...this.allTransactions];

        // Apply search filter
        if (this.filters.search) {
            filtered = filtered.filter(tx =>
                tx.crypto_name.toLowerCase().includes(this.filters.search) ||
                tx.crypto_symbol.toLowerCase().includes(this.filters.search)
            );
        }

        // Apply type filter
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(tx => tx.transaction_type === this.filters.type);
        }

        // Apply date filter
        if (this.filters.date !== 'all') {
            const now = new Date();
            const startDate = this.getFilterStartDate(this.filters.date, now);

            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.transaction_date);
                return txDate >= startDate;
            });
        }

        // Store filtered results
        this.filteredTransactions = filtered;

        // Render filtered transactions
        if (filtered.length === 0) {
            this.showNoResultsMessage();
        } else {
            this.renderTransactionsTable(filtered);
        }
    },

    /**
     * Get start date for date filter
     * @param {string} filterValue - Filter value (today, week, month, year)
     * @param {Date} now - Current date
     * @returns {Date}
     */
    getFilterStartDate(filterValue, now) {
        const date = new Date(now);

        switch (filterValue) {
            case 'today':
                date.setHours(0, 0, 0, 0);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setDate(date.getDate() - 30);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - 1);
                break;
        }

        return date;
    },

    /**
     * Clear all filters
     */
    clearFilters() {
        // Reset filter values
        this.filters = {
            search: '',
            type: 'all',
            date: 'all'
        };

        // Reset filter inputs
        const transactionSearchInput = document.getElementById('transaction-search');
        if (transactionSearchInput) transactionSearchInput.value = '';

        const typeFilter = document.getElementById('transaction-type-filter');
        if (typeFilter) typeFilter.value = 'all';

        const dateFilter = document.getElementById('transaction-date-filter');
        if (dateFilter) dateFilter.value = 'all';

        // Apply filters (will show all transactions)
        this.applyFilters();

        // Hide clear button
        this.updateClearButtonVisibility();
    },

    /**
     * Update visibility of clear filters button
     */
    updateClearButtonVisibility() {
        const clearBtn = document.getElementById('clear-filters');
        if (!clearBtn) return;

        const hasActiveFilters = this.filters.search !== '' ||
                                 this.filters.type !== 'all' ||
                                 this.filters.date !== 'all';

        clearBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    },

    /**
     * Show no results message
     */
    showNoResultsMessage() {
        const tbody = document.getElementById('transactions-table-body');

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No transactions found</div>
                        <div style="font-size: 14px;">Try adjusting your filters to see more results</div>
                    </td>
                </tr>
            `;
        }
    }
};
