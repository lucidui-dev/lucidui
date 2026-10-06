<?php
$root = dirname(__DIR__);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
$docroot = $_SERVER['DOCUMENT_ROOT'];
$map = [
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
    '/brand/' => $root . '/brand/',
    '/press-kit/' => $root . '/dist/press-kit/',
];
$files = [
    '/llms.txt' => $root . '/llms.txt',
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
