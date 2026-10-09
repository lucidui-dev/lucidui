<?php
require_once __DIR__ . '/store.php';

function relay_valid($key) {
    return is_string($key) && preg_match('/^[A-Za-z0-9]{24}$/', $key) === 1;
}

function relay_dir($key) {
    return lucid_store('relay/' . $key);
}

function relay_new() {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    $key = '';
    $bytes = random_bytes(24);
    for ($i = 0; $i < 24; $i++) $key .= $chars[ord($bytes[$i]) % strlen($chars)];
    relay_dir($key);
    return $key;
}

function relay_exists($key) {
    return relay_valid($key) && is_dir(lucid_store('relay') . '/' . $key);
}

function relay_locked($key, $fn) {
    $lock = fopen(relay_dir($key) . '/.lock', 'c');
    flock($lock, LOCK_EX);
    try { return $fn(relay_dir($key)); } finally { flock($lock, LOCK_UN); fclose($lock); }
}

function relay_push($key, $event) {
    relay_locked($key, function ($dir) use ($event) {
        $file = $dir . '/queue.json';
        $queue = is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
        $queue[] = $event;
        file_put_contents($file, json_encode(array_slice($queue, -20)));
    });
}

function relay_take($key) {
    return relay_locked($key, function ($dir) {
        $file = $dir . '/queue.json';
        $queue = is_file($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
        if ($queue) file_put_contents($file, '[]');
        return $queue;
    });
}

function relay_touch($key) {
    @touch(relay_dir($key) . '/seen');
}

function relay_seen($key) {
    $file = relay_dir($key) . '/seen';
    return is_file($file) ? time() - filemtime($file) : PHP_INT_MAX;
}

function relay_reply_put($key, $id, $data) {
    if (preg_match('/^[A-Za-z0-9]{8,32}$/', (string) $id) !== 1) return;
    file_put_contents(relay_dir($key) . '/reply-' . $id . '.json', json_encode($data), LOCK_EX);
}

function relay_wait($key, $id, $seconds) {
    $file = relay_dir($key) . '/reply-' . $id . '.json';
    $until = microtime(true) + $seconds;
    while (microtime(true) < $until) {
        clearstatcache(true, $file);
        if (is_file($file)) {
            $data = json_decode(file_get_contents($file), true);
            @unlink($file);
            return $data;
        }
        usleep(250000);
    }
    return null;
}

function relay_id() {
    return bin2hex(random_bytes(8));
}
