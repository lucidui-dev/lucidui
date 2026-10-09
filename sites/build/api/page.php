<?php
require __DIR__ . '/store.php';

$page = file_get_contents(dirname(__DIR__) . '/index.html');
$id = $_GET['id'] ?? '';
$text = lucid_read($id);
$data = $text === null ? null : lucid_unpack($text);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');
if ($data === null) {
    echo $page;
    exit;
}
$name = mb_substr(trim((string) ($data['name'] ?? 'Shared project')), 0, 80) ?: 'Shared project';
$count = count($data['files']);
$title = htmlspecialchars($name . ' · Lucid Builder', ENT_QUOTES);
$about = htmlspecialchars('A project built with Lucid UI, ' . $count . ' file' . ($count === 1 ? '' : 's') . '. Open it in Builder to run it and get your own copy to edit.', ENT_QUOTES);
$url = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'build.lucidui.dev') . '/s/' . $id;
$swap = function ($pattern, $value, $limit = 1) use (&$page) {
    $page = preg_replace_callback($pattern, function ($m) use ($value) { return $m[1] . $value; }, $page, $limit);
};
$swap('/(<title>)[^<]*/', $title);
$swap('/(<meta property="og:title" content=")[^"]*/', $title);
$swap('/(<meta (?:name="description"|property="og:description") content=")[^"]*/', $about, 2);
$swap('/(<meta property="og:url" content=")[^"]*/', htmlspecialchars($url, ENT_QUOTES));
$page = str_replace('</head>', "  <meta name=\"robots\" content=\"noindex\">\n</head>", $page);
echo $page;
