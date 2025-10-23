<?php
/**
 * Folyo - Authentication API
 * Endpoints: POST /api/auth.php?action=register|login|logout|status
 */

require_once 'database.php';
require_once 'response.php';
require_once 'session.php';

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
        sendError('Invalid email format', 400);
    }

    // Validate password length
    if (strlen($password) < 6) {
        sendError('Password must be at least 6 characters', 400);
    }

    // Check if email already exists
    $existingUser = queryOne('SELECT id FROM users WHERE email = ?', [$email]);
    if ($existingUser) {
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
        ]
    ], 201);
}

/**
 * Handle user login
 * POST /api/auth.php?action=login
 * Body: { "email": "user@example.com", "password": "password123" }
 */
function handleLogin() {
    requireMethod('POST');

    $data = getJsonInput();

    // Validate required fields
    $errors = validateRequired($data, ['email', 'password']);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }

    $email = sanitizeEmail($data['email']);
    $password = $data['password'];

    // Find user by email
    $user = queryOne('SELECT id, email, password FROM users WHERE email = ?', [$email]);

    if (!$user) {
        sendError('Invalid email or password', 401);
    }

    // Verify password
    if (!password_verify($password, $user['password'])) {
        sendError('Invalid email or password', 401);
    }

    // Login user
    loginUser($user['id'], $user['email']);

    sendSuccess([
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ]
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

        sendSuccess([
            'authenticated' => true,
            'user' => getCurrentUser()
        ]);
    } else {
        sendSuccess([
            'authenticated' => false,
            'user' => null
        ]);
    }
}
