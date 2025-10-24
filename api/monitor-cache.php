<?php
/**
 * Cache Monitor - Shows current cache state
 */

require_once 'database.php';

echo "=== Redis Cache Monitor ===\n\n";

$redis = getRedisConnection();

if ($redis === null) {
    echo "✗ Redis not connected\n";
    exit(1);
}

// Get all cache keys
$keys = $redis->keys('folyo:cache:*');
echo "Total keys in cache: " . count($keys) . "\n\n";

if (!empty($keys)) {
    echo "Cached items:\n";
    echo str_repeat('-', 80) . "\n";

    foreach ($keys as $key) {
        // Get key info
        $ttl = $redis->ttl($key);
        $value = $redis->get($key);
        $decoded = json_decode($value, true);

        // Extract the actual cache key name
        $keyName = str_replace('folyo:cache:', '', $key);

        echo "Key: {$keyName}\n";
        echo "TTL: {$ttl} seconds\n";

        if ($decoded) {
            // Try to show summary of cached data
            if (is_array($decoded)) {
                $summary = "Array with " . count($decoded) . " items";

                // Special handling for known cache keys
                if (strpos($keyName, 'crypto_prices_') === 0) {
                    $cryptoIds = array_keys($decoded);
                    $summary = "Prices for " . count($cryptoIds) . " cryptocurrencies";
                } elseif (strpos($keyName, 'portfolio_history_') === 0) {
                    if (isset($decoded['period'])) {
                        $points = count($decoded['points'] ?? []);
                        $summary = "History ({$decoded['period']}) with {$points} data points";
                    }
                }

                echo "Data: {$summary}\n";
            } else {
                echo "Data: " . substr(json_encode($decoded), 0, 100) . "...\n";
            }
        }

        echo str_repeat('-', 80) . "\n";
    }
}

// Show statistics
echo "\n=== Redis Statistics ===\n";
$stats = getCacheStats();
foreach ($stats as $key => $value) {
    echo ucfirst(str_replace('_', ' ', $key)) . ": {$value}\n";
}

closeRedisConnection();
