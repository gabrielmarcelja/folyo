<?php
/**
 * Folyo - Cache Cleanup Script
 * Run this periodically via cron to clear expired cache files
 *
 * Usage:
 * - Manual: php /var/www/html/folyo/api/clear-cache.php
 * - Cron: 0 * * * * php /var/www/html/folyo/api/clear-cache.php
 */

require_once 'database.php';

$cacheDir = __DIR__ . '/../cache';
$deletedCount = 0;
$errorCount = 0;

if (!is_dir($cacheDir)) {
    echo "Cache directory does not exist.\n";
    exit(0);
}

$files = glob($cacheDir . '/*.cache');

foreach ($files as $file) {
    try {
        $data = file_get_contents($file);
        $cached = json_decode($data, true);

        // Check if expired
        if (!$cached || !isset($cached['expires']) || $cached['expires'] < time()) {
            if (@unlink($file)) {
                $deletedCount++;
            } else {
                $errorCount++;
            }
        }
    } catch (Exception $e) {
        $errorCount++;
        error_log("Error processing cache file {$file}: " . $e->getMessage());
    }
}

echo "Cache cleanup completed.\n";
echo "Deleted: {$deletedCount} expired cache files\n";
echo "Errors: {$errorCount}\n";
echo "Total files checked: " . count($files) . "\n";
