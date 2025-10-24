<?php
/**
 * Folyo - Session Management
 * Handles user sessions and authentication state
 */

// Configure session cookies for security and persistence
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', 1);

// Set session cookie lifetime to 30 days (2592000 seconds)
// This keeps users logged in even after closing the browser
ini_set('session.cookie_lifetime', 2592000);
ini_set('session.gc_maxlifetime', 2592000);

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
    // Preserve CSRF token before regenerating session
    $csrfToken = $_SESSION['csrf_token'] ?? null;

    // Regenerate session ID for security
    // Use FALSE to keep old session file for a grace period (prevents race conditions)
    session_regenerate_id(false);

    $_SESSION['user_id'] = $userId;
    $_SESSION['user_email'] = $email;
    $_SESSION['login_time'] = time();

    // Restore CSRF token
    if ($csrfToken) {
        $_SESSION['csrf_token'] = $csrfToken;
    } else {
        // Generate new token if none existed
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    // Update session cookie to ensure it persists for 30 days
    $sessionName = session_name();
    $sessionId = session_id();
    setcookie(
        $sessionName,
        $sessionId,
        [
            'expires' => time() + 2592000, // 30 days
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]
    );
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

/**
 * Generate CSRF token
 * @return string CSRF token
 */
function generateCsrfToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Get current CSRF token
 * @return string|null CSRF token or null if not set
 */
function getCsrfToken() {
    return $_SESSION['csrf_token'] ?? null;
}

/**
 * Validate CSRF token
 * @param string $token Token to validate
 * @return bool True if valid
 */
function validateCsrfToken($token) {
    if (!isset($_SESSION['csrf_token'])) {
        return false;
    }

    // Use hash_equals to prevent timing attacks (trim both sides to be safe)
    return hash_equals(trim($_SESSION['csrf_token']), trim($token));
}

/**
 * Require valid CSRF token (send error if invalid)
 * @param bool $sendError Whether to send error response (default: true)
 * @return bool True if token is valid
 */
function requireCsrfToken($sendError = true) {
    // Get token from header or POST data
    $token = null;

    // Check X-CSRF-Token header first (case-insensitive search)
    $headers = getallheaders();
    if ($headers) {
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'x-csrf-token') {
                $token = trim($value);  // Trim whitespace
                break;
            }
        }
    }

    // Fallback to POST data
    if (!$token && isset($_POST['csrf_token'])) {
        $token = trim($_POST['csrf_token']);  // Trim whitespace
    }

    // Fallback to JSON body
    if (!$token) {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (isset($data['csrf_token'])) {
            $token = trim($data['csrf_token']);  // Trim whitespace
        }
    }

    if (!$token || !validateCsrfToken($token)) {
        if ($sendError) {
            require_once 'response.php';
            sendError('Invalid or missing CSRF token. Please refresh the page.', 403);
        }
        return false;
    }

    return true;
}
