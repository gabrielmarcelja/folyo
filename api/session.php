<?php
/**
 * Folyo - Session Management
 * Handles user sessions and authentication state
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Check if user is logged in
 * @return bool True if logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && isset($_SESSION['user_email']);
}

/**
 * Get current user ID
 * @return int|null User ID or null if not logged in
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Get current user email
 * @return string|null User email or null if not logged in
 */
function getCurrentUserEmail() {
    return $_SESSION['user_email'] ?? null;
}

/**
 * Get current user data
 * @return array|null User data or null if not logged in
 */
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }

    return [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email']
    ];
}

/**
 * Login user (create session)
 * @param int $userId User ID
 * @param string $email User email
 */
function loginUser($userId, $email) {
    // Regenerate session ID for security
    session_regenerate_id(true);

    $_SESSION['user_id'] = $userId;
    $_SESSION['user_email'] = $email;
    $_SESSION['login_time'] = time();
}

/**
 * Logout user (destroy session)
 */
function logoutUser() {
    // Unset all session variables
    $_SESSION = [];

    // Destroy the session cookie
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }

    // Destroy the session
    session_destroy();
}

/**
 * Require authentication (send error if not logged in)
 * @param bool $sendError Whether to send error response (default: true)
 * @return bool True if authenticated
 */
function requireAuth($sendError = true) {
    if (!isLoggedIn()) {
        if ($sendError) {
            require_once 'response.php';
            sendError('Authentication required. Please login.', 401);
        }
        return false;
    }

    return true;
}

/**
 * Check session timeout (30 minutes of inactivity)
 * @return bool True if session is valid
 */
function checkSessionTimeout() {
    $timeout = 1800; // 30 minutes in seconds

    if (isset($_SESSION['last_activity'])) {
        $elapsed = time() - $_SESSION['last_activity'];

        if ($elapsed > $timeout) {
            logoutUser();
            return false;
        }
    }

    $_SESSION['last_activity'] = time();
    return true;
}
