<?php
/**
 * Folyo - Transactions API
 * Endpoints for managing portfolio transactions
 *
 * GET    /api/transactions.php?portfolio_id={id}      - List transactions for portfolio
 * GET    /api/transactions.php?id={id}                - Get single transaction
 * POST   /api/transactions.php                        - Create transaction
 * PUT    /api/transactions.php?id={id}                - Update transaction
 * DELETE /api/transactions.php?id={id}                - Delete transaction
 */

require_once 'database.php';
require_once 'response.php';
require_once 'session.php';

enableCORS();

// Require authentication
requireAuth();

$method = getRequestMethod();
$transactionId = $_GET['id'] ?? null;
$portfolioId = $_GET['portfolio_id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($transactionId) {
                getTransaction($transactionId);
            } elseif ($portfolioId) {
                listTransactions($portfolioId);
            } else {
                sendError('Either transaction id or portfolio_id is required', 400);
            }
            break;

        case 'POST':
            createTransaction();
            break;

        case 'PUT':
            if (!$transactionId) {
                sendError('Transaction ID is required', 400);
            }
            updateTransaction($transactionId);
            break;

        case 'DELETE':
            if (!$transactionId) {
                sendError('Transaction ID is required', 400);
            }
            deleteTransaction($transactionId);
            break;

        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}

/**
 * List transactions for a portfolio
 * GET /api/transactions.php?portfolio_id={id}
 */
