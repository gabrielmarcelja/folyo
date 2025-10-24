<?php
/**
 * Folyo - Database Connection Test
 * Test script to verify database connection and queries
 */

require_once 'database.php';

header('Content-Type: application/json');

try {
    // Test 1: Connect to database
    $pdo = getDB();
    $results = ['success' => true, 'tests' => []];

    // Test 2: Count users
    $userCount = queryOne('SELECT COUNT(*) as total FROM users');
    $results['tests'][] = [
        'name' => 'Count Users',
        'status' => 'passed',
        'result' => $userCount
    ];

    // Test 3: Get all portfolios
    $portfolios = query('SELECT id, name, description FROM portfolios');
    $results['tests'][] = [
        'name' => 'Get Portfolios',
        'status' => 'passed',
        'result' => $portfolios
    ];

    // Test 4: Get portfolio holdings (view)
    $holdings = query('
        SELECT
            portfolio_name,
            crypto_symbol,
            total_quantity,
            ROUND(avg_buy_price, 2) as avg_buy_price,
            ROUND(cost_basis, 2) as cost_basis
        FROM portfolio_holdings
    ');
    $results['tests'][] = [
        'name' => 'Get Holdings (View)',
        'status' => 'passed',
        'result' => $holdings
    ];

    // Test 5: Test user overview (view)
    $overview = query('SELECT * FROM user_overview');
    $results['tests'][] = [
        'name' => 'Get User Overview',
        'status' => 'passed',
        'result' => $overview
    ];

    // Test 6: Get transactions for a specific portfolio
    $transactions = query('
        SELECT
            id,
            transaction_type,
            crypto_symbol,
            quantity,
            price_per_coin,
            total_amount,
            transaction_date
        FROM transactions
        WHERE portfolio_id = ?
        ORDER BY transaction_date DESC
    ', [1]);
    $results['tests'][] = [
        'name' => 'Get Transactions for Portfolio #1',
        'status' => 'passed',
        'result' => $transactions
    ];

    // Summary
    $results['summary'] = [
        'total_tests' => count($results['tests']),
        'passed' => count(array_filter($results['tests'], fn($t) => $t['status'] === 'passed')),
        'database' => DB_NAME,
        'user' => DB_USER,
        'connection' => 'successful'
    ];

    echo json_encode($results, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'connection' => 'failed'
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
