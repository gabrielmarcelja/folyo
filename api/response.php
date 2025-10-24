<?php
/**
 * Folyo - API Response Helpers
 * Helper functions for standardized JSON responses
 */

/**
 * Send JSON success response
 * @param mixed $data Response data
 * @param int $statusCode HTTP status code (default: 200)
 */
function sendSuccess($data = null, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    exit;
}

/**
 * Send JSON error response
 * @param string $message Error message
 * @param int $statusCode HTTP status code (default: 400)
 * @param array $errors Additional error details
 */
function sendError($message, $statusCode = 400, $errors = []) {
    http_response_code($statusCode);
    header('Content-Type: application/json');

    $response = [
        'success' => false,
        'error' => $message
    ];

    if (!empty($errors)) {
        $response['errors'] = $errors;
    }

    echo json_encode($response);
    exit;
}

/**
 * Validate required fields in request data
 * @param array $data Request data
 * @param array $requiredFields List of required field names
 * @return array Errors (empty if valid)
 */
function validateRequired($data, $requiredFields) {
    $errors = [];

    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            $errors[$field] = "Field '$field' is required";
        }
    }

    return $errors;
}

/**
 * Validate email format
 * @param string $email Email address
 * @return bool True if valid
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Get JSON request body
 * @return array Decoded JSON data
 */
function getJsonInput() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON in request body', 400);
    }

    return $data ?? [];
}

/**
 * Get request method
 * @return string HTTP method (GET, POST, PUT, DELETE, etc)
 */
function getRequestMethod() {
    return $_SERVER['REQUEST_METHOD'];
}

/**
 * Check if request method matches
 * @param string $method Expected method
 * @param bool $sendError Whether to send error response (default: true)
 * @return bool True if matches
 */
function requireMethod($method, $sendError = true) {
    $currentMethod = getRequestMethod();

    if ($currentMethod !== strtoupper($method)) {
        if ($sendError) {
            sendError("Method $currentMethod not allowed. Expected $method.", 405);
        }
        return false;
    }

    return true;
}

/**
 * Enable CORS for API requests
 */
function enableCORS() {
    // Allow from any origin
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
    }

    // Access-Control headers are received during OPTIONS requests
    if (getRequestMethod() === 'OPTIONS') {
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        }

        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
        }

        exit(0);
    }
}

/**
 * Sanitize string input
 * @param string $input Input string
 * @return string Sanitized string
 */
function sanitizeString($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize email input
 * @param string $email Email address
 * @return string Sanitized email
 */
function sanitizeEmail($email) {
    return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
}

/**
 * Validate password strength
 * @param string $password Password to validate
 * @return array ['valid' => bool, 'message' => string, 'errors' => array]
 */
function validatePasswordStrength($password) {
    $errors = [];
    $minLength = 8;
    $maxLength = 128;

    // Check length
    $length = strlen($password);
    if ($length < $minLength) {
        $errors[] = "Password must be at least {$minLength} characters long";
    }
    if ($length > $maxLength) {
        $errors[] = "Password must not exceed {$maxLength} characters";
    }

    // Check for at least one lowercase letter
    if (!preg_match('/[a-z]/', $password)) {
        $errors[] = "Password must contain at least one lowercase letter";
    }

    // Check for at least one uppercase letter
    if (!preg_match('/[A-Z]/', $password)) {
        $errors[] = "Password must contain at least one uppercase letter";
    }

    // Check for at least one number
    if (!preg_match('/[0-9]/', $password)) {
        $errors[] = "Password must contain at least one number";
    }

    // Check for at least one special character
    if (!preg_match('/[^a-zA-Z0-9]/', $password)) {
        $errors[] = "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)";
    }

    // Check for common weak passwords
    $commonPasswords = [
        'password', 'password123', '12345678', 'qwerty123', 'abc123456',
        'password1', 'Password1', 'Password123', 'Admin123', 'Welcome1'
    ];

    $lowerPassword = strtolower($password);
    foreach ($commonPasswords as $common) {
        if (strtolower($common) === $lowerPassword) {
            $errors[] = "This password is too common and easily guessable";
            break;
        }
    }

    // Check for repeated characters (3+ same characters in a row)
    if (preg_match('/(.)\1{2,}/', $password)) {
        $errors[] = "Password should not contain 3 or more repeated characters in a row";
    }

    if (empty($errors)) {
        return [
            'valid' => true,
            'message' => 'Password is strong',
            'errors' => []
        ];
    }

    return [
        'valid' => false,
        'message' => 'Password does not meet strength requirements',
        'errors' => $errors
    ];
}
