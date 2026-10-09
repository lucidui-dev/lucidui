<?php
require __DIR__ . '/store.php';

$id = $_GET['id'] ?? '';
$text = lucid_read($id);
$data = $text === null ? null : lucid_unpack($text);
$name = $data === null ? 'App not found' : (mb_substr(trim((string) ($data['name'] ?? '')), 0, 80) ?: 'Lucid app');
$host = $_SERVER['HTTP_HOST'] ?? 'build.lucidui.dev';
$fill = [
    '__TITLE__' => htmlspecialchars($name, ENT_QUOTES),
    '__SHORT__' => htmlspecialchars(mb_substr($name, 0, 24), ENT_QUOTES),
    '__DESC__' => htmlspecialchars($data === null ? 'This app has been removed.' : 'An app made with Lucid Builder. Open it, use it, or remix it into your own copy.', ENT_QUOTES),
    '__URL__' => htmlspecialchars('https://' . $host . '/a/' . (lucid_valid_id($id) ? $id : ''), ENT_QUOTES),
    '__ID__' => lucid_valid_id($id) ? $id : '',
];
if ($data === null) http_response_code(404);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');
echo strtr(file_get_contents(dirname(__DIR__) . '/app.html'), $fill);
