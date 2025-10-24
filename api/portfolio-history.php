<?php
/**
 * Folyo - Portfolio History API
 * Returns historical portfolio value data for charting
 *
 * GET /api/portfolio-history.php?period=7d                  - All portfolios (Overview)
 * GET /api/portfolio-history.php?portfolio_id=1&period=7d   - Specific portfolio
 *
 * Periods: 24h (hourly), 7d (daily), 30d (daily)
 */

require_once 'database.php';
require_once 'response.php';
require_once 'session.php';

enableCORS();

// Require authentication
requireAuth();

$portfolioId = isset($_GET['portfolio_id']) ? intval($_GET['portfolio_id']) : null;
$period = $_GET['period'] ?? '24h';

// Validate period
if (!in_array($period, ['24h', '7d', '30d'])) {
    sendError('Invalid period. Must be 24h, 7d, or 30d', 400);
}

try {
    $historyData = getPortfolioHistory($portfolioId, $period);
    sendSuccess($historyData);
} catch (Exception $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}

/**
 * Get portfolio history data
 * @param int|null $portfolioId Portfolio ID (null for all portfolios)
 * @param string $period Period: 24h, 7d, 30d
 * @return array History data
 */
function getPortfolioHistory($portfolioId, $period) {
    $userId = getCurrentUserId();

    // Verify portfolio ownership if specific portfolio
    if ($portfolioId) {
        $portfolio = queryOne('
            SELECT id, name FROM portfolios
            WHERE id = ? AND user_id = ?
        ', [$portfolioId, $userId]);

        if (!$portfolio) {
            sendError('Portfolio not found', 404);
        }
    }

    // Check cache first
    $cacheKey = "portfolio_history_{$userId}_{$portfolioId}_{$period}";
    $cached = getCache($cacheKey);
    if ($cached) {
        return $cached;
    }

    // Generate timestamps based on period
    $timestamps = generateTimestamps($period);

    // Get all unique crypto IDs from user's transactions
    $cryptoIds = getUserCryptoIds($userId, $portfolioId);

    if (empty($cryptoIds)) {
        return [
            'period' => $period,
            'points' => [],
            'summary' => [
                'start_value' => 0,
                'end_value' => 0,
                'change' => 0,
                'change_percent' => 0,
                'is_profit' => false
            ]
        ];
    }

    // Fetch historical prices for all cryptos at once
    $historicalPrices = fetchHistoricalPricesBatch($cryptoIds, $timestamps, $period);

    // Calculate portfolio value at each timestamp
    $points = [];
    foreach ($timestamps as $timestamp) {
        $holdings = getHoldingsAtTimestamp($userId, $portfolioId, $timestamp);
        $value = calculatePortfolioValueAtTimestamp($holdings, $historicalPrices, $timestamp);

        $points[] = [
            'timestamp' => $timestamp,
            'value' => round($value, 2),
            'date_formatted' => formatDateForPeriod($timestamp, $period)
        ];
    }

    // Calculate summary
    $startValue = $points[0]['value'] ?? 0;
    $endValue = end($points)['value'] ?? 0;
    $change = $endValue - $startValue;
    $changePercent = $startValue > 0 ? (($change / $startValue) * 100) : 0;

    $result = [
        'period' => $period,
        'points' => $points,
        'summary' => [
            'start_value' => round($startValue, 2),
            'end_value' => round($endValue, 2),
            'change' => round($change, 2),
            'change_percent' => round($changePercent, 2),
            'is_profit' => $change >= 0
        ]
    ];

    // Cache for 10 minutes (more reasonable for volatile crypto markets)
    setCache($cacheKey, $result, 600);

    return $result;
}

/**
 * Generate timestamps based on period
 * @param string $period
 * @return array Array of timestamps
 */
function generateTimestamps($period) {
    $now = time();
    $timestamps = [];

    switch ($period) {
        case '24h':
            // 24 points (hourly for last 24 hours)
            for ($i = 23; $i >= 0; $i--) {
                $timestamps[] = $now - ($i * 3600);
            }
            break;

        case '7d':
            // 7 points (daily for last 7 days at midnight)
            for ($i = 6; $i >= 0; $i--) {
                $date = strtotime("midnight -{$i} days");
                $timestamps[] = $date;
            }
            break;

        case '30d':
            // 30 points (daily for last 30 days at midnight)
            for ($i = 29; $i >= 0; $i--) {
                $date = strtotime("midnight -{$i} days");
                $timestamps[] = $date;
            }
            break;
    }

    return $timestamps;
}

/**
 * Get all crypto IDs from user's transactions
 * @param int $userId
 * @param int|null $portfolioId
 * @return array Array of crypto IDs
 */
function getUserCryptoIds($userId, $portfolioId) {
    $sql = '
        SELECT DISTINCT t.crypto_id
        FROM transactions t
        INNER JOIN portfolios p ON t.portfolio_id = p.id
        WHERE p.user_id = ?
    ';
    $params = [$userId];

    if ($portfolioId) {
        $sql .= ' AND t.portfolio_id = ?';
        $params[] = $portfolioId;
    }

    $results = query($sql, $params);
    return array_column($results, 'crypto_id');
}

/**
 * Get holdings at specific timestamp
 * @param int $userId
 * @param int|null $portfolioId
 * @param int $timestamp
 * @return array Holdings data
 */
function getHoldingsAtTimestamp($userId, $portfolioId, $timestamp) {
    $date = date('Y-m-d H:i:s', $timestamp);

    $sql = '
        SELECT
            t.crypto_id,
            t.crypto_symbol,
            SUM(CASE
                WHEN t.transaction_type = "buy" THEN t.quantity
                WHEN t.transaction_type = "sell" THEN -t.quantity
            END) as total_quantity
        FROM transactions t
        INNER JOIN portfolios p ON t.portfolio_id = p.id
        WHERE p.user_id = ?
            AND t.transaction_date <= ?
    ';
    $params = [$userId, $date];

    if ($portfolioId) {
        $sql .= ' AND t.portfolio_id = ?';
        $params[] = $portfolioId;
    }

    $sql .= ' GROUP BY t.crypto_id, t.crypto_symbol HAVING total_quantity > 0';

    return query($sql, $params);
}

/**
 * Fetch historical prices for multiple cryptos (batch request)
 * @param array $cryptoIds Array of crypto IDs
 * @param array $timestamps Array of timestamps
 * @param string $period Period for interval calculation
 * @return array Prices indexed by timestamp and crypto_id
 */
function fetchHistoricalPricesBatch($cryptoIds, $timestamps, $period) {
    if (empty($cryptoIds)) {
        return [];
    }

    $prices = [];

    // Determine interval and count based on period
    $interval = ($period === '24h') ? 'hourly' : 'daily';
    $count = count($timestamps);

    // CMC API expects count for how many data points to return
    // For batch efficiency, we'll make one request per period
    $idsString = implode(',', $cryptoIds);

    // Build API URL using dynamic base URL
    $baseUrl = getBaseUrl();
    $apiUrl = "{$baseUrl}/api/proxy.php?endpoint=ohlcv-historical&ids={$idsString}&count={$count}&interval={$interval}&time_period={$interval}";

    // Fetch from API
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        // Fallback: use current prices for all timestamps if historical fails
        return fetchCurrentPricesAsFallback($cryptoIds, $timestamps);
    }

    $data = json_decode($response, true);

    if (!isset($data['data']) || !is_array($data['data'])) {
        return fetchCurrentPricesAsFallback($cryptoIds, $timestamps);
    }

    // Parse response and map to timestamps
    foreach ($data['data'] as $cryptoId => $cryptoData) {
        if (!isset($cryptoData['quotes']) || !is_array($cryptoData['quotes'])) {
            continue;
        }

        $quotes = $cryptoData['quotes'];

        // Match quotes to our timestamps (closest match)
        foreach ($timestamps as $idx => $timestamp) {
            if (isset($quotes[$idx]) && isset($quotes[$idx]['quote']['USD']['close'])) {
                $price = floatval($quotes[$idx]['quote']['USD']['close']);
            } else {
                // Fallback to closest available price
                $price = isset($quotes[0]['quote']['USD']['close']) ? floatval($quotes[0]['quote']['USD']['close']) : 0;
            }

            $prices[$timestamp][$cryptoId] = $price;
        }
    }

    return $prices;
}

