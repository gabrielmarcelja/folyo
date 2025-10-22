<?php
/**
 * Folyo - CoinMarketCap API Proxy
 * Resolve CORS issues by proxying requests to CMC API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Load environment variables
function loadEnv() {
    $envFile = __DIR__ . '/../.env';
    if (!file_exists($envFile)) {
        return null;
    }
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
    return $_ENV['CMC_API_KEY'] ?? null;
}

$apiKey = loadEnv();

if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'API key not configured']);
    exit;
}

// Get parameters
$endpoint = $_GET['endpoint'] ?? '';
$start = $_GET['start'] ?? '1';
$limit = $_GET['limit'] ?? '100';
$convert = $_GET['convert'] ?? 'USD';
$ids = $_GET['ids'] ?? '';

// Base URL
$baseUrl = 'https://pro-api.coinmarketcap.com';
$url = '';

// Build URL based on endpoint
switch ($endpoint) {
    case 'listings':
        $url = "$baseUrl/v1/cryptocurrency/listings/latest?start=$start&limit=$limit&convert=$convert";
        break;

    case 'global-metrics':
        $url = "$baseUrl/v1/global-metrics/quotes/latest?convert=$convert";
        break;

    case 'fear-greed':
        // Using Alternative.me API (free, no key required)
        $url = "https://api.alternative.me/fng/";
        break;

    case 'crypto-info':
        if (empty($ids)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing ids parameter']);
            exit;
        }
        $url = "$baseUrl/v2/cryptocurrency/info?id=$ids";
        break;

    case 'ohlcv-historical':
        if (empty($ids)) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing ids parameter']);
            exit;
        }
        $count = $_GET['count'] ?? '8';
        $interval = $_GET['interval'] ?? 'daily';
        $url = "$baseUrl/v2/cryptocurrency/ohlcv/historical?id=$ids&count=$count&interval=$interval&convert=$convert";
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid endpoint']);
        exit;
}

// Make request to API
$ch = curl_init();

// Prepare headers (Alternative.me doesn't need API key)
$headers = ["Accept: application/json"];
if ($endpoint !== 'fear-greed') {
    $headers[] = "X-CMC_PRO_API_KEY: $apiKey";
}

curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'Request failed: ' . $error]);
    exit;
}

http_response_code($httpCode);
echo $response;
?>