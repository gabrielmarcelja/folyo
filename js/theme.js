/**
 * Folyo - Theme Manager
 */

const ThemeManager = {
    currentTheme: 'light',

    /**
     * Initialize theme
     */
    init() {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
        if (savedTheme) {
            this.setTheme(savedTheme, false);
        } else {
            // Check user's system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light', false);
        }

        // Add event listener to toggle button
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(CONFIG.STORAGE_KEYS.THEME)) {
                this.setTheme(e.matches ? 'dark' : 'light', false);
            }
        });
    },

    /**
     * Set theme
     * @param {string} theme - 'light' or 'dark'
     * @param {boolean} save - Save to localStorage
     */
    setTheme(theme, save = true) {
        this.currentTheme = theme;
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${theme}`);

        if (save) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
        }
    },

    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    /**
     * Get current theme
     * @returns {string}
     */
    getTheme() {
        return this.currentTheme;
    }
};
