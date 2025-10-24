<?php
/**
 * Folyo - Cache Abstraction Layer
 * Supports Redis and File-based caching with automatic fallback
 *
 * Features:
 * - Redis driver (primary, high performance)
 * - File-based driver (fallback, no dependencies)
 * - Automatic failover
 * - Connection pooling
 * - Expiration support
 * - Namespace prefix support
 */

// Global Redis connection
$redisConnection = null;

/**
 * Get configured cache driver from environment
 * @return string 'redis' or 'file'
 */
function getCacheDriver() {
    return strtolower($_ENV['CACHE_DRIVER'] ?? 'file');
}

/**
 * Get Redis connection (singleton pattern)
 * @return Redis|null Redis instance or null if unavailable
 */
function getRedisConnection() {
    global $redisConnection;

    // Return existing connection
    if ($redisConnection !== null) {
        return $redisConnection;
    }

    // Check if Redis extension is loaded
    if (!extension_loaded('redis')) {
        error_log('Redis extension not loaded, falling back to file cache');
        return null;
    }

    try {
        $redis = new Redis();

        // Get configuration from environment
        $host = $_ENV['REDIS_HOST'] ?? '127.0.0.1';
        $port = intval($_ENV['REDIS_PORT'] ?? 6379);
        $timeout = floatval($_ENV['REDIS_TIMEOUT'] ?? 2.0);
        $database = intval($_ENV['REDIS_DATABASE'] ?? 0);
        $password = $_ENV['REDIS_PASSWORD'] ?? '';

        // Connect to Redis
        $connected = $redis->connect($host, $port, $timeout);

        if (!$connected) {
            error_log("Failed to connect to Redis at {$host}:{$port}");
            return null;
        }

        // Authenticate if password is set
        if (!empty($password)) {
            if (!$redis->auth($password)) {
                error_log('Redis authentication failed');
                $redis->close();
                return null;
            }
        }

        // Select database
        if ($database > 0) {
            $redis->select($database);
        }

        // Test connection (ping returns true on success, not '+PONG')
        if ($redis->ping() !== true) {
            error_log('Redis ping failed');
            $redis->close();
            return null;
        }

        // Store connection globally
        $redisConnection = $redis;

        return $redis;

    } catch (Exception $e) {
        error_log('Redis connection error: ' . $e->getMessage());
        return null;
    }
}

/**
 * Close Redis connection
 */
function closeRedisConnection() {
    global $redisConnection;

    if ($redisConnection !== null) {
        try {
            $redisConnection->close();
        } catch (Exception $e) {
            error_log('Error closing Redis connection: ' . $e->getMessage());
        }
        $redisConnection = null;
    }
}

/**
 * Build cache key with namespace prefix
 * @param string $key Cache key
 * @return string Prefixed key
 */
function buildCacheKey($key) {
    $prefix = $_ENV['CACHE_PREFIX'] ?? 'folyo';
    return "{$prefix}:cache:{$key}";
}

/**
 * Get cached data (supports both Redis and file-based)
 * @param string $key Cache key
 * @return mixed|null Cached data or null if not found/expired
 */
function getCache($key) {
    $driver = getCacheDriver();

    // Try Redis first if configured
    if ($driver === 'redis') {
        $data = getRedisCacheData($key);
        if ($data !== null) {
            return $data;
        }

        // Fallback to file cache if Redis fails
        error_log("Redis cache miss for key: {$key}, trying file cache");
    }

    // Use file-based cache
    return getFileCacheData($key);
}

/**
 * Get data from Redis cache
 * @param string $key Cache key
 * @return mixed|null
 */
function getRedisCacheData($key) {
    try {
        $redis = getRedisConnection();

        if ($redis === null) {
            return null;
        }

        $cacheKey = buildCacheKey($key);
        $data = $redis->get($cacheKey);

        if ($data === false) {
            return null; // Key doesn't exist or expired
        }

        // Deserialize data
        $decoded = json_decode($data, true);

        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            error_log("Redis cache JSON decode error for key {$key}: " . json_last_error_msg());
            return null;
        }

        return $decoded;

    } catch (Exception $e) {
        error_log("Redis get error for key {$key}: " . $e->getMessage());
        return null;
    }
}

/**
 * Get data from file-based cache
 * @param string $key Cache key
 * @return mixed|null
 */
function getFileCacheData($key) {
    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    $cacheFile = $cacheDir . '/' . md5($key) . '.cache';

    if (!file_exists($cacheFile)) {
        return null;
    }

    $data = file_get_contents($cacheFile);
    $cached = json_decode($data, true);

    // Check expiry
    if (!$cached || !isset($cached['expires']) || $cached['expires'] < time()) {
        @unlink($cacheFile);
        return null;
    }

    return $cached['data'];
}

/**
 * Set cache data (supports both Redis and file-based)
 * @param string $key Cache key
 * @param mixed $data Data to cache
 * @param int $ttl Time to live in seconds (default: 300 = 5 minutes)
 * @return bool Success status
 */
function setCache($key, $data, $ttl = 300) {
    $driver = getCacheDriver();

    // Try Redis first if configured
    if ($driver === 'redis') {
        $success = setRedisCacheData($key, $data, $ttl);
        if ($success) {
            return true;
        }

        // Fallback to file cache if Redis fails
        error_log("Redis cache set failed for key: {$key}, using file cache");
    }

    // Use file-based cache
    return setFileCacheData($key, $data, $ttl);
}

