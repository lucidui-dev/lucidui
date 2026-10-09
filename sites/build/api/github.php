<?php
require __DIR__ . '/store.php';

const GITHUB_CLIENT_ID = 'Ov23liGxPV5iXb2xH6ND';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply($status, $body) {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function github_post($url, $fields) {
    $body = http_build_query($fields);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: Lucid-Builder']]);
        $out = curl_exec($ch);
    } else {
        $out = @file_get_contents($url, false, stream_context_create(['http' => ['method' => 'POST', 'header' => "Accept: application/json\r\nUser-Agent: Lucid-Builder\r\nContent-Type: application/x-www-form-urlencoded\r\n", 'content' => $body, 'timeout' => 15]]));
    }
    $data = is_string($out) ? json_decode($out, true) : null;
    return is_array($data) ? $data : null;
}

$client = GITHUB_CLIENT_ID ?: trim((string) @file_get_contents(lucid_store() . '/github-client-id.txt'));
$step = $_GET['step'] ?? 'status';

if ($step === 'status') reply(200, ['enabled' => $client !== '']);
if ($client === '') reply(503, ['error' => 'not configured']);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, ['error' => 'method']);

if ($step === 'start') {
    if (!lucid_limit('github', 20)) reply(429, ['error' => 'slow down']);
    $data = github_post('https://github.com/login/device/code', ['client_id' => $client, 'scope' => 'public_repo']);
    if (!$data || empty($data['device_code'])) reply(502, ['error' => 'github']);
    reply(200, [
        'device_code' => $data['device_code'],
        'user_code' => $data['user_code'],
        'verification_uri' => $data['verification_uri'] ?? 'https://github.com/login/device',
        'interval' => (int) ($data['interval'] ?? 5),
        'expires_in' => (int) ($data['expires_in'] ?? 900),
    ]);
}

if ($step === 'poll') {
    $device = (string) file_get_contents('php://input', false, null, 0, 200);
    if (preg_match('/^[A-Za-z0-9_-]{8,100}$/', $device) !== 1) reply(400, ['error' => 'bad code']);
    $data = github_post('https://github.com/login/oauth/access_token', ['client_id' => $client, 'device_code' => $device, 'grant_type' => 'urn:ietf:params:oauth:grant-type:device_code']);
    if (!$data) reply(502, ['error' => 'github']);
    if (!empty($data['access_token'])) reply(200, ['token' => $data['access_token']]);
    reply(200, ['pending' => $data['error'] ?? 'authorization_pending', 'interval' => (int) ($data['interval'] ?? 0)]);
}

reply(404, ['error' => 'step']);
