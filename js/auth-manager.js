/**
 * Folyo - Authentication Manager
 * Manages user authentication state and UI updates
 */

const AuthManager = {
    currentUser: null,
    isAuthenticated: false,
    loginModal: null,
    signupModal: null,

    /**
     * Initialize authentication manager
     */
    async init() {
        this.setupModals();
        this.setupEventListeners();
        await this.checkAuthStatus();
    },

    /**
     * Setup modal references
     */
    setupModals() {
        this.loginModal = document.getElementById('login-modal');
        this.signupModal = document.getElementById('signup-modal');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Login buttons
        document.querySelectorAll('.btn-login, .mobile-btn-login').forEach(btn => {
            btn.addEventListener('click', () => this.showLoginModal());
        });

        // Signup buttons
        document.querySelectorAll('.btn-signup, .mobile-btn-signup').forEach(btn => {
            btn.addEventListener('click', () => this.showSignupModal());
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal);
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        // Switch between login/signup
        const showSignupLink = document.getElementById('show-signup');
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(this.loginModal);
                this.showSignupModal();
            });
        }

        const showLoginLink = document.getElementById('show-login');
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(this.signupModal);
                this.showLoginModal();
            });
        }
    },

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const data = await APIClient.getAuthStatus();

            if (data.authenticated) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.updateUIForAuthenticatedUser();
            } else {
                this.isAuthenticated = false;
                this.currentUser = null;
                this.updateUIForGuestUser();
            }

            return this.isAuthenticated;
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
            this.updateUIForGuestUser();
            return false;
        }
    },

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        // Clear previous errors
        if (errorDiv) errorDiv.style.display = 'none';

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        try {
            const data = await APIClient.login(email, password);

            // Login successful
            this.isAuthenticated = true;
            this.currentUser = data.user;

            // Close modal
            this.closeModal(this.loginModal);

            // Reset form
            e.target.reset();

            // Update UI
            this.updateUIForAuthenticatedUser();

            // Show success message
            this.showMessage('Login successful! Welcome back.', 'success');

            // Redirect to portfolio if on home page
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                setTimeout(() => {
                    window.location.href = '/portfolio/';
                }, 1000);
            } else {
                // Reload page to load authenticated content
                window.location.reload();
            }

        } catch (error) {
            console.error('Login error:', error);

            if (errorDiv) {
                errorDiv.textContent = error.message || 'Invalid email or password';
                errorDiv.style.display = 'block';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    },

    /**
     * Handle signup form submission
     */
    async handleSignup(e) {
        e.preventDefault();

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const errorDiv = document.getElementById('signup-error');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        // Clear previous errors
        if (errorDiv) errorDiv.style.display = 'none';

        // Validate passwords match
        if (password !== confirmPassword) {
            if (errorDiv) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
            }
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        try {
            const data = await APIClient.register(email, password);

            // Registration successful
            this.isAuthenticated = true;
            this.currentUser = data.user;

            // Close modal
            this.closeModal(this.signupModal);

            // Reset form
            e.target.reset();

            // Update UI
            this.updateUIForAuthenticatedUser();

            // Show success message
            this.showMessage('Account created successfully! Welcome to Folyo.', 'success');

            // Redirect to portfolio
            setTimeout(() => {
                window.location.href = '/portfolio/';
            }, 1500);

        } catch (error) {
            console.error('Signup error:', error);

            if (errorDiv) {
                errorDiv.textContent = error.message || 'Failed to create account';
                errorDiv.style.display = 'block';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await APIClient.logout();

            this.isAuthenticated = false;
            this.currentUser = null;

            // Show message
            this.showMessage('Logged out successfully', 'success');

            // Redirect to home
            window.location.href = '/';

        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Failed to logout', 'error');
        }
    },

    /**
     * Update UI for authenticated user
     */
    updateUIForAuthenticatedUser() {
        // Hide login/signup buttons
        document.querySelectorAll('.btn-login, .btn-signup, .mobile-btn-login, .mobile-btn-signup').forEach(btn => {
            btn.style.display = 'none';
        });

        // Show user profile
        document.querySelectorAll('.user-profile').forEach(profile => {
            profile.style.display = 'flex';

            // Update email if available
            const emailSpan = profile.querySelector('.user-email');
            if (emailSpan && this.currentUser) {
                emailSpan.textContent = this.currentUser.email;
            }
        });

        // Add logout functionality to user profile
        document.querySelectorAll('.user-profile').forEach(profile => {
            profile.style.cursor = 'pointer';
            profile.title = 'Click to logout';
            profile.addEventListener('click', () => {
                if (confirm('Do you want to logout?')) {
                    this.logout();
                }
            });
        });
    },

    /**
     * Update UI for guest user
     */
    updateUIForGuestUser() {
        // Show login/signup buttons
        document.querySelectorAll('.btn-login, .btn-signup, .mobile-btn-login, .mobile-btn-signup').forEach(btn => {
            btn.style.display = '';
        });

        // Hide user profile
        document.querySelectorAll('.user-profile').forEach(profile => {
            profile.style.display = 'none';
        });
    },

    /**
     * Show login modal
     */
    showLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.add('active');

            // Clear error
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) errorDiv.style.display = 'none';
        }
    },

    /**
     * Show signup modal
     */
    showSignupModal() {
        if (this.signupModal) {
            this.signupModal.classList.add('active');

            // Clear error
            const errorDiv = document.getElementById('signup-error');
            if (errorDiv) errorDiv.style.display = 'none';
        }
    },

    /**
     * Close modal
     */
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#16C784' : type === 'error' ? '#EA3943' : '#3B82F6'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
        `;

        document.body.appendChild(messageEl);

        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    },

    /**
     * Require authentication (redirect to home if not authenticated)
     */
    requireAuth() {
        if (!this.isAuthenticated) {
            this.showMessage('Please login to access this page', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            return false;
        }
        return true;
    }
};

// Add animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
