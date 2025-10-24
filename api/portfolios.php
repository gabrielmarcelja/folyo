<?php
/**
 * Folyo - Portfolios API
 * Endpoints for managing user portfolios
 *
 * GET    /api/portfolios.php              - List all portfolios for current user
 * GET    /api/portfolios.php?id={id}      - Get single portfolio
 * POST   /api/portfolios.php              - Create new portfolio
 * PUT    /api/portfolios.php?id={id}      - Update portfolio
 * DELETE /api/portfolios.php?id={id}      - Delete portfolio
 */

require_once 'database.php';
require_once 'response.php';
require_once 'session.php';

enableCORS();

// Require authentication
requireAuth();

$method = getRequestMethod();
$portfolioId = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($portfolioId) {
                getPortfolio($portfolioId);
            } else {
                listPortfolios();
            }
            break;

        case 'POST':
            createPortfolio();
            break;

        case 'PUT':
            if (!$portfolioId) {
                sendError('Portfolio ID is required', 400);
            }
            updatePortfolio($portfolioId);
            break;

        case 'DELETE':
            if (!$portfolioId) {
                sendError('Portfolio ID is required', 400);
            }
            deletePortfolio($portfolioId);
            break;

        default:
            sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}

/**
 * List all portfolios for current user
 * GET /api/portfolios.php
 */
function listPortfolios() {
    $userId = getCurrentUserId();

    $portfolios = query('
        SELECT
            p.id,
            p.name,
            p.description,
            p.created_at,
            p.updated_at,
            (SELECT COUNT(DISTINCT crypto_id) FROM portfolio_holdings WHERE portfolio_id = p.id) as unique_cryptos,
            (SELECT COALESCE(SUM(cost_basis), 0) FROM portfolio_holdings WHERE portfolio_id = p.id) as total_invested
        FROM portfolios p
        WHERE p.user_id = ?
        ORDER BY p.created_at ASC
    ', [$userId]);

    sendSuccess($portfolios);
}

/**
 * Get single portfolio with details
 * GET /api/portfolios.php?id={id}
 */
function getPortfolio($portfolioId) {
    $userId = getCurrentUserId();

    // Get portfolio
    $portfolio = queryOne('
        SELECT
            id,
            name,
            description,
            created_at,
            updated_at
        FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$portfolioId, $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    // Get holdings for this portfolio
    $holdings = query('
        SELECT
            portfolio_id,
            crypto_id,
            crypto_symbol,
            crypto_name,
            total_quantity,
            avg_buy_price,
            cost_basis,
            transaction_count,
            first_buy_date,
            last_transaction_date
        FROM portfolio_holdings
        WHERE portfolio_id = ?
        ORDER BY cost_basis DESC
    ', [$portfolioId]);

    $portfolio['holdings'] = $holdings;

    sendSuccess($portfolio);
}

/**
 * Create new portfolio
 * POST /api/portfolios.php
 * Body: { "name": "My Wallet", "description": "Optional description" }
 */
function createPortfolio() {
    requireCsrfToken(); // CSRF protection
    $userId = getCurrentUserId();
    $data = getJsonInput();

    // Validate required fields
    $errors = validateRequired($data, ['name']);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }

    $name = sanitizeString($data['name']);
    $description = isset($data['description']) ? sanitizeString($data['description']) : null;

    // Validate name length
    if (strlen($name) < 2 || strlen($name) > 100) {
        sendError('Portfolio name must be between 2 and 100 characters', 400);
    }

    // Check if user already has a portfolio with this name
    $existing = queryOne('
        SELECT id FROM portfolios
        WHERE user_id = ? AND name = ?
    ', [$userId, $name]);

    if ($existing) {
        sendError('You already have a portfolio with this name', 409);
    }

    // Insert portfolio
    execute('
        INSERT INTO portfolios (user_id, name, description)
        VALUES (?, ?, ?)
    ', [$userId, $name, $description]);

    $portfolioId = lastInsertId();

    // Get created portfolio
    $portfolio = queryOne('
        SELECT id, name, description, created_at
        FROM portfolios
        WHERE id = ?
    ', [$portfolioId]);

    sendSuccess($portfolio, 201);
}

/**
 * Update portfolio
 * PUT /api/portfolios.php?id={id}
 * Body: { "name": "Updated Name", "description": "Updated description" }
 */
function updatePortfolio($portfolioId) {
    requireCsrfToken(); // CSRF protection
    $userId = getCurrentUserId();
    $data = getJsonInput();

    // Check if portfolio exists and belongs to user
    $portfolio = queryOne('
        SELECT id FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$portfolioId, $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    $updates = [];
    $params = [];

    // Update name if provided
    if (isset($data['name'])) {
        $name = sanitizeString($data['name']);

        if (strlen($name) < 2 || strlen($name) > 100) {
            sendError('Portfolio name must be between 2 and 100 characters', 400);
        }

        // Check if name already used by another portfolio
        $existing = queryOne('
            SELECT id FROM portfolios
            WHERE user_id = ? AND name = ? AND id != ?
        ', [$userId, $name, $portfolioId]);

        if ($existing) {
            sendError('You already have another portfolio with this name', 409);
        }

        $updates[] = 'name = ?';
        $params[] = $name;
    }

    // Update description if provided
    if (isset($data['description'])) {
        $updates[] = 'description = ?';
        $params[] = sanitizeString($data['description']);
    }

    if (empty($updates)) {
        sendError('No fields to update', 400);
    }

    // Add portfolio ID to params
    $params[] = $portfolioId;

    // Execute update
    execute('
        UPDATE portfolios
        SET ' . implode(', ', $updates) . '
        WHERE id = ?
    ', $params);

    // Get updated portfolio
    $updated = queryOne('
        SELECT id, name, description, created_at, updated_at
        FROM portfolios
        WHERE id = ?
    ', [$portfolioId]);

    sendSuccess($updated);
}

/**
 * Delete portfolio
 * DELETE /api/portfolios.php?id={id}
 */
function deletePortfolio($portfolioId) {
    requireCsrfToken(); // CSRF protection
    $userId = getCurrentUserId();

    // Check if portfolio exists and belongs to user
    $portfolio = queryOne('
        SELECT id, name FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$portfolioId, $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    // Delete portfolio (CASCADE will delete related transactions)
    execute('DELETE FROM portfolios WHERE id = ?', [$portfolioId]);

    sendSuccess([
        'message' => 'Portfolio deleted successfully',
        'deleted_portfolio' => $portfolio
    ]);
}
