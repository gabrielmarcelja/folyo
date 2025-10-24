<?php
/**
 * Folyo - Rate Limits Cleanup Script
 * Run this periodically via cron to clear expired rate limit files
 *
 * Usage:
 * - Manual: php /var/www/html/folyo/api/clear-rate-limits.php
 * - Cron: Run every 15 minutes - (crontab format: 0,15,30,45 * * * *)
 */

$rateLimitDir = __DIR__ . '/../cache/rate-limits';
$deletedCount = 0;
$errorCount = 0;
$now = time();

if (!is_dir($rateLimitDir)) {
    echo "Rate limit directory does not exist.\n";
    exit(0);
}

$files = glob($rateLimitDir . '/*.json');

foreach ($files as $file) {
    try {
        $data = file_get_contents($file);
        $rateLimit = json_decode($data, true);

        if (!$rateLimit) {
            // Invalid JSON, delete it
            if (@unlink($file)) {
                $deletedCount++;
            }
            continue;
        }

        // Check if all attempts are expired (older than 15 minutes)
        $allExpired = true;
        if (isset($rateLimit['attempts']) && is_array($rateLimit['attempts'])) {
            foreach ($rateLimit['attempts'] as $timestamp) {
                if ($timestamp > ($now - 900)) { // 15 minutes
                    $allExpired = false;
                    break;
                }
            }
        }

        // Check if block has expired
        $blockExpired = true;
        if (isset($rateLimit['blocked_until']) && $rateLimit['blocked_until'] > $now) {
            $blockExpired = false;
        }

        // Delete if both attempts and block are expired
        if ($allExpired && $blockExpired) {
            if (@unlink($file)) {
                $deletedCount++;
            } else {
                $errorCount++;
            }
        }
    } catch (Exception $e) {
        $errorCount++;
        error_log("Error processing rate limit file {$file}: " . $e->getMessage());
    }
}

echo "Rate limit cleanup completed.\n";
echo "Deleted: {$deletedCount} expired rate limit files\n";
echo "Errors: {$errorCount}\n";
echo "Total files checked: " . count($files) . "\n";
