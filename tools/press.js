import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SITE = "https://lucidui.dev";
const PAGES = ["/", "/components/", "/manifesto/", "/case/", "/lisa/", "/press/", "/privacy/", "/license/", "/status/"];

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(r, { releaseDate, releasePath }) {
  const url = `${SITE}${releasePath(r)}`;
  const title = `${r.headline} · Lucid UI`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(r.sub)}">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#09090a" media="(prefers-color-scheme: dark)">
  <meta property="og:site_name" content="Lucid UI">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(r.headline)}">
  <meta property="og:description" content="${esc(r.sub)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="/media/og/og-default.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="article:published_time" content="${r.date}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@lucidui_">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="text/plain" href="/press/${r.slug}.txt" title="Plain text">
  <link rel="icon" href="/media/icons/favicon.ico" sizes="48x48">
  <link rel="icon" href="/media/icons/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/media/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&family=Rubik:wght@700&display=swap">
  <link rel="stylesheet" href="/lucid/ui/lucid.css">
  <link rel="stylesheet" href="/shared/site.css">
  <link rel="stylesheet" href="/press/release.css">
</head>
<body class="lucid-app site">
  <div id="app">
    <noscript>
      <main class="site-wrap site-noscript">
        <p>${esc(r.immediate)}</p>
        <h1>${esc(r.headline)}</h1>
        <p>${esc(r.sub)}</p>
        <p><strong>${esc(r.place)}, ${esc(releaseDate(r.date))}.</strong> ${esc(r.lead)}</p>
        ${r.body.map(p => `<p>${esc(p)}</p>`).join("\n        ")}
        <blockquote><p>“${esc(r.quote)}”</p><p>${esc(r.quoteBy)}</p></blockquote>
        <h2>${esc(r.availabilityTitle)}</h2>
        <p>${esc(r.availability)}</p>
        <h2>${esc(r.aboutTitle)}</h2>
        <p>${esc(r.about)}</p>
        <p><a href="/media/press/${r.pdf}">Download the PDF</a> · <a href="/press/${r.slug}.txt">Plain text</a> · <a href="mailto:press@lucidui.dev">press@lucidui.dev</a></p>
      </main>
    </noscript>
  </div>
  <script type="module" src="/press/release.js"></script>
</body>
</html>
`;
}

function sitemap(releases, { releasePath }) {
  const urls = [...PAGES.map(path => ({ path })), ...releases.map(r => ({ path: releasePath(r), date: r.date }))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u.path}</loc>${u.date ? `<lastmod>${u.date}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}

export async function pressFiles(root) {
  const mod = await import(pathToFileURL(join(root, "sites/www/press/releases.js")).href);
  const files = { "sites/www/sitemap.xml": sitemap(mod.RELEASES, mod) };
  for (const r of mod.RELEASES) {
    files[`sites/www/press/${r.slug}/index.html`] = page(r, mod);
    files[`sites/www/press/${r.slug}.txt`] = mod.releaseText(r);
  }
  return files;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  for (const [path, content] of Object.entries(await pressFiles(root))) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
    console.log(`wrote ${path}`);
  }
}
