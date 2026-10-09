<?php
$root = dirname(__DIR__);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$docroot = $_SERVER['DOCUMENT_ROOT'];
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Private-Network: true');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    return true;
}
if (preg_match('#^/s/([A-Za-z0-9]{8})/?$#', $path, $m) && is_file($docroot . '/api/page.php')) {
    $_GET['id'] = $m[1];
    require $docroot . '/api/page.php';
    return true;
}
if (preg_match('#^/mcp/?$#', $path) && is_file($docroot . '/api/mcp.php')) {
    require $docroot . '/api/mcp.php';
    return true;
}
if (preg_match('#^/a/([A-Za-z0-9]{8})/?$#', $path, $m) && is_file($docroot . '/api/app.php')) {
    $_GET['id'] = $m[1];
    require $docroot . '/api/app.php';
    return true;
}
if (preg_match('#^/[a-z0-9-]+/?$#', $path) && !is_dir($docroot . $path) && preg_match('#RewriteRule \^\(([a-z|-]+)\)#', (string) @file_get_contents($docroot . '/.htaccess'), $routes) && in_array(trim($path, '/'), explode('|', $routes[1]), true)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($docroot . '/index.html');
    return true;
}
if (str_ends_with($path, '.php') && is_file($docroot . $path)) {
    return false;
}
$map = [
    '/tracker/' => $root . '/examples/tracker/',
    '/transit/' => $root . '/examples/transit/',
    '/campaign/' => $root . '/examples/campaign/',
    '/checkin/' => $root . '/examples/checkin/',
    '/fitness/' => $root . '/examples/fitness/',
    '/beats/' => $root . '/examples/beats/',
    '/maison/' => $root . '/examples/maison/',
    '/clinic/' => $root . '/examples/clinic/',
    '/lucid/' => $root . '/src/',
    '/shared/' => $root . '/sites/shared/',
    '/docs/' => $root . '/docs/',
    '/media/press/' => $root . '/dist/press-kit/',
    '/media/' => $root . '/media/',
];
$files = [
    '/llms.txt' => $root . '/llms.txt',
    '/llms-full.txt' => $root . '/llms-full.txt',
    '/LICENSE.txt' => $root . '/LICENSE',
];
$base = $docroot . '/';
$relative = ltrim($path, '/');
if (isset($files[$path])) {
    $base = dirname($files[$path]) . '/';
    $relative = basename($files[$path]);
}
foreach ($map as $prefix => $dir) {
    if (!isset($files[$path]) && str_starts_with($path, $prefix)) {
        $base = $dir;
        $relative = substr($path, strlen($prefix));
        break;
    }
}
if ($relative === '' || str_ends_with($relative, '/')) {
    $relative .= 'index.html';
}
$file = realpath($base . $relative);
$limit = realpath($base);
if ($file === false || $limit === false || !str_starts_with($file, $limit) || !is_file($file)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    return true;
}
$types = [
    'html' => 'text/html; charset=utf-8',
    'js' => 'text/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'json' => 'application/json',
    'txt' => 'text/plain; charset=utf-8',
    'md' => 'text/markdown; charset=utf-8',
    '' => 'text/plain; charset=utf-8',
    'zip' => 'application/zip',
    'woff2' => 'font/woff2',
];
header('Content-Type: ' . ($types[strtolower(pathinfo($file, PATHINFO_EXTENSION))] ?? 'application/octet-stream'));
header('Cache-Control: no-store');
readfile($file);
return true;