/**
 * Set data in Redis cache
 * @param string $key Cache key
 * @param mixed $data Data to cache
 * @param int $ttl Time to live in seconds
 * @return bool Success status
 */
function setRedisCacheData($key, $data, $ttl) {
    try {
        $redis = getRedisConnection();

        if ($redis === null) {
            return false;
        }

        $cacheKey = buildCacheKey($key);

        // Serialize data to JSON
        $encoded = json_encode($data);

        if ($encoded === false) {
            error_log("Redis cache JSON encode error for key {$key}: " . json_last_error_msg());
            return false;
        }

        // Set with expiration (SETEX is atomic)
        $result = $redis->setex($cacheKey, $ttl, $encoded);

        return $result !== false;

    } catch (Exception $e) {
        error_log("Redis set error for key {$key}: " . $e->getMessage());
        return false;
    }
}

/**
 * Set data in file-based cache
 * @param string $key Cache key
 * @param mixed $data Data to cache
 * @param int $ttl Time to live in seconds
 * @return bool Success status
 */
function setFileCacheData($key, $data, $ttl) {
    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    $cacheFile = $cacheDir . '/' . md5($key) . '.cache';

    $cached = [
        'expires' => time() + $ttl,
        'data' => $data,
        'created_at' => time()
    ];

    $result = file_put_contents($cacheFile, json_encode($cached));

    return $result !== false;
}

/**
 * Clear cache by key or pattern (supports both Redis and file-based)
 * @param string|null $key Cache key or null to clear all
 * @return bool Success status
 */
function clearCache($key = null) {
    $driver = getCacheDriver();
    $success = false;

    // Clear from Redis if configured
    if ($driver === 'redis') {
        $success = clearRedisCache($key);
    }

    // Also clear from file cache (for migration scenarios)
    clearFileCache($key);

    return $success;
}

/**
 * Clear Redis cache
 * @param string|null $key Cache key or null to clear all
 * @return bool Success status
 */
function clearRedisCache($key = null) {
    try {
        $redis = getRedisConnection();

        if ($redis === null) {
            return false;
        }

        if ($key === null) {
            // Clear all cache keys with our prefix
            $prefix = buildCacheKey('*');
            $keys = $redis->keys($prefix);

            if (!empty($keys)) {
                $redis->del($keys);
            }
        } else {
            // Clear specific key
            $cacheKey = buildCacheKey($key);
            $redis->del($cacheKey);
        }

        return true;

    } catch (Exception $e) {
        error_log("Redis clear error: " . $e->getMessage());
        return false;
    }
}

/**
 * Clear file-based cache
 * @param string|null $key Cache key or null to clear all
 */
function clearFileCache($key = null) {
    $cacheDir = __DIR__ . '/../cache';
    if (!is_dir($cacheDir)) {
        return;
    }

    if ($key === null) {
        // Clear all cache files
        $files = glob($cacheDir . '/*.cache');
        foreach ($files as $file) {
            @unlink($file);
        }
    } else {
        // Clear specific key
        $cacheFile = $cacheDir . '/' . md5($key) . '.cache';
        if (file_exists($cacheFile)) {
            @unlink($cacheFile);
        }
    }
}

/**
 * Get cache statistics
 * @return array Cache stats
 */
function getCacheStats() {
    $driver = getCacheDriver();

    if ($driver === 'redis') {
        try {
            $redis = getRedisConnection();

            if ($redis !== null) {
                $info = $redis->info();

                return [
                    'driver' => 'redis',
                    'status' => 'connected',
                    'version' => $info['redis_version'] ?? 'unknown',
                    'used_memory' => $info['used_memory_human'] ?? 'unknown',
                    'connected_clients' => $info['connected_clients'] ?? 0,
                    'total_commands' => $info['total_commands_processed'] ?? 0,
                    'keyspace_hits' => $info['keyspace_hits'] ?? 0,
                    'keyspace_misses' => $info['keyspace_misses'] ?? 0,
                    'hit_rate' => calculateHitRate($info)
                ];
            }
        } catch (Exception $e) {
            // Fall through to file stats
        }
    }

    // File-based cache stats
    $cacheDir = __DIR__ . '/../cache';
    $fileCount = 0;
    $totalSize = 0;

    if (is_dir($cacheDir)) {
        $files = glob($cacheDir . '/*.cache');
        $fileCount = count($files);

        foreach ($files as $file) {
            $totalSize += filesize($file);
        }
    }

    return [
        'driver' => 'file',
        'status' => 'active',
        'file_count' => $fileCount,
        'total_size' => $totalSize,
        'total_size_human' => formatBytes($totalSize)
    ];
}

/**
 * Calculate Redis hit rate
 * @param array $info Redis info array
 * @return float Hit rate percentage
 */
function calculateHitRate($info) {
    $hits = floatval($info['keyspace_hits'] ?? 0);
    $misses = floatval($info['keyspace_misses'] ?? 0);
    $total = $hits + $misses;

    if ($total == 0) {
        return 0.0;
    }

    return round(($hits / $total) * 100, 2);
}

/**
 * Format bytes to human readable format
 * @param int $bytes Bytes
 * @return string Formatted string
 */
function formatBytes($bytes) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);

    return round($bytes, 2) . ' ' . $units[$pow];
}
