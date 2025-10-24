<?php
/**
 * Cache System Test Script
 * Tests Redis cache functionality and fallback mechanisms
 */

require_once 'database.php';

echo "=== Folyo Cache System Test ===\n\n";

// Test 1: Check environment configuration
echo "1. Environment Configuration:\n";
echo "   CACHE_DRIVER: " . ($_ENV['CACHE_DRIVER'] ?? 'not set') . "\n";
echo "   REDIS_HOST: " . ($_ENV['REDIS_HOST'] ?? 'not set') . "\n";
echo "   REDIS_PORT: " . ($_ENV['REDIS_PORT'] ?? 'not set') . "\n";
echo "   CACHE_PREFIX: " . ($_ENV['CACHE_PREFIX'] ?? 'not set') . "\n\n";

// Test 2: Check Redis connection
echo "2. Redis Connection Test:\n";
$redis = getRedisConnection();
if ($redis !== null) {
    echo "   ✓ Redis connection successful\n";
    echo "   Redis version: " . $redis->info()['redis_version'] . "\n\n";
} else {
    echo "   ✗ Redis connection failed (will use file-based cache)\n\n";
}

// Test 3: Set cache data
echo "3. Set Cache Test:\n";
$testData = [
    'name' => 'Bitcoin',
    'symbol' => 'BTC',
    'price' => 45000.50,
    'timestamp' => time()
];
$success = setCache('test_cache_key', $testData, 60);
echo "   Set cache result: " . ($success ? "✓ Success" : "✗ Failed") . "\n\n";

// Test 4: Get cache data
echo "4. Get Cache Test:\n";
$retrieved = getCache('test_cache_key');
if ($retrieved !== null) {
    echo "   ✓ Cache retrieved successfully\n";
    echo "   Data matches: " . (json_encode($retrieved) === json_encode($testData) ? "✓ Yes" : "✗ No") . "\n";
    echo "   Retrieved data: " . json_encode($retrieved, JSON_PRETTY_PRINT) . "\n\n";
} else {
    echo "   ✗ Failed to retrieve cache\n\n";
}

// Test 5: Cache expiration test
echo "5. Cache Expiration Test (2 second TTL):\n";
setCache('test_expiry', ['test' => 'data'], 2);
echo "   Set cache with 2s TTL: ✓\n";
echo "   Get immediately: ";
$immediate = getCache('test_expiry');
echo ($immediate !== null ? "✓ Found\n" : "✗ Not found\n");
echo "   Waiting 3 seconds...\n";
sleep(3);
echo "   Get after expiry: ";
$expired = getCache('test_expiry');
echo ($expired === null ? "✓ Correctly expired\n" : "✗ Still exists (error)\n\n");

// Test 6: Clear specific cache
echo "6. Clear Specific Cache Test:\n";
setCache('test_clear', ['data' => 'to clear'], 60);
echo "   Set cache: ✓\n";
echo "   Verify exists: " . (getCache('test_clear') !== null ? "✓ Yes\n" : "✗ No\n");
clearCache('test_clear');
echo "   Clear cache: ✓\n";
echo "   Verify cleared: " . (getCache('test_clear') === null ? "✓ Yes\n" : "✗ Still exists\n\n");

// Test 7: Multiple keys
echo "7. Multiple Keys Test:\n";
setCache('crypto_btc', ['name' => 'Bitcoin', 'price' => 45000]);
setCache('crypto_eth', ['name' => 'Ethereum', 'price' => 2500]);
setCache('crypto_ada', ['name' => 'Cardano', 'price' => 0.50]);
echo "   Set 3 different keys: ✓\n";
echo "   Get crypto_btc: " . (getCache('crypto_btc') !== null ? "✓\n" : "✗\n");
echo "   Get crypto_eth: " . (getCache('crypto_eth') !== null ? "✓\n" : "✗\n");
echo "   Get crypto_ada: " . (getCache('crypto_ada') !== null ? "✓\n" : "✗\n\n");

// Test 8: Cache statistics
echo "8. Cache Statistics:\n";
$stats = getCacheStats();
echo "   Driver: " . $stats['driver'] . "\n";
echo "   Status: " . $stats['status'] . "\n";

if ($stats['driver'] === 'redis') {
    echo "   Redis Version: " . $stats['version'] . "\n";
    echo "   Used Memory: " . $stats['used_memory'] . "\n";
    echo "   Connected Clients: " . $stats['connected_clients'] . "\n";
    echo "   Total Commands: " . $stats['total_commands'] . "\n";
    echo "   Keyspace Hits: " . $stats['keyspace_hits'] . "\n";
    echo "   Keyspace Misses: " . $stats['keyspace_misses'] . "\n";
    echo "   Hit Rate: " . $stats['hit_rate'] . "%\n";
} else {
    echo "   File Count: " . $stats['file_count'] . "\n";
    echo "   Total Size: " . $stats['total_size_human'] . "\n";
}
echo "\n";

// Test 9: Performance test
echo "9. Performance Test (100 operations):\n";
$startTime = microtime(true);
for ($i = 0; $i < 100; $i++) {
    setCache("perf_test_{$i}", ['iteration' => $i, 'data' => str_repeat('x', 100)]);
}
$setTime = microtime(true) - $startTime;

$startTime = microtime(true);
for ($i = 0; $i < 100; $i++) {
    getCache("perf_test_{$i}");
}
$getTime = microtime(true) - $startTime;

echo "   100 SET operations: " . round($setTime * 1000, 2) . "ms\n";
echo "   100 GET operations: " . round($getTime * 1000, 2) . "ms\n";
echo "   Average SET: " . round($setTime * 10, 2) . "ms\n";
echo "   Average GET: " . round($getTime * 10, 2) . "ms\n\n";

// Test 10: Cleanup
echo "10. Cleanup Test:\n";
clearCache();
echo "   Clear all cache: ✓\n";
$afterClear = getCacheStats();
if ($afterClear['driver'] === 'redis') {
    // Check Redis keys
    $redis = getRedisConnection();
    $keys = $redis->keys('folyo:cache:*');
    echo "   Remaining keys: " . count($keys) . "\n";
} else {
    echo "   Remaining files: " . $afterClear['file_count'] . "\n";
}

echo "\n=== Test Complete ===\n";

// Close Redis connection
closeRedisConnection();
