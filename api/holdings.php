<?php
/**
 * Folyo - Holdings API
 * Get portfolio holdings with current prices and profit/loss calculations
 *
 * GET /api/holdings.php?portfolio_id={id}           - Holdings for specific portfolio
 * GET /api/holdings.php?portfolio_id={id}&overview  - Overview summary
 * GET /api/holdings.php                             - All holdings for current user
 */

require_once 'database.php';
require_once 'response.php';
require_once 'session.php';

enableCORS();

// Require authentication
requireAuth();

$portfolioId = $_GET['portfolio_id'] ?? null;
$isOverview = isset($_GET['overview']);

try {
    if ($portfolioId) {
        if ($isOverview) {
            getPortfolioOverview($portfolioId);
        } else {
            getPortfolioHoldings($portfolioId);
        }
    } else {
        getAllUserHoldings();
    }
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}

/**
 * Get holdings for specific portfolio with current prices
 * GET /api/holdings.php?portfolio_id={id}
 */
function getPortfolioHoldings($portfolioId) {
    $userId = getCurrentUserId();

    // Verify portfolio belongs to user
    $portfolio = queryOne('
        SELECT id, name FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$portfolioId, $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    // Get holdings from database (calculated by view)
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

    if (empty($holdings)) {
        sendSuccess([
            'portfolio' => $portfolio,
            'holdings' => [],
            'summary' => [
                'total_value' => 0,
                'total_cost' => 0,
                'total_profit_loss' => 0,
                'total_profit_loss_percent' => 0
            ]
        ]);
        return;
    }

    // Get crypto IDs for API price fetch
    $cryptoIds = array_column($holdings, 'crypto_id');

    // Fetch current prices and price changes from CoinMarketCap API
    $priceData = fetchCurrentPricesWithChanges($cryptoIds);

    // Calculate profit/loss for each holding
    $totalValue = 0;
    $totalCost = 0;

    foreach ($holdings as &$holding) {
        $cryptoId = $holding['crypto_id'];
        $cryptoPriceData = $priceData[$cryptoId] ?? ['price' => 0, 'percent_change_1h' => 0, 'percent_change_24h' => 0, 'percent_change_7d' => 0];
        $currentPrice = $cryptoPriceData['price'];

        // Current value
        $currentValue = floatval($holding['total_quantity']) * $currentPrice;

        // Profit/Loss
        $costBasis = floatval($holding['cost_basis']);
        $profitLoss = $currentValue - $costBasis;
        $profitLossPercent = $costBasis > 0 ? ($profitLoss / $costBasis * 100) : 0;

        // Add calculated fields
        $holding['current_price'] = $currentPrice;
        $holding['current_value'] = $currentValue;
        $holding['profit_loss'] = $profitLoss;
        $holding['profit_loss_percent'] = $profitLossPercent;
        $holding['price_change_1h'] = $cryptoPriceData['percent_change_1h'];
        $holding['price_change_24h'] = $cryptoPriceData['percent_change_24h'];
        $holding['price_change_7d'] = $cryptoPriceData['percent_change_7d'];

        $totalValue += $currentValue;
        $totalCost += $costBasis;
    }

    $totalProfitLoss = $totalValue - $totalCost;
    $totalProfitLossPercent = $totalCost > 0 ? ($totalProfitLoss / $totalCost * 100) : 0;

    sendSuccess([
        'portfolio' => $portfolio,
        'holdings' => $holdings,
        'summary' => [
            'total_value' => $totalValue,
            'total_cost' => $totalCost,
            'total_profit_loss' => $totalProfitLoss,
            'total_profit_loss_percent' => $totalProfitLossPercent,
            'unique_assets' => count($holdings)
        ]
    ]);
}

/**
 * Get portfolio overview summary
 * GET /api/holdings.php?portfolio_id={id}&overview
 */
function getPortfolioOverview($portfolioId) {
    $userId = getCurrentUserId();

    // Verify portfolio belongs to user
    $portfolio = queryOne('
        SELECT id, name, description FROM portfolios
        WHERE id = ? AND user_id = ?
    ', [$portfolioId, $userId]);

    if (!$portfolio) {
        sendError('Portfolio not found', 404);
    }

    // Get holdings
    $holdings = query('
        SELECT
            crypto_id,
            crypto_symbol,
            total_quantity,
            cost_basis
        FROM portfolio_holdings
        WHERE portfolio_id = ?
    ', [$portfolioId]);

    if (empty($holdings)) {
        sendSuccess([
            'portfolio' => $portfolio,
            'total_value' => 0,
            'total_cost' => 0,
            'profit_loss' => 0,
            'profit_loss_percent' => 0,
            'best_performer' => null,
            'worst_performer' => null,
            'allocation' => []
        ]);
        return;
    }

    // Get crypto IDs
    $cryptoIds = array_column($holdings, 'crypto_id');

    // Fetch current prices
    $currentPrices = fetchCurrentPrices($cryptoIds);

    // Calculate values
    $totalValue = 0;
    $totalCost = 0;
    $assets = [];
    $bestPerformer = null;
    $worstPerformer = null;

    foreach ($holdings as $holding) {
        $cryptoId = $holding['crypto_id'];
        $currentPrice = $currentPrices[$cryptoId] ?? 0;
        $currentValue = floatval($holding['total_quantity']) * $currentPrice;
        $costBasis = floatval($holding['cost_basis']);
        $profitLoss = $currentValue - $costBasis;
        $profitLossPercent = $costBasis > 0 ? ($profitLoss / $costBasis * 100) : 0;

        $asset = [
            'symbol' => $holding['crypto_symbol'],
            'value' => $currentValue,
            'cost' => $costBasis,
            'profit_loss' => $profitLoss,
            'profit_loss_percent' => $profitLossPercent
        ];

        $assets[] = $asset;
        $totalValue += $currentValue;
        $totalCost += $costBasis;

        // Track best/worst performers
        if ($bestPerformer === null || $profitLoss > $bestPerformer['profit_loss']) {
            $bestPerformer = $asset;
        }

        if ($worstPerformer === null || $profitLoss < $worstPerformer['profit_loss']) {
            $worstPerformer = $asset;
        }
    }

    // Calculate allocation percentages
    $allocation = [];
    foreach ($assets as $asset) {
        $allocation[] = [
            'token' => $asset['symbol'],
            'percent' => $totalValue > 0 ? ($asset['value'] / $totalValue * 100) : 0,
            'value' => $asset['value']
        ];
    }

    // Sort allocation by percentage descending
    usort($allocation, function($a, $b) {
        return $b['percent'] <=> $a['percent'];
    });

    $totalProfitLoss = $totalValue - $totalCost;
    $totalProfitLossPercent = $totalCost > 0 ? ($totalProfitLoss / $totalCost * 100) : 0;

    sendSuccess([
        'portfolio' => $portfolio,
        'total_value' => $totalValue,
        'total_cost' => $totalCost,
        'profit_loss' => $totalProfitLoss,
        'profit_loss_percent' => $totalProfitLossPercent,
        'best_performer' => $bestPerformer,
        'worst_performer' => $worstPerformer,
        'allocation' => $allocation
    ]);
}

/**
 * Get all holdings for current user across all portfolios
 * GET /api/holdings.php
 */
function getAllUserHoldings() {
    $userId = getCurrentUserId();

    // Get all user holdings
    $holdings = query('
        SELECT
            portfolio_id,
            portfolio_name,
            crypto_id,
            crypto_symbol,
            crypto_name,
            total_quantity,
            avg_buy_price,
            cost_basis
        FROM portfolio_holdings
        WHERE user_id = ?
        ORDER BY cost_basis DESC
    ', [$userId]);

    if (empty($holdings)) {
        sendSuccess([
            'holdings' => [],
            'summary' => [
                'total_value' => 0,
                'total_cost' => 0,
                'total_profit_loss' => 0,
                'total_profit_loss_percent' => 0,
                'unique_assets' => 0
            ]
        ]);
        return;
    }

    // Get unique crypto IDs
    $cryptoIds = array_unique(array_column($holdings, 'crypto_id'));

    // Fetch current prices WITH price changes (1h, 24h, 7d)
    $priceData = fetchCurrentPricesWithChanges($cryptoIds);

    // Calculate values
    $totalValue = 0;
    $totalCost = 0;

    foreach ($holdings as &$holding) {
        $cryptoId = $holding['crypto_id'];
        $cryptoPriceData = $priceData[$cryptoId] ?? ['price' => 0, 'percent_change_1h' => 0, 'percent_change_24h' => 0, 'percent_change_7d' => 0];
        $currentPrice = $cryptoPriceData['price'];

        // Current value
        $currentValue = floatval($holding['total_quantity']) * $currentPrice;

        // Profit/Loss
        $costBasis = floatval($holding['cost_basis']);
        $profitLoss = $currentValue - $costBasis;
        $profitLossPercent = $costBasis > 0 ? ($profitLoss / $costBasis * 100) : 0;

        // Calculate value change in last 24h
        $priceChange24h = $cryptoPriceData['percent_change_24h'];
        $valueChange24h = $currentValue * ($priceChange24h / 100);

        // Add calculated fields
        $holding['current_price'] = $currentPrice;
        $holding['current_value'] = $currentValue;
        $holding['profit_loss'] = $profitLoss;
        $holding['profit_loss_percent'] = $profitLossPercent;
        $holding['price_change_1h'] = $cryptoPriceData['percent_change_1h'];
        $holding['price_change_24h'] = $cryptoPriceData['percent_change_24h'];
        $holding['price_change_7d'] = $cryptoPriceData['percent_change_7d'];
        $holding['value_change_24h'] = $valueChange24h;

        $totalValue += $currentValue;
        $totalCost += $costBasis;
    }

    $totalProfitLoss = $totalValue - $totalCost;
    $totalProfitLossPercent = $totalCost > 0 ? ($totalProfitLoss / $totalCost * 100) : 0;

    sendSuccess([
        'holdings' => $holdings,
        'summary' => [
            'total_value' => $totalValue,
            'total_cost' => $totalCost,
            'total_profit_loss' => $totalProfitLoss,
            'total_profit_loss_percent' => $totalProfitLossPercent,
            'unique_assets' => count($cryptoIds)
        ]
    ]);
}

/**
 * Fetch current prices from CoinMarketCap API
 * @param array $cryptoIds Array of crypto IDs
 * @return array Prices indexed by crypto ID
 */
/**
 * Fetch current prices with percent changes
 */
function fetchCurrentPricesWithChanges($cryptoIds) {
    if (empty($cryptoIds)) {
        return [];
    }

    // Build API URL
    $idsString = implode(',', $cryptoIds);
    $apiUrl = "http://folyo.test/api/proxy.php?endpoint=crypto-quotes&ids={$idsString}";

    // Fetch from API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        // Return empty data if API fails
        return array_fill_keys($cryptoIds, [
            'price' => 0,
            'percent_change_1h' => 0,
            'percent_change_24h' => 0,
            'percent_change_7d' => 0
        ]);
    }

    $data = json_decode($response, true);

    if (!isset($data['data']) || !is_array($data['data'])) {
        return array_fill_keys($cryptoIds, [
            'price' => 0,
            'percent_change_1h' => 0,
            'percent_change_24h' => 0,
            'percent_change_7d' => 0
        ]);
    }

    // Extract prices and changes
    $priceData = [];
    foreach ($data['data'] as $cryptoId => $cryptoData) {
        $quote = $cryptoData['quote']['USD'] ?? null;
        if ($quote) {
            $priceData[$cryptoId] = [
                'price' => floatval($quote['price']),
                'percent_change_1h' => floatval($quote['percent_change_1h'] ?? 0),
                'percent_change_24h' => floatval($quote['percent_change_24h'] ?? 0),
                'percent_change_7d' => floatval($quote['percent_change_7d'] ?? 0)
            ];
        } else {
            $priceData[$cryptoId] = [
                'price' => 0,
                'percent_change_1h' => 0,
                'percent_change_24h' => 0,
                'percent_change_7d' => 0
            ];
        }
    }

    // Fill missing data with 0
    foreach ($cryptoIds as $id) {
        if (!isset($priceData[$id])) {
            $priceData[$id] = [
                'price' => 0,
                'percent_change_1h' => 0,
                'percent_change_24h' => 0,
                'percent_change_7d' => 0
            ];
        }
    }

    return $priceData;
}

function fetchCurrentPrices($cryptoIds) {
    $priceData = fetchCurrentPricesWithChanges($cryptoIds);

    // Extract just prices for backward compatibility
    $prices = [];
    foreach ($priceData as $id => $data) {
        $prices[$id] = $data['price'];
    }

    return $prices;
}
