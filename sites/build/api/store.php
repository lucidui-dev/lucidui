<?php
function lucid_store($sub = '') {
    $base = getenv('LUCID_SHARES') ?: dirname($_SERVER['DOCUMENT_ROOT']) . '/lucid-shares';
    if (!is_dir($base)) {
        @mkdir($base, 0750, true);
        @file_put_contents($base . '/.htaccess', "Require all denied\nDeny from all\n");
    }
    $dir = $sub === '' ? $base : $base . '/' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    return $dir;
}

function lucid_valid_id($id) {
    return is_string($id) && preg_match('/^[A-Za-z0-9]{8}$/', $id) === 1;
}

function lucid_read($id) {
    if (!lucid_valid_id($id)) return null;
    $file = lucid_store('s') . '/' . $id . '.txt';
    return is_file($file) ? file_get_contents($file) : null;
}

function lucid_limit($kind, $max) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $file = lucid_store('rate') . '/' . hash('sha256', $kind . '|' . $ip . '|' . gmdate('YmdH')) . '.txt';
    $count = is_file($file) ? (int) file_get_contents($file) : 0;
    if ($count >= $max) return false;
    file_put_contents($file, (string) ($count + 1), LOCK_EX);
    return true;
}

function lucid_new_id() {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    do {
        $id = '';
        $bytes = random_bytes(8);
        for ($i = 0; $i < 8; $i++) $id .= $chars[ord($bytes[$i]) % strlen($chars)];
    } while (is_file(lucid_store('s') . '/' . $id . '.txt'));
    return $id;
}

function lucid_unpack($text) {
    $raw = base64_decode(strtr($text, '-_', '+/') . str_repeat('=', (4 - strlen($text) % 4) % 4), true);
    if ($raw === false) return null;
    $json = @gzinflate($raw, 2000000);
    if ($json === false) return null;
    $data = json_decode($json, true);
    return is_array($data) && ($data['v'] ?? 0) === 1 && !empty($data['files']) && is_array($data['files']) ? $data : null;
}
