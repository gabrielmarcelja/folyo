/**
 * Folyo - Error Handler
 * Centralized error handling and recovery
 */

const ErrorHandler = {
    /**
     * Initialize global error handlers
     */
    init() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, event.message, event.filename, event.lineno, event.colno);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
            event.preventDefault(); // Prevent default browser error logging
        });

        Debug.log('✅ Error Handler initialized');
    },

    /**
     * Handle global uncaught errors
     */
    handleGlobalError(error, message, filename, lineno, colno) {
        Debug.error('Global Error:', {
            message,
            filename,
            lineno,
            colno,
            error
        });

        // Show user-friendly error message
        this.showUserError('An unexpected error occurred. Please refresh the page and try again.');

        // Log error for debugging (in production, this could send to a logging service)
        this.logError('GlobalError', error, { message, filename, lineno, colno });
    },

    /**
     * Handle unhandled promise rejections
     */
    handlePromiseRejection(reason) {
        Debug.error('Unhandled Promise Rejection:', reason);

        // Determine if this is a network error
        if (this.isNetworkError(reason)) {
            this.showUserError('Network error. Please check your internet connection and try again.');
        } else {
            this.showUserError('An unexpected error occurred. Please try again.');
        }

        // Log error for debugging
        this.logError('PromiseRejection', reason);
    },

    /**
     * Handle API errors with retry logic
     * @param {Function} apiCall - Function that makes the API call
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @param {number} delay - Delay between retries in ms (default: 1000)
     * @returns {Promise}
     */
    async withRetry(apiCall, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error;
                Debug.warn(`API call failed (attempt ${attempt}/${maxRetries}):`, error.message);

                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }

                // Don't retry if this is the last attempt
                if (attempt === maxRetries) {
                    break;
                }

                // Wait before retrying (exponential backoff)
                await this.sleep(delay * attempt);
            }
        }

        // All retries failed
        Debug.error(`API call failed after ${maxRetries} attempts:`, lastError);
        throw lastError;
    },

    /**
     * Wrap async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} errorMessage - User-friendly error message
     * @returns {Function}
     */
    wrapAsync(fn, errorMessage = 'An error occurred') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                Debug.error(errorMessage, error);
                this.showUserError(errorMessage);
                this.logError('WrappedAsyncError', error, { errorMessage });
                throw error;
            }
        };
    },

    /**
     * Handle API errors and show user-friendly messages
     * @param {Error} error - Error object
     * @param {string} defaultMessage - Default message if error message is not available
     */
    handleApiError(error, defaultMessage = 'An error occurred') {
        let userMessage = defaultMessage;

        // Extract message from error
        if (error.message) {
            userMessage = error.message;
        }

        // Handle specific error types
        if (this.isNetworkError(error)) {
            userMessage = 'Network error. Please check your internet connection.';
        } else if (this.isAuthError(error)) {
            userMessage = 'Session expired. Please log in again.';
            // Redirect to login after a delay
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        } else if (this.isServerError(error)) {
            userMessage = 'Server error. Please try again later.';
        }

        this.showUserError(userMessage);
        this.logError('ApiError', error, { defaultMessage });
    },

    /**
     * Check if error is a network error
     * @param {Error} error
     * @returns {boolean}
     */
    isNetworkError(error) {
        return error instanceof TypeError && error.message === 'Failed to fetch' ||
               error.message?.includes('network') ||
               error.message?.includes('offline');
    },

    /**
     * Check if error is an authentication error
     * @param {Error} error
     * @returns {boolean}
     */
    isAuthError(error) {
        return error.status === 401 || error.status === 403;
    },

    /**
     * Check if error is a server error
     * @param {Error} error
     * @returns {boolean}
     */
    isServerError(error) {
        return error.status && error.status >= 500;
    },

    /**
     * Show user-friendly error message
     * @param {string} message
     */
    showUserError(message) {
        // Use existing AuthManager showMessage if available
        if (typeof AuthManager !== 'undefined' && AuthManager.showMessage) {
            AuthManager.showMessage(message, 'error');
        } else {
            // Fallback to alert
            alert(message);
        }
    },

    /**
     * Log error for debugging/reporting
     * @param {string} type - Error type
     * @param {Error} error - Error object
     * @param {object} context - Additional context
     */
    logError(type, error, context = {}) {
        const errorLog = {
            type,
            message: error?.message || String(error),
            stack: error?.stack,
            context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        Debug.error('Error Log:', errorLog);

        // In production, you could send this to a logging service
        // Example: sendToLoggingService(errorLog);
    },

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Validate required fields in an object
     * @param {object} data - Object to validate
     * @param {array} requiredFields - Array of required field names
     * @throws {Error} If validation fails
     */
    validateRequired(data, requiredFields) {
        const missing = requiredFields.filter(field => !data[field]);

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    },

    /**
     * Safe JSON parse with error handling
     * @param {string} jsonString - JSON string to parse
     * @param {*} defaultValue - Default value if parsing fails
     * @returns {*}
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            Debug.warn('JSON parse error:', error);
            return defaultValue;
        }
    },

    /**
     * Safe localStorage getItem with error handling
     * @param {string} key - localStorage key
     * @param {*} defaultValue - Default value if key doesn't exist or error occurs
     * @returns {*}
     */
    safeLocalStorageGet(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (error) {
            Debug.warn('localStorage get error:', error);
            return defaultValue;
        }
    },

    /**
     * Safe localStorage setItem with error handling
     * @param {string} key - localStorage key
     * @param {*} value - Value to store
     * @returns {boolean} Success status
     */
    safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            Debug.warn('localStorage set error:', error);
            return false;
        }
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ErrorHandler.init());
} else {
    ErrorHandler.init();
}

// Expose to window
window.ErrorHandler = ErrorHandler;
