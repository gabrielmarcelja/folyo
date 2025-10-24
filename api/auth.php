<?php
/**
 * Folyo - Authentication API
 * Endpoints: POST /api/auth.php?action=register|login|logout|status
 */

require_once 'database.php';
require_once 'response.php';
require_once 'session.php';
require_once 'rate-limiter.php';

enableCORS();

// Get action from query parameter
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'register':
            handleRegister();
            break;

        case 'login':
            handleLogin();
            break;

        case 'logout':
            handleLogout();
            break;

        case 'status':
            handleStatus();
            break;

        default:
            sendError('Invalid action. Use: register, login, logout, or status', 400);
    }
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}

/**
 * Handle user registration
 * POST /api/auth.php?action=register
 * Body: { "email": "user@example.com", "password": "password123" }
 */
function handleRegister() {
    requireMethod('POST');

    // Rate limiting: 5 attempts per 15 minutes per IP
    $clientIP = getClientIP();
    requireRateLimit($clientIP, 5, 900, 'register');

    $data = getJsonInput();

    // Validate required fields
    $errors = validateRequired($data, ['email', 'password']);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }

    $email = sanitizeEmail($data['email']);
    $password = $data['password'];

    // Validate email format
    if (!validateEmail($email)) {
        recordAttempt($clientIP, 'register');
        sendError('Invalid email format', 400);
    }

    // Validate password strength
    $passwordValidation = validatePasswordStrength($password);
    if (!$passwordValidation['valid']) {
        recordAttempt($clientIP, 'register');
        sendError($passwordValidation['message'], 400, ['password_errors' => $passwordValidation['errors']]);
    }

    // Check if email already exists
    $existingUser = queryOne('SELECT id FROM users WHERE email = ?', [$email]);
    if ($existingUser) {
        recordAttempt($clientIP, 'register');
        sendError('Email already registered', 409);
    }

    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Insert user
    $sql = 'INSERT INTO users (email, password) VALUES (?, ?)';
    execute($sql, [$email, $hashedPassword]);

    $userId = lastInsertId();

    // Login user automatically
    loginUser($userId, $email);

    sendSuccess([
        'message' => 'Registration successful',
        'user' => [
            'id' => $userId,
            'email' => $email
        ],
        'csrf_token' => generateCsrfToken()
    ], 201);
}

/**
 * Handle user login
 * POST /api/auth.php?action=login
 * Body: { "email": "user@example.com", "password": "password123" }
 */
function handleLogin() {
    requireMethod('POST');

    // Rate limiting: 5 attempts per 5 minutes per IP
    $clientIP = getClientIP();
    requireRateLimit($clientIP, 5, 300, 'login_ip');

    $data = getJsonInput();

    // Validate required fields
    $errors = validateRequired($data, ['email', 'password']);
    if (!empty($errors)) {
        recordAttempt($clientIP, 'login_ip');
        sendError('Validation failed', 400, $errors);
    }

    $email = sanitizeEmail($data['email']);
    $password = $data['password'];

    // Additional rate limiting per email to prevent distributed attacks
    requireRateLimit($email, 5, 300, 'login_email');

    // Find user by email
    $user = queryOne('SELECT id, email, password FROM users WHERE email = ?', [$email]);

    if (!$user) {
        recordAttempt($clientIP, 'login_ip');
        recordAttempt($email, 'login_email');
        sendError('Invalid email or password', 401);
    }

    // Verify password
    if (!password_verify($password, $user['password'])) {
        recordAttempt($clientIP, 'login_ip');
        recordAttempt($email, 'login_email');
        sendError('Invalid email or password', 401);
    }

    // Successful login - clear rate limits
    clearRateLimit($clientIP, 'login_ip');
    clearRateLimit($email, 'login_email');

    // Login user
    loginUser($user['id'], $user['email']);

    sendSuccess([
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ],
        'csrf_token' => generateCsrfToken()
    ]);
}

/**
 * Handle user logout
 * POST /api/auth.php?action=logout
 */
function handleLogout() {
    requireMethod('POST');

    // Logout user
    logoutUser();

    sendSuccess([
        'message' => 'Logout successful'
    ]);
}

/**
 * Get current authentication status
 * GET /api/auth.php?action=status
 */
function handleStatus() {
    requireMethod('GET');

    if (isLoggedIn()) {
        checkSessionTimeout();

        // Ensure CSRF token exists for authenticated users
        $csrfToken = generateCsrfToken();

        sendSuccess([
            'authenticated' => true,
            'user' => getCurrentUser(),
            'csrf_token' => $csrfToken
        ]);
    } else {
        sendSuccess([
            'authenticated' => false,
            'user' => null,
            'csrf_token' => generateCsrfToken()
        ]);
    }
}
