<?php
/**
 * Folyo - API Test Suite
 * Comprehensive test of all API endpoints
 */

// Test helper function
function testEndpoint($name, $url, $method = 'GET', $data = null, $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HEADER, true);

    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        $headers[] = 'Content-Type: application/json';
    }

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);
    $jsonData = json_decode($body, true);

    return [
        'name' => $name,
        'status_code' => $httpCode,
        'success' => $httpCode >= 200 && $httpCode < 300,
        'data' => $jsonData,
        'headers' => $headers
    ];
}

// Start tests
header('Content-Type: application/json');
$baseUrl = 'http://folyo.test/api';
$results = [];

try {
    // ========================================
    // TEST 1: Register new user
    // ========================================
    $testEmail = 'testapi_' . time() . '@folyo.com';
    $testPassword = 'test123456';

    $result = testEndpoint(
        'Register User',
        "$baseUrl/auth.php?action=register",
        'POST',
        ['email' => $testEmail, 'password' => $testPassword]
    );
    $results[] = $result;

    if (!$result['success']) {
        throw new Exception('Registration failed: ' . ($result['data']['error'] ?? 'Unknown error'));
    }

    // ========================================
    // TEST 2: Login
    // ========================================
    $result = testEndpoint(
        'Login',
        "$baseUrl/auth.php?action=login",
        'POST',
        ['email' => $testEmail, 'password' => $testPassword]
    );
    $results[] = $result;

    // Extract session cookie from login response
    preg_match('/Set-Cookie: PHPSESSID=([^;]+)/', $result['headers'], $matches);
    $sessionCookie = $matches[1] ?? null;

    if (!$sessionCookie) {
        throw new Exception('Failed to get session cookie');
    }

    $cookieHeader = "Cookie: PHPSESSID=$sessionCookie";

    // ========================================
    // TEST 3: Check auth status
    // ========================================
    $result = testEndpoint(
        'Auth Status',
        "$baseUrl/auth.php?action=status",
        'GET',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 4: Create portfolio
    // ========================================
    $result = testEndpoint(
        'Create Portfolio',
        "$baseUrl/portfolios.php",
        'POST',
        ['name' => 'Test Wallet', 'description' => 'My test wallet'],
        [$cookieHeader]
    );
    $results[] = $result;

    $portfolioId = $result['data']['data']['id'] ?? null;

    if (!$portfolioId) {
        throw new Exception('Failed to create portfolio');
    }

    // ========================================
    // TEST 5: List portfolios
    // ========================================
    $result = testEndpoint(
        'List Portfolios',
        "$baseUrl/portfolios.php",
        'GET',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 6: Get single portfolio
    // ========================================
    $result = testEndpoint(
        'Get Portfolio',
        "$baseUrl/portfolios.php?id=$portfolioId",
        'GET',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 7: Create transaction (buy BTC)
    // ========================================
    $result = testEndpoint(
        'Create Transaction (Buy BTC)',
        "$baseUrl/transactions.php",
        'POST',
        [
            'portfolio_id' => $portfolioId,
            'transaction_type' => 'buy',
            'crypto_id' => 1,
            'crypto_symbol' => 'BTC',
            'crypto_name' => 'Bitcoin',
            'quantity' => 0.5,
            'price_per_coin' => 50000,
            'total_amount' => 25010,
            'fee' => 10,
            'currency' => 'USD',
            'transaction_date' => '2024-01-15 10:30:00',
            'notes' => 'Test purchase'
        ],
        [$cookieHeader]
    );
    $results[] = $result;

    $transactionId = $result['data']['data']['id'] ?? null;

    // ========================================
    // TEST 8: Create another transaction (buy ETH)
    // ========================================
    $result = testEndpoint(
        'Create Transaction (Buy ETH)',
        "$baseUrl/transactions.php",
        'POST',
        [
            'portfolio_id' => $portfolioId,
            'transaction_type' => 'buy',
            'crypto_id' => 1027,
            'crypto_symbol' => 'ETH',
            'crypto_name' => 'Ethereum',
            'quantity' => 5.0,
            'price_per_coin' => 3000,
            'total_amount' => 15007.50,
            'fee' => 7.50,
            'currency' => 'USD',
            'transaction_date' => '2024-02-20 14:15:00'
        ],
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 9: List transactions
    // ========================================
    $result = testEndpoint(
        'List Transactions',
        "$baseUrl/transactions.php?portfolio_id=$portfolioId",
        'GET',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 10: Get holdings
    // ========================================
    $result = testEndpoint(
        'Get Holdings',
        "$baseUrl/holdings.php?portfolio_id=$portfolioId",
        'GET',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 11: Get portfolio overview
    // ========================================
    $result = testEndpoint(
        'Get Portfolio Overview',
        "$baseUrl/holdings.php?portfolio_id=$portfolioId&overview",
        'GET',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 12: Update transaction
    // ========================================
    if ($transactionId) {
        $result = testEndpoint(
            'Update Transaction',
            "$baseUrl/transactions.php?id=$transactionId",
            'PUT',
            ['notes' => 'Updated notes for test'],
            [$cookieHeader]
        );
        $results[] = $result;
    }

    // ========================================
    // TEST 13: Delete transaction
    // ========================================
    if ($transactionId) {
        $result = testEndpoint(
            'Delete Transaction',
            "$baseUrl/transactions.php?id=$transactionId",
            'DELETE',
            null,
            [$cookieHeader]
        );
        $results[] = $result;
    }

    // ========================================
    // TEST 14: Update portfolio
    // ========================================
    $result = testEndpoint(
        'Update Portfolio',
        "$baseUrl/portfolios.php?id=$portfolioId",
        'PUT',
        ['name' => 'Test Wallet Updated'],
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 15: Delete portfolio
    // ========================================
    $result = testEndpoint(
        'Delete Portfolio',
        "$baseUrl/portfolios.php?id=$portfolioId",
        'DELETE',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // TEST 16: Logout
    // ========================================
    $result = testEndpoint(
        'Logout',
        "$baseUrl/auth.php?action=logout",
        'POST',
        null,
        [$cookieHeader]
    );
    $results[] = $result;

    // ========================================
    // SUMMARY
    // ========================================
    $passed = array_filter($results, fn($r) => $r['success']);
    $failed = array_filter($results, fn($r) => !$r['success']);

    $summary = [
        'total_tests' => count($results),
        'passed' => count($passed),
        'failed' => count($failed),
        'success_rate' => round(count($passed) / count($results) * 100, 2) . '%'
    ];

    echo json_encode([
        'summary' => $summary,
        'results' => $results
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'results_so_far' => $results
    ], JSON_PRETTY_PRINT);
}