/**
 * Fallback: fetch current prices and use for all timestamps
 * @param array $cryptoIds
 * @param array $timestamps
 * @return array
 */
function fetchCurrentPricesAsFallback($cryptoIds, $timestamps) {
    $prices = [];
    $idsString = implode(',', $cryptoIds);

    $baseUrl = getBaseUrl();
    $apiUrl = "{$baseUrl}/api/proxy.php?endpoint=crypto-quotes&ids={$idsString}";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    curl_close($ch);

    if (!$response) {
        return [];
    }

    $data = json_decode($response, true);

    if (!isset($data['data'])) {
        return [];
    }

    // Use current price for all timestamps
    foreach ($timestamps as $timestamp) {
        foreach ($data['data'] as $cryptoId => $cryptoData) {
            $price = isset($cryptoData['quote']['USD']['price']) ? floatval($cryptoData['quote']['USD']['price']) : 0;
            $prices[$timestamp][$cryptoId] = $price;
        }
    }

    return $prices;
}

/**
 * Calculate portfolio value at specific timestamp
 * @param array $holdings Holdings at timestamp
 * @param array $prices Historical prices
 * @param int $timestamp
 * @return float Total value
 */
function calculatePortfolioValueAtTimestamp($holdings, $prices, $timestamp) {
    $totalValue = 0;

    foreach ($holdings as $holding) {
        $cryptoId = $holding['crypto_id'];
        $quantity = floatval($holding['total_quantity']);

        $price = isset($prices[$timestamp][$cryptoId]) ? $prices[$timestamp][$cryptoId] : 0;

        $totalValue += $quantity * $price;
    }

    return $totalValue;
}

/**
 * Format date based on period
 * @param int $timestamp
 * @param string $period
 * @return string Formatted date
 */
function formatDateForPeriod($timestamp, $period) {
    if ($period === '24h') {
        // Format: "8:00 AM", "12:00 PM"
        return date('g:i A', $timestamp);
    } else {
        // Format: "Oct 16", "Oct 17"
        return date('M j', $timestamp);
    }
}

// Cache functions are now centralized in database.php
// getCache() and setCache() are available globally
