<?php
require __DIR__ . '/relay-lib.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Authorization');
header('Access-Control-Expose-Headers: Mcp-Session-Id');
header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method === 'DELETE') { http_response_code(204); exit; }
if ($method !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=utf-8');
    echo "Lucid UI hosted bridge. Add https://build.lucidui.dev/mcp to your AI app as a remote MCP connector.\n";
    exit;
}

header('Content-Type: application/json; charset=utf-8');
set_time_limit(60);

$host = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'build.lucidui.dev');
if (in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost:8745', '127.0.0.1:8745'], true)) $host = 'http://' . $_SERVER['HTTP_HOST'];
$session = (string) ($_SERVER['HTTP_MCP_SESSION_ID'] ?? '');
if (preg_match('/^[A-Za-z0-9-]{8,80}$/', $session) !== 1) $session = '';

function session_key($session, $create) {
    if ($session === '') return null;
    $file = lucid_store('relay-sessions') . '/' . hash('sha256', $session) . '.txt';
    if (is_file($file)) {
        $key = trim(file_get_contents($file));
        if (relay_exists($key)) return $key;
    }
    if (!$create) return null;
    $key = relay_new();
    file_put_contents($file, $key);
    return $key;
}

function link_for($key) {
    global $host;
    return $host . '/#relay=' . $key;
}

function paired($key) {
    return $key && relay_seen($key) <= 8;
}

function not_paired($key) {
    $link = $key ? link_for($key) : null;
    return $link
        ? "No Lucid Builder tab is paired yet. Ask the user to open this link, then try again:\n$link"
        : 'No Lucid Builder tab is paired yet. Call connect_builder first and show the user the link it returns.';
}

function module_from($code) {
    $text = trim((string) $code);
    if ($text === '' || $text[0] !== '<') return $text;
    preg_match_all('/<script[^>]*type=["\']module["\'][^>]*>([\s\S]*?)<\/script>/i', $text, $m);
    $scripts = array_filter(array_map('trim', $m[1]));
    return $scripts ? implode("\n\n", $scripts) : $text;
}

function report($result) {
    if (!$result) return ['The Builder did not answer in time. It may be busy, or the tab is closed or in the background. Ask the user to check the tab, then call render again.', true];
    $logs = is_array($result['logs'] ?? null) ? $result['logs'] : [];
    $problems = array_values(array_filter($logs, function ($e) { return in_array($e['level'] ?? '', ['error', 'warn'], true); }));
    $status = $result['status'] ?? '';
    $lines = [];
    $lines[] = $status === 'ok' ? 'Rendered in Lucid Builder. Mounted in ' . (int) ($result['mountedMs'] ?? 0) . ' ms.' : ($status === 'error' ? 'The code ran in Lucid Builder but threw an error.' : 'The code was sent to Lucid Builder but did not finish mounting.');
    if (!$problems) $lines[] = 'No errors and no Lucid diagnostics.';
    foreach ($problems as $e) {
        $head = !empty($e['code']) ? $e['level'] . ' ' . $e['code'] : $e['level'];
        $lines[] = '- ' . $head . ': ' . ($e['text'] ?? '') . (!empty($e['tag']) ? ' (on <' . $e['tag'] . '>)' : '') . (!empty($e['fix']) ? "\n  Fix: " . $e['fix'] : '');
    }
    $notes = array_values(array_filter($logs, function ($e) { return in_array($e['level'] ?? '', ['log', 'info'], true); }));
    if ($notes) $lines[] = "Console:\n" . implode("\n", array_map(function ($e) { return '  ' . ($e['text'] ?? ''); }, array_slice($notes, -10)));
    if ($problems) $lines[] = 'Apply each fix, then call render again.';
    return [implode("\n", $lines), $status === 'error'];
}

$pairing = ['type' => 'string', 'description' => 'The pairing code from connect_builder. Only needed if your client does not keep an MCP session.'];
$TOOLS = [
    ['name' => 'connect_builder', 'description' => "Get the link that pairs this conversation with Lucid Builder (build.lucidui.dev) in the user's browser. Show the link to the user and ask them to open it. Call this first if render says no Builder is paired.", 'inputSchema' => ['type' => 'object', 'properties' => new stdClass(), 'additionalProperties' => false]],
    ['name' => 'render', 'description' => "Run a Lucid UI app in the user's paired Lucid Builder tab and get back the result: whether it mounted, runtime errors, console output, and Lucid diagnostics with their fixes. The code is one ES module that imports from \"@lucidui-dev/core\" (or \"@lucidui-dev/core/ui\", \"@lucidui-dev/core/viz\") and calls mount(App, \"#app\"). Read https://lucidui.dev/llms-full.txt before writing code. After each render, apply every fix you are given and render again until it is clean.", 'inputSchema' => ['type' => 'object', 'properties' => ['code' => ['type' => 'string', 'description' => 'The complete app as one ES module. A full HTML page also works; its inline module script is used.'], 'summary' => ['type' => 'string', 'description' => 'Optional. A few words on what changed, shown to the user in the Builder.'], 'pairing' => $pairing], 'required' => ['code'], 'additionalProperties' => false]],
    ['name' => 'get_code', 'description' => "Read the code currently in the user's Lucid Builder editor, including any edits they made by hand.", 'inputSchema' => ['type' => 'object', 'properties' => ['pairing' => $pairing], 'additionalProperties' => false]],
    ['name' => 'status', 'description' => 'Check whether a Lucid Builder tab is paired with this conversation.', 'inputSchema' => ['type' => 'object', 'properties' => ['pairing' => $pairing], 'additionalProperties' => false]],
];

function respond($id, $result) { echo json_encode(['jsonrpc' => '2.0', 'id' => $id, 'result' => $result], JSON_UNESCAPED_SLASHES); exit; }
function fail($id, $code, $message) { echo json_encode(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => $code, 'message' => $message]]); exit; }
function text($id, $text, $error = false) { respond($id, ['content' => [['type' => 'text', 'text' => $text]], 'isError' => $error]); }

