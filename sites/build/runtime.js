import { version } from "/lucid/index.js";
import { fileKind, relink } from "/workspace.js";

export const SANDBOX = "allow-scripts allow-forms allow-popups allow-downloads";
export const PROJECT = "https://project.lucid";
export const entryOf = list => list.find(f => f.name === "app.js") ?? list.find(f => fileKind(f.name) === "js") ?? list[0];

export const safe = text => text.replace(/<\/script/gi, "<\\/script");
export const dataModule = text => `data:text/javascript;charset=utf-8,${encodeURIComponent(text)}`;
export function projectMap(list, entry) {
  const map = {};
  for (const f of list) if (f !== entry && fileKind(f.name) === "js") map[`${PROJECT}/__project/${f.name}`] = dataModule(relink(f.text, PROJECT));
  return map;
}
export const projectStyles = list => list.filter(f => fileKind(f.name) === "css").map(f => `<style data-file="${f.name.replace(/"/g, "")}">${f.text.replace(/<\/style/gi, "<\\/style")}</style>`).join("\n");

export const titleFrom = (list, fallback = "Lucid UI app") => { const source = list.map(f => f.text).join("\n"); return ((/h\(\s*["']h1["'][^"']*["']([^"']{2,60})["']/.exec(source) ?? /Heading\([^)]*\)?,?\s*["']([^"']{2,60})["']/.exec(source) ?? [])[1] ?? fallback).replace(/[<>&]/g, ""); };

export function cdn(local) {
  const base = local ? `${location.origin}/lucid` : `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@${version}/src`;
  const v = local ? `?v=${version}` : "";
  const core = `${base}/index.js${v}`, ui = `${base}/ui/index.js${v}`, viz = `${base}/viz/index.js${v}`;
  const bundle = local ? dataModule(`export * from "${core}"; export * from "${ui}"; export * from "${viz}";`) : `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@${version}/bundle/lucid.js`;
  return { base, v, imports: { "@lucidui-dev/core": core, "@lucidui-dev/core/ui": ui, "@lucidui-dev/core/viz": viz, "@lucidui-dev/core/bundle": bundle } };
}

export const pageHead = (title, base, v) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap">
<link rel="stylesheet" href="${base}/ui/lucid.css${v}">
<style>
  html, body { margin: 0; min-height: 100%; }
  body { min-height: 100vh; box-sizing: border-box; }
  body { padding: 28px; background: var(--lucid-surface); color: var(--lucid-ink); font-family: Geist, system-ui, sans-serif; }
  .demo-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .demo-card { max-width: 380px; padding: 24px; border-radius: 16px; background: var(--lucid-surface-raised); box-shadow: 0 0 0 1px var(--lucid-line), var(--lucid-shadow-sm); }
</style>`;

export function standalone(list, { local = false } = {}) {
  const { base, v, imports } = cdn(local);
  const entry = entryOf(list);
  const map = JSON.stringify({ imports: { ...imports, ...projectMap(list, entry) } }, null, 2);
  return `<!doctype html>
<html lang="en">
<head>
${pageHead(titleFrom(list), base, v)}
${projectStyles(list)}
<script type="importmap">
${map}
</script>
</head>
<body class="lucid-app">
<div id="app"></div>
<script type="module">
${safe(relink(entry?.text ?? "", PROJECT).trim())}
</script>
</body>
</html>
`;
}

