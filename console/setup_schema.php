<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL_CA'];
foreach ($required as $key) {
    if (getenv($key) === false || getenv($key) === '') {
        fwrite(STDERR, "Missing required environment variable: {$key}" . PHP_EOL);
        exit(1);
    }
}

$caPath = getenv('DB_SSL_CA');
if (!is_readable($caPath)) {
    fwrite(STDERR, 'Aiven CA certificate is missing or unreadable at DB_SSL_CA.' . PHP_EOL);
    exit(1);
}

if (!defined('PDO::MYSQL_ATTR_SSL_CA')) {
    fwrite(STDERR, 'PDO MySQL TLS support is unavailable.' . PHP_EOL);
    exit(1);
}

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::MYSQL_ATTR_SSL_CA => $caPath,
];
if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
}

$charset = getenv('DB_CHARSET') ?: 'utf8mb4';
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
    getenv('DB_HOST'),
    getenv('DB_PORT'),
    getenv('DB_NAME'),
    $charset
);

try {
    $pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASSWORD'), $options);
    $schema = file_get_contents(__DIR__ . '/../database/lab6_schema.sql');
    if ($schema === false) {
        throw new RuntimeException('Could not read database/lab6_schema.sql.');
    }

    foreach (explode(';', $schema) as $statement) {
        $statement = trim($statement);
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }

    fwrite(STDOUT, 'Aiven schema applied successfully.' . PHP_EOL);
} catch (Throwable $error) {
    fwrite(STDERR, 'Schema setup failed: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}