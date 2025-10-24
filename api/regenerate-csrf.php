<?php
/**
 * Regenerate CSRF Token (Emergency Fix)
 * Use this endpoint to regenerate a new CSRF token
 */

require_once 'session.php';
require_once 'response.php';

startSession();

// Force regenerate CSRF token
unset($_SESSION['csrf_token']);
$newToken = generateCsrfToken();

sendSuccess([
    'message' => 'CSRF token regenerated successfully',
    'csrf_token' => $newToken
]);
