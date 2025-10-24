<?php
/**
 * Folyo - Database Connection
 * PDO connection to MariaDB database
 */

// Load environment variables from .env file
function loadEnv($filePath = __DIR__ . '/../.env') {
    if (!file_exists($filePath)) {
        throw new Exception('.env file not found. Please copy .env.example to .env and configure it.');
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments and empty lines
        if (strpos(trim($line), '#') === 0 || trim($line) === '') {
            continue;
        }

        // Parse line
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            // Set as environment variable if not already set
            if (!array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
    }
}

// Load environment variables
loadEnv();

// Database configuration from environment variables
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'folyo');
define('DB_USER', $_ENV['DB_USER'] ?? 'folyo_user');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', $_ENV['DB_CHARSET'] ?? 'utf8mb4');

// Global PDO connection
$pdo = null;

/**
 * Get database connection (singleton pattern)
 * @return PDO Database connection
 * @throws PDOException If connection fails
 */
function getDB() {
    global $pdo;

    // Return existing connection if available
    if ($pdo !== null) {
        return $pdo;
    }

    // Create new connection
    try {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

        return $pdo;

    } catch (PDOException $e) {
        // Log error (in production, use proper logging)
        error_log('Database connection failed: ' . $e->getMessage());

        // Throw exception to be handled by caller
        throw new PDOException(
            'Database connection failed: ' . $e->getMessage(),
            (int)$e->getCode()
        );
    }
}

/**
 * Close database connection
 */
function closeDB() {
    global $pdo;
    $pdo = null;
}

/**
 * Execute a query and return all results
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters for prepared statement
 * @return array Query results
 */
function query($sql, $params = []) {
    $pdo = getDB();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/**
 * Execute a query and return single row
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters for prepared statement
 * @return array|false Single row or false if not found
 */
function queryOne($sql, $params = []) {
    $pdo = getDB();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetch();
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 * @param string $sql SQL query with placeholders
 * @param array $params Parameters for prepared statement
 * @return int Number of affected rows
 */
function execute($sql, $params = []) {
    $pdo = getDB();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->rowCount();
}

/**
 * Get last inserted ID
 * @return string Last insert ID
 */
function lastInsertId() {
    $pdo = getDB();
    return $pdo->lastInsertId();
}

/**
 * Begin database transaction
 */
function beginTransaction() {
    $pdo = getDB();
    return $pdo->beginTransaction();
}

/**
 * Commit database transaction
 */
function commit() {
    $pdo = getDB();
    return $pdo->commit();
}

/**
 * Rollback database transaction
 */
function rollback() {
    $pdo = getDB();
    return $pdo->rollBack();
}

/**
 * Get the base URL of the application
 * @return string Base URL (e.g., "https://example.com")
 */
function getBaseUrl() {
    // Check if HTTPS is enabled
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
               $_SERVER['SERVER_PORT'] == 443 ||
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    $protocol = $isHttps ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

    return $protocol . $host;
}

// Include cache abstraction layer
// This provides getCache(), setCache(), and clearCache() functions
// Supports both Redis (primary) and file-based (fallback) caching
require_once __DIR__ . '/cache.php';