function listTransactions($portfolioId) {
    $userId = getCurrentUserId();

    // Verify portfolio belongs to user
    $portfolio = queryOne('
        SELECT id FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$portfolioId, $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    $transactions = query('
        SELECT
            id,
            portfolio_id,
            transaction_type,
            crypto_id,
            crypto_symbol,
            crypto_name,
            quantity,
            price_per_coin,
            total_amount,
            fee,
            currency,
            transaction_date,
            notes,
            created_at
        FROM transactions
        WHERE portfolio_id = ?
        ORDER BY transaction_date DESC, created_at DESC
    ', [$portfolioId]);

    sendSuccess($transactions);
}

/**
 * Get single transaction
 * GET /api/transactions.php?id={id}
 */
function getTransaction($transactionId) {
    $userId = getCurrentUserId();

    $transaction = queryOne('
        SELECT
            t.id,
            t.portfolio_id,
            t.transaction_type,
            t.crypto_id,
            t.crypto_symbol,
            t.crypto_name,
            t.quantity,
            t.price_per_coin,
            t.total_amount,
            t.fee,
            t.currency,
            t.transaction_date,
            t.notes,
            t.created_at,
            t.updated_at
        FROM transactions t
        INNER JOIN portfolios p ON t.portfolio_id = p.id
        WHERE t.id = ? AND p.user_id = ?
    ', [$transactionId, $userId]);

    if (!$transaction) {
        sendError('Transaction not found', 404);
    }

    sendSuccess($transaction);
}

/**
 * Create new transaction
 * POST /api/transactions.php
 * Body: {
 *   "portfolio_id": 1,
 *   "transaction_type": "buy",
 *   "crypto_id": 1,
 *   "crypto_symbol": "BTC",
 *   "crypto_name": "Bitcoin",
 *   "quantity": 0.5,
 *   "price_per_coin": 50000,
 *   "total_amount": 25010,
 *   "fee": 10,
 *   "currency": "USD",
 *   "transaction_date": "2024-01-15 10:30:00",
 *   "notes": "Optional notes"
 * }
 */
function createTransaction() {
    $userId = getCurrentUserId();
    $data = getJsonInput();

    // Validate required fields
    $required = [
        'portfolio_id',
        'transaction_type',
        'crypto_id',
        'crypto_symbol',
        'crypto_name',
        'quantity',
        'price_per_coin',
        'total_amount'
    ];

    $errors = validateRequired($data, $required);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }

    // Verify portfolio belongs to user
    $portfolio = queryOne('
        SELECT id FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$data['portfolio_id'], $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    // Validate transaction type
    if (!in_array($data['transaction_type'], ['buy', 'sell'])) {
        sendError('Invalid transaction type. Must be "buy" or "sell"', 400);
    }

    // Validate numeric values
    if ($data['quantity'] <= 0) {
        sendError('Quantity must be greater than 0', 400);
    }

    if ($data['price_per_coin'] <= 0) {
        sendError('Price per coin must be greater than 0', 400);
    }

    if ($data['total_amount'] < 0) {
        sendError('Total amount cannot be negative', 400);
    }

    // Parse transaction date
    $transactionDate = $data['transaction_date'] ?? date('Y-m-d H:i:s');

    // Optional fields
    $fee = isset($data['fee']) ? max(0, (float)$data['fee']) : 0;
    $currency = $data['currency'] ?? 'USD';
    $notes = isset($data['notes']) ? sanitizeString($data['notes']) : null;

    // Insert transaction
    execute('
        INSERT INTO transactions (
            portfolio_id,
            transaction_type,
            crypto_id,
            crypto_symbol,
            crypto_name,
            quantity,
            price_per_coin,
            total_amount,
            fee,
            currency,
            transaction_date,
            notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ', [
        $data['portfolio_id'],
        $data['transaction_type'],
        $data['crypto_id'],
        $data['crypto_symbol'],
        $data['crypto_name'],
        $data['quantity'],
        $data['price_per_coin'],
        $data['total_amount'],
        $fee,
        $currency,
        $transactionDate,
        $notes
    ]);

    $transactionId = lastInsertId();

    // Get created transaction
    $transaction = queryOne('
        SELECT * FROM transactions WHERE id = ?
    ', [$transactionId]);

    sendSuccess($transaction, 201);
}

/**
 * Update transaction
 * PUT /api/transactions.php?id={id}
 */
function updateTransaction($transactionId) {
    $userId = getCurrentUserId();
    $data = getJsonInput();

    // Verify transaction exists and belongs to user
    $existing = queryOne('
        SELECT t.id
        FROM transactions t
        INNER JOIN portfolios p ON t.portfolio_id = p.id
        WHERE t.id = ? AND p.user_id = ?
    ', [$transactionId, $userId]);

    if (!$existing) {
        sendError('Transaction not found', 404);
    }

    $updates = [];
    $params = [];

    // Build update query dynamically
    $fields = [
        'transaction_type',
        'crypto_id',
        'crypto_symbol',
        'crypto_name',
        'quantity',
        'price_per_coin',
        'total_amount',
        'fee',
        'currency',
        'transaction_date',
        'notes'
    ];

    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $updates[] = "$field = ?";
            $params[] = $data[$field];
        }
    }

    if (empty($updates)) {
        sendError('No fields to update', 400);
    }

    // Add transaction ID to params
    $params[] = $transactionId;

    // Execute update
    execute('
        UPDATE transactions
        SET ' . implode(', ', $updates) . '
        WHERE id = ?
    ', $params);

    // Get updated transaction
    $updated = queryOne('SELECT * FROM transactions WHERE id = ?', [$transactionId]);

    sendSuccess($updated);
}

/**
 * Delete transaction
 * DELETE /api/transactions.php?id={id}
 */
function deleteTransaction($transactionId) {
    $userId = getCurrentUserId();

    // Verify transaction exists and belongs to user
    $transaction = queryOne('
        SELECT t.id, t.crypto_symbol, t.transaction_type, t.quantity
        FROM transactions t
        INNER JOIN portfolios p ON t.portfolio_id = p.id
        WHERE t.id = ? AND p.user_id = ?
    ', [$transactionId, $userId]);

    if (!$transaction) {
        sendError('Transaction not found', 404);
    }

    // Delete transaction
    execute('DELETE FROM transactions WHERE id = ?', [$transactionId]);

    sendSuccess([
        'message' => 'Transaction deleted successfully',
        'deleted_transaction' => $transaction
    ]);
}
