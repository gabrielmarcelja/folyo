<?php
// Test script to see how headers are received
$headers = getallheaders();
echo "All headers:\n";
print_r($headers);
echo "\n\nLooking for X-CSRF-Token:\n";
foreach ($headers as $key => $value) {
    if (stripos($key, 'csrf') !== false) {
        echo "Found: $key => $value\n";
    }
}