$raw = (string) file_get_contents('php://input', false, null, 0, 600000);
$message = json_decode($raw, true);
if (!is_array($message)) fail(null, -32700, 'Parse error');
if (isset($message[0])) fail(null, -32600, 'Batches are not supported');
$id = $message['id'] ?? null;
$rpc = $message['method'] ?? '';
$params = is_array($message['params'] ?? null) ? $message['params'] : [];

if ($rpc === 'initialize') {
    if (!lucid_limit('mcp-init', 120)) fail($id, -32000, 'Too many connections from here. Try again later.');
    header('Mcp-Session-Id: ' . bin2hex(random_bytes(16)));
    respond($id, [
        'protocolVersion' => is_string($params['protocolVersion'] ?? null) ? $params['protocolVersion'] : '2025-06-18',
        'capabilities' => ['tools' => new stdClass()],
        'serverInfo' => ['name' => 'lucid-hosted-bridge', 'version' => '1.0.0'],
        'instructions' => 'Lucid UI hosted bridge. Call connect_builder and show the user the link to pair their Lucid Builder tab. Then call render with your code; it returns errors and Lucid diagnostics with fixes. Repeat until render reports no problems.',
    ]);
}

if ($id === null) { http_response_code(202); exit; }
if ($rpc === 'ping') respond($id, new stdClass());
if ($rpc === 'tools/list') respond($id, ['tools' => $TOOLS]);
if ($rpc !== 'tools/call') fail($id, -32601, 'Method not found: ' . $rpc);

$name = $params['name'] ?? '';
$args = is_array($params['arguments'] ?? null) ? $params['arguments'] : [];
$given = is_string($args['pairing'] ?? null) && relay_exists($args['pairing']) ? $args['pairing'] : null;

if ($name === 'connect_builder') {
    $key = $given ?: session_key($session, true);
    if (!$key) {
        if (!lucid_limit('relay-new', 60)) text($id, 'Too many pairings from here in the last hour. Try again later.', true);
        $key = relay_new();
    }
    if (paired($key)) text($id, "Lucid Builder is already paired. You can call render now.\nPairing link, if the user needs to reopen it: " . link_for($key) . "\nPairing code: $key");
    text($id, "Ask the user to open this link in their browser. It pairs their Lucid Builder tab with you:\n" . link_for($key) . "\nPairing code: $key (pass it as pairing to render, get_code and status if your client does not keep a session).");
}

$key = $given ?: session_key($session, false);

if ($name === 'status') text($id, paired($key) ? 'Lucid Builder is paired and ready.' : not_paired($key));

if ($name === 'render') {
    if (!paired($key)) text($id, not_paired($key), true);
    $code = module_from($args['code'] ?? '');
    if ($code === '') text($id, 'render needs code: one ES module that mounts into "#app".', true);
    $job = relay_id();
    relay_push($key, ['type' => 'render', 'id' => $job, 'code' => $code, 'summary' => mb_substr((string) ($args['summary'] ?? ''), 0, 140)]);
    [$out, $error] = report(relay_wait($key, $job, 30));
    text($id, $out, $error);
}

if ($name === 'get_code') {
    if (!paired($key)) text($id, not_paired($key), true);
    $job = relay_id();
    relay_push($key, ['type' => 'get-code', 'id' => $job]);
    $result = relay_wait($key, $job, 15);
    $result ? text($id, (string) ($result['code'] ?? '')) : text($id, 'The Builder did not answer in time.', true);
}

fail($id, -32602, 'Unknown tool: ' . $name);
