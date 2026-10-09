<?php
require __DIR__ . '/store.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply($status, $body) {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $text = lucid_read($_GET['id'] ?? '');
    if ($text === null) reply(404, ['error' => 'gone']);
    header('Cache-Control: public, max-age=300');
    reply(200, ['data' => $text]);
}

if ($method !== 'POST') reply(405, ['error' => 'method']);

if (isset($_GET['report'])) {
    $id = $_GET['report'];
    if (!lucid_valid_id($id) || lucid_read($id) === null) reply(404, ['error' => 'gone']);
    if (!lucid_limit('report', 20)) reply(429, ['error' => 'slow down']);
    $who = substr(hash('sha256', $_SERVER['REMOTE_ADDR'] ?? ''), 0, 12);
    $note = substr(preg_replace('/[\r\n\t]+/', ' ', (string) file_get_contents('php://input')), 0, 300);
    file_put_contents(lucid_store() . '/reports.log', gmdate('c') . "\t" . $id . "\t" . $who . "\t" . $note . "\n", FILE_APPEND | LOCK_EX);
    reply(200, ['ok' => true]);
}

$text = file_get_contents('php://input', false, null, 0, 262145);
if ($text === false || strlen($text) === 0) reply(400, ['error' => 'empty']);
if (strlen($text) > 262144) reply(413, ['error' => 'too big']);
if (preg_match('/^[A-Za-z0-9_-]+$/', $text) !== 1 || lucid_unpack($text) === null) reply(400, ['error' => 'not a project']);

$hash = lucid_store('hash') . '/' . hash('sha256', $text) . '.txt';
if (is_file($hash)) {
    $id = trim(file_get_contents($hash));
    if (lucid_read($id) !== null) reply(200, ['id' => $id]);
}

if (!lucid_limit('share', 30)) reply(429, ['error' => 'slow down']);

$id = lucid_new_id();
file_put_contents(lucid_store('s') . '/' . $id . '.txt', $text, LOCK_EX);
file_put_contents($hash, $id, LOCK_EX);
reply(200, ['id' => $id]);
