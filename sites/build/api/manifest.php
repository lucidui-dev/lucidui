<?php
require __DIR__ . '/store.php';

$id = $_GET['id'] ?? '';
$data = lucid_unpack((string) lucid_read($id));
if ($data === null) {
    http_response_code(404);
    exit;
}
$name = mb_substr(trim((string) ($data['name'] ?? '')), 0, 80) ?: 'Lucid app';
$media = 'https://media.lucidui.dev/icons/';
header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: public, max-age=300');
echo json_encode([
    'id' => '/a/' . $id,
    'name' => $name,
    'short_name' => mb_substr($name, 0, 24),
    'description' => 'Made with Lucid Builder',
    'start_url' => '/a/' . $id,
    'scope' => '/a/' . $id,
    'display' => 'standalone',
    'background_color' => '#09090a',
    'theme_color' => '#09090a',
    'icons' => [
        ['src' => $media . 'icon-192.png', 'sizes' => '192x192', 'type' => 'image/png'],
        ['src' => $media . 'icon-512.png', 'sizes' => '512x512', 'type' => 'image/png'],
        ['src' => $media . 'icon-maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
    ],
], JSON_UNESCAPED_SLASHES);
