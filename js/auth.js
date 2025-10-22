/**
 * Folyo - Authentication Modal Manager
 * Handles login and signup modal functionality
 */

const AuthModal = {
    loginModal: null,
    signupModal: null,

    /**
     * Initialize auth modals
     */
    init() {
        // Get modal elements
        this.loginModal = document.getElementById('login-modal');
        this.signupModal = document.getElementById('signup-modal');

        // Setup event listeners
        this.setupEventListeners();

        console.log('Auth modals initialized');
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Login button
        const loginBtn = document.querySelector('.btn-login');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.openLogin());
        }

        // Signup button
        const signupBtn = document.querySelector('.btn-signup');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.openSignup());
        }

        // Close buttons
        const closeButtons = document.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal);
            });
        });

        // Click outside to close
        this.loginModal.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.closeModal(this.loginModal);
            }
        });

        this.signupModal.addEventListener('click', (e) => {
            if (e.target === this.signupModal) {
                this.closeModal(this.signupModal);
            }
        });

        // Switch between login and signup
        document.getElementById('switch-to-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal(this.loginModal);
            this.openSignup();
        });

        document.getElementById('switch-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal(this.signupModal);
            this.openLogin();
        });

        // Form submissions
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e);
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup(e);
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.loginModal.classList.contains('active')) {
                    this.closeModal(this.loginModal);
                }
                if (this.signupModal.classList.contains('active')) {
                    this.closeModal(this.signupModal);
                }
            }
        });
    },

    /**
     * Open login modal
     */
    openLogin() {
        this.openModal(this.loginModal);
        // Focus on email input
        setTimeout(() => {
            document.getElementById('login-email').focus();
        }, 100);
    },

    /**
     * Open signup modal
     */
    openSignup() {
        this.openModal(this.signupModal);
        // Focus on email input
        setTimeout(() => {
            document.getElementById('signup-email').focus();
        }, 100);
    },

    /**
     * Open a modal
     * @param {HTMLElement} modal
     */
    openModal(modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    },

    /**
     * Close a modal
     * @param {HTMLElement} modal
     */
    closeModal(modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        // Reset forms
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    },

    /**
     * Handle login form submission
     * @param {Event} e
     */
    handleLogin(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        console.log('Login attempt:', { email, password: '***' });

        // TODO: Add backend integration here
        alert('Login functionality will be implemented with backend');

        // For now, just close the modal
        // this.closeModal(this.loginModal);
    },

    /**
     * Handle signup form submission
     * @param {Event} e
     */
    handleSignup(e) {
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const passwordConfirm = formData.get('password-confirm');

        // Validate password match
        if (password !== passwordConfirm) {
            alert('Passwords do not match!');
            return;
        }

        console.log('Signup attempt:', { email, password: '***' });

        // TODO: Add backend integration here
        alert('Signup functionality will be implemented with backend');

        // For now, just close the modal
        // this.closeModal(this.signupModal);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AuthModal.init();
});
