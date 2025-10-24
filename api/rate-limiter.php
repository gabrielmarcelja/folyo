<?php
/**
 * Folyo - Rate Limiter
 * File-based rate limiting to prevent brute force attacks
 */

/**
 * Check rate limit for an identifier (IP or user)
 * @param string $identifier Identifier (IP address, email, etc)
 * @param int $maxAttempts Maximum attempts allowed
 * @param int $windowSeconds Time window in seconds
 * @param string $action Action being rate limited (login, register, etc)
 * @return array ['allowed' => bool, 'remaining' => int, 'reset_at' => int]
 */
function checkRateLimit($identifier, $maxAttempts = 5, $windowSeconds = 300, $action = 'default') {
    $rateLimitDir = __DIR__ . '/../cache/rate-limits';
    if (!is_dir($rateLimitDir)) {
        mkdir($rateLimitDir, 0755, true);
    }

    // Create safe filename
    $filename = $rateLimitDir . '/' . md5($action . '_' . $identifier) . '.json';

    $now = time();
    $data = ['attempts' => [], 'blocked_until' => 0];

    // Load existing data
    if (file_exists($filename)) {
        $content = file_get_contents($filename);
        $data = json_decode($content, true) ?: $data;
    }

    // Check if currently blocked
    if ($data['blocked_until'] > $now) {
        return [
            'allowed' => false,
            'remaining' => 0,
            'reset_at' => $data['blocked_until'],
            'retry_after' => $data['blocked_until'] - $now
        ];
    }

    // Remove attempts outside the time window
    $data['attempts'] = array_filter($data['attempts'], function($timestamp) use ($now, $windowSeconds) {
        return $timestamp > ($now - $windowSeconds);
    });

    // Check if limit exceeded
    $attemptCount = count($data['attempts']);

    if ($attemptCount >= $maxAttempts) {
        // Block for progressively longer periods based on violations
        $blockDuration = $windowSeconds * (1 + floor($attemptCount / $maxAttempts));
        $data['blocked_until'] = $now + $blockDuration;

        file_put_contents($filename, json_encode($data));

        return [
            'allowed' => false,
            'remaining' => 0,
            'reset_at' => $data['blocked_until'],
            'retry_after' => $blockDuration
        ];
    }

    return [
        'allowed' => true,
        'remaining' => $maxAttempts - $attemptCount,
        'reset_at' => $now + $windowSeconds
    ];
}

/**
 * Record an attempt
 * @param string $identifier Identifier (IP address, email, etc)
 * @param string $action Action being rate limited
 */
function recordAttempt($identifier, $action = 'default') {
    $rateLimitDir = __DIR__ . '/../cache/rate-limits';
    if (!is_dir($rateLimitDir)) {
        mkdir($rateLimitDir, 0755, true);
    }

    $filename = $rateLimitDir . '/' . md5($action . '_' . $identifier) . '.json';
    $now = time();

    $data = ['attempts' => [], 'blocked_until' => 0];

    if (file_exists($filename)) {
        $content = file_get_contents($filename);
        $data = json_decode($content, true) ?: $data;
    }

    $data['attempts'][] = $now;

    file_put_contents($filename, json_encode($data));
}

/**
 * Clear rate limit for an identifier (e.g., after successful login)
 * @param string $identifier Identifier
 * @param string $action Action being rate limited
 */
function clearRateLimit($identifier, $action = 'default') {
    $rateLimitDir = __DIR__ . '/../cache/rate-limits';
    $filename = $rateLimitDir . '/' . md5($action . '_' . $identifier) . '.json';

    if (file_exists($filename)) {
        @unlink($filename);
    }
}

/**
 * Get client IP address
 * @return string IP address
 */
function getClientIP() {
    // Check for proxy headers
    $headers = [
        'HTTP_CF_CONNECTING_IP', // Cloudflare
        'HTTP_X_FORWARDED_FOR',  // Standard proxy
        'HTTP_X_REAL_IP',        // Nginx
        'REMOTE_ADDR'            // Direct connection
    ];

    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = $_SERVER[$header];

            // Handle comma-separated IPs (X-Forwarded-For can have multiple)
            if (strpos($ip, ',') !== false) {
                $ips = explode(',', $ip);
                $ip = trim($ips[0]);
            }

            // Validate IP
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }

    return '0.0.0.0';
}

/**
 * Require rate limit check (send error if limit exceeded)
 * @param string $identifier Identifier to check
 * @param int $maxAttempts Maximum attempts
 * @param int $windowSeconds Time window
 * @param string $action Action name
 * @return bool True if allowed
 */
function requireRateLimit($identifier, $maxAttempts = 5, $windowSeconds = 300, $action = 'default') {
    $result = checkRateLimit($identifier, $maxAttempts, $windowSeconds, $action);

    if (!$result['allowed']) {
        require_once 'response.php';

        $retryAfter = $result['retry_after'] ?? $windowSeconds;
        $minutes = ceil($retryAfter / 60);

        sendError(
            "Too many attempts. Please try again in {$minutes} minute(s).",
            429,
            [
                'retry_after' => $retryAfter,
                'reset_at' => $result['reset_at']
            ]
        );
    }

    return true;
}
