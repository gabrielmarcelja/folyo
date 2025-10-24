/**
 * Folyo - Authentication Initialization
 * Initialize AuthManager when DOM is ready
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
    Debug.log('✅ Authentication system initialized');
});
