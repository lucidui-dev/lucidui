<?php
require __DIR__ . '/relay-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$key = $_GET['key'] ?? '';
if (!relay_exists($key)) { http_response_code(404); echo json_encode(['error' => 'gone']); exit; }
$step = $_GET['step'] ?? 'poll';

if ($step === 'poll') {
    $first = relay_seen($key) === PHP_INT_MAX;
    relay_touch($key);
    echo json_encode(['events' => relay_take($key), 'first' => $first]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }

if ($step === 'reply') {
    $data = json_decode((string) file_get_contents('php://input', false, null, 0, 600000), true);
    if (!is_array($data) || empty($data['id'])) { http_response_code(400); echo json_encode(['error' => 'bad']); exit; }
    relay_touch($key);
    relay_reply_put($key, $data['id'], $data);
    echo json_encode(['ok' => true]);
    exit;
}

if ($step === 'bye') {
    @unlink(relay_dir($key) . '/seen');
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(404);
