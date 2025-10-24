/**
 * Folyo - Debug Utility
 * Centralized debug logging that can be toggled for production
 */

const Debug = {
    // Set to false in production to disable all debug logs
    enabled: true,

    /**
     * Log message (only in debug mode)
     * @param {...any} args Arguments to log
     */
    log(...args) {
        if (this.enabled) {
            console.log(...args);
        }
    },

    /**
     * Log info message (only in debug mode)
     * @param {...any} args Arguments to log
     */
    info(...args) {
        if (this.enabled) {
            console.info(...args);
        }
    },

    /**
     * Log warning (always shown)
     * @param {...any} args Arguments to log
     */
    warn(...args) {
        console.warn(...args);
    },

    /**
     * Log error (always shown)
     * @param {...any} args Arguments to log
     */
    error(...args) {
        console.error(...args);
    },

    /**
     * Enable debug mode
     */
    enable() {
        this.enabled = true;
        console.log('🐛 Debug mode enabled');
    },

    /**
     * Disable debug mode
     */
    disable() {
        this.enabled = false;
        console.log('🔇 Debug mode disabled');
    }
};

// Auto-detect production environment
// Production detection: check for common production indicators
if (window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    !window.location.hostname.endsWith('.test') &&
    !window.location.hostname.endsWith('.local')) {
    Debug.enabled = false;
}

// Allow manual override via localStorage
if (localStorage.getItem('debug_mode') === 'true') {
    Debug.enabled = true;
} else if (localStorage.getItem('debug_mode') === 'false') {
    Debug.enabled = false;
}

// Expose to window for manual control in console
window.Debug = Debug;
