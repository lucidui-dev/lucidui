import { signal, computed, effect, h, mount, For, Show, untrack, version } from "/lucid/index.js";
import { Button, Segmented, Dialog, Tooltip, Kbd, Icon, Menu, Input, Field, EmptyState, hotkey, toast } from "/lucid/ui/index.js";
import { theme, dark } from "/shared/chrome.js";
import { highlight } from "/shared/code.js";
import { TEMPLATES } from "/templates.js";
import { projects, loadProject, saveProject, removeProject, makeProject, snapshot, migrate, fileKind, validName, relink, encodeShare, decodeShare, zip, since } from "/workspace.js";

const store = {
  get(key, fallback) { try { return localStorage.getItem(`lucid-builder:${key}`) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`lucid-builder:${key}`, value); } catch {} },
  drop(key) { try { localStorage.removeItem(`lucid-builder:${key}`); } catch {} }
};

const byKey = Object.fromEntries(TEMPLATES.map(t => [t.value, t]));
migrate(TEMPLATES);
const view = signal("home");
const project = signal(null);
const code = signal("");
const auto = signal(store.get("auto", "on") === "on");
const logs = signal([]);
const runs = signal(0);
const status = signal("idle");
const agentOpen = signal(false);
const guideOpen = signal(store.get("guide") !== "seen");
const fullOpen = signal(false);
const historyOpen = signal(false);
const shareOpen = signal(false);
const naming = signal(null);
const PROJECT = "https://project.lucid";

let frame;
let seq = 0;
let started = 0;
let saveTimer = 0;

effect(() => store.set("auto", auto.value ? "on" : "off"));

const files = () => project.peek()?.files ?? [];
const entryOf = list => list.find(f => f.name === "app.js") ?? list.find(f => fileKind(f.name) === "js") ?? list[0];
const entryText = () => entryOf(files())?.text ?? "";
const unsaved = computed(() => { const p = project.value; if (!p) return false; const v = p.versions[0]; return !v || JSON.stringify(v.files) !== JSON.stringify(p.files); });

const persist = (now = false) => { clearTimeout(saveTimer); const go = () => { const p = project.peek(); if (p && !saveProject(p)) toast("This browser is out of space", { tone: "danger", description: "Download or delete a project to make room." }); }; now ? go() : (saveTimer = setTimeout(go, 300)); };
const update = (fn, { now = false } = {}) => { const p = project.peek(); if (!p) return; project.value = { ...fn(p), updated: Date.now() }; persist(now); };

effect(() => {
  const text = code.value;
  const p = untrack(() => project.peek());
  if (!p) return;
  const f = p.files.find(x => x.name === p.active);
  if (!f || f.text === text) return;
  untrack(() => update(q => ({ ...q, files: q.files.map(x => (x.name === q.active ? { ...x, text } : x)) })));
});

const resolvedTheme = () => (theme.value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme.value);

effect(() => {
  const mode = resolvedTheme();
  const doc = frame?.contentDocument?.documentElement;
  if (doc) doc.dataset.theme = mode;
});

const push = entry => { logs.value = [...logs.peek().slice(-199), { id: ++seq, at: Date.now(), run: runs.peek(), ...entry }]; };

const BOOT = `
(() => {
  const RUN = __RUN__;
  const send = entry => parent.postMessage({ lucidBuilder: RUN, ...entry }, "*");
  const show = value => {
    if (typeof value === "string") return value;
    if (value instanceof Element) return "<" + value.tagName.toLowerCase() + ">";
    if (value instanceof Error) return value.name + ": " + value.message;
    try { return JSON.stringify(value, null, 1).replace(/\\n\\s*/g, " "); } catch { return String(value); }
  };
  for (const level of ["log", "info", "warn", "error"]) {
    const native = console[level].bind(console);
    console[level] = (...args) => { native(...args); send({ kind: "log", level, text: args.map(show).join(" ") }); };
  }
  addEventListener("error", event => send({ kind: "log", level: "error", text: event.message || "Script error" }));
  addEventListener("unhandledrejection", event => send({ kind: "log", level: "error", text: "Unhandled: " + show(event.reason) }));
  window.__lucidReady = () => send({ kind: "ready" });
})();
`;

const HOOK = `
import { onDiagnostic } from "@lucidui-dev/core";
onDiagnostic(d => parent.postMessage({ lucidBuilder: __RUN__, kind: "diagnostic", level: d.level, code: d.code, text: d.message, fix: d.fix, tag: d.element?.tagName?.toLowerCase() }, "*"));
`;

const safe = text => text.replace(/<\/script/gi, "<\\/script");
const dataModule = text => `data:text/javascript;charset=utf-8,${encodeURIComponent(text)}`;
function projectMap(list, entry) {
  const map = {};
  for (const f of list) if (f !== entry && fileKind(f.name) === "js") map[`${PROJECT}/__project/${f.name}`] = dataModule(relink(f.text, PROJECT));
  return map;
}
const projectStyles = list => list.filter(f => fileKind(f.name) === "css").map(f => `<style data-file="${f.name.replace(/"/g, "")}">${f.text.replace(/<\/style/gi, "<\\/style")}</style>`).join("\n");

function documentFor(list, run) {
  const origin = location.origin;
  const v = `?v=${version}`;
  const core = `${origin}/lucid/index.js${v}`;
  const ui = `${origin}/lucid/ui/index.js${v}`;
  const viz = `${origin}/lucid/viz/index.js${v}`;
  const bundle = dataModule(`export * from "${core}"; export * from "${ui}"; export * from "${viz}";`);
  const entry = entryOf(list);
  const map = JSON.stringify({ imports: { "@lucidui-dev/core": core, "@lucidui-dev/core/ui": ui, "@lucidui-dev/core/viz": viz, "@lucidui-dev/core/bundle": bundle, ...projectMap(list, entry) } });
  return `<!doctype html>
<html lang="en" data-theme="${resolvedTheme()}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${origin}/">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap">
<link rel="stylesheet" href="${origin}/lucid/ui/lucid.css${v}">
<style>
  html, body { margin: 0; min-height: 100%; }
  body { padding: 28px; background: var(--lucid-surface); color: var(--lucid-ink); font-family: Geist, system-ui, sans-serif; }
  .demo-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .demo-card { max-width: 380px; padding: 24px; border-radius: 16px; background: var(--lucid-surface-raised); box-shadow: 0 0 0 1px var(--lucid-line), var(--lucid-shadow-sm); }
</style>
${projectStyles(list)}
<script type="importmap">${map}</script>
<script>${safe(BOOT.replaceAll("__RUN__", run))}</script>
<script type="module">${safe(HOOK.replaceAll("__RUN__", run))}</script>
</head>
<body class="lucid-app">
<div id="app"></div>
<script type="module">${safe(relink(entry?.text ?? "", PROJECT))}
window.__lucidReady?.();</script>
</body>
</html>`;
}

const titleFrom = (list, fallback = "Lucid UI app") => { const source = list.map(f => f.text).join("\n"); return ((/h\(\s*["']h1["'][^"']*["']([^"']{2,60})["']/.exec(source) ?? /Heading\([^)]*\)?,?\s*["']([^"']{2,60})["']/.exec(source) ?? [])[1] ?? fallback).replace(/[<>&]/g, ""); };

function cdn(local) {
  const base = local ? `${location.origin}/lucid` : `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@${version}/src`;
  const v = local ? `?v=${version}` : "";
  const core = `${base}/index.js${v}`, ui = `${base}/ui/index.js${v}`, viz = `${base}/viz/index.js${v}`;
  const bundle = local ? dataModule(`export * from "${core}"; export * from "${ui}"; export * from "${viz}";`) : `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@${version}/bundle/lucid.js`;
  return { base, v, imports: { "@lucidui-dev/core": core, "@lucidui-dev/core/ui": ui, "@lucidui-dev/core/viz": viz, "@lucidui-dev/core/bundle": bundle } };
}

const pageHead = (title, base, v) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap">
<link rel="stylesheet" href="${base}/ui/lucid.css${v}">
<style>
  html, body { margin: 0; min-height: 100%; }
  body { padding: 28px; background: var(--lucid-surface); color: var(--lucid-ink); font-family: Geist, system-ui, sans-serif; }
  .demo-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .demo-card { max-width: 380px; padding: 24px; border-radius: 16px; background: var(--lucid-surface-raised); box-shadow: 0 0 0 1px var(--lucid-line), var(--lucid-shadow-sm); }
</style>`;

function standalone(list, { local = false } = {}) {
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

function zipIndex(list) {
  const { base, v, imports } = cdn(false);
  const entry = entryOf(list);
  return `<!doctype html>
<html lang="en">
<head>
${pageHead(titleFrom(list), base, v)}
${list.filter(f => fileKind(f.name) === "css").map(f => `<link rel="stylesheet" href="./${f.name}">`).join("\n")}
<script type="importmap">
${JSON.stringify({ imports }, null, 2)}
</script>
</head>
<body class="lucid-app">
<div id="app"></div>
<script type="module" src="./${entry?.name ?? "app.js"}"></script>
</body>
</html>
`;
}

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lucid-app";

function save(name, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  h("a", { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadZip(p) {
  const readme = `# ${p.name}\n\nBuilt with Lucid UI (https://lucidui.dev) in Builder.\n\nServe this folder with any static server, for example \`npx serve .\`, then open it in a browser. Opening index.html straight from disk won't work, because browsers block ES modules on file://.\n`;
  save(`${slug(p.name)}.zip`, zip([{ name: "index.html", text: zipIndex(p.files) }, ...p.files, { name: "README.md", text: readme }]));
  toast(`${p.name} downloaded`, { tone: "success", description: `${p.files.length} file${p.files.length === 1 ? "" : "s"}, an index.html and a README in one zip.` });
}

const exportActions = {
  open() {
    const url = URL.createObjectURL(new Blob([standalone(files(), { local: true })], { type: "text/html" }));
    const tab = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (!tab) toast("Your browser blocked the new tab", { tone: "danger", description: "Allow pop-ups for build.lucidui.dev, or download index.html instead." });
  },
  zip() { if (project.peek()) downloadZip(project.peek()); },
  html() {
    save("index.html", standalone(files()), "text/html");
    toast("index.html downloaded", { tone: "success", description: `One page with every file inside. Lucid UI ${version} loads from the CDN.` });
  },
  file() {
    const p = project.peek();
    save(p.active, code.peek(), "text/plain");
    toast(`${p.active} downloaded`, { tone: "success" });
  },
  copy() {
    navigator.clipboard?.writeText(code.peek()).then(() => toast("Code copied", { tone: "success" }), () => toast("Copy failed", { tone: "danger" }));
  }
};

function ExportMenu() {
  return Menu({
    placement: "bottom-end",
    width: "270px",
    trigger: Button({ size: "sm", icon: "download", class: "b-export", aria: { label: "Export" } }, h("span", { class: "b-hide-sm" }, "Export")),
    items: [
      { group: "View" },
      { label: "Full screen", icon: "maximize", hint: "⇧⌘F", onSelect: () => { fullOpen.value = true; } },
      { label: "Open in a new tab", icon: "external", hint: "⇧⌘O", onSelect: exportActions.open },
      { separator: true },
      { group: "Take it with you" },
      { label: "Download project (.zip)", icon: "download", hint: "Every file", onSelect: exportActions.zip },
      { label: "Download index.html", icon: "download", hint: "One page", onSelect: exportActions.html },
      { label: "Download this file", icon: "download", onSelect: exportActions.file },
      { label: "Copy this file", icon: "copy", onSelect: exportActions.copy }
    ]
  });
}

let pending = 0;
let primed = false;
let mountedMs = 0;

function run() {
  clearTimeout(pending);
  if (!frame || !project.peek()) return;
  runs.value++;
  status.value = "running";
  started = performance.now();
  push({ kind: "run", level: "run", text: `Run ${runs.peek()} · ${project.peek().name}` });
  frame.srcdoc = documentFor(files(), runs.peek());
}

window.addEventListener("message", event => {
  const data = event.data;
  if (!data || data.lucidBuilder !== runs.peek() || event.source !== frame?.contentWindow) return;
  if (data.kind === "ready") {
    mountedMs = Math.max(1, Math.round(performance.now() - started));
    if (status.peek() !== "error") status.value = "ok";
    push({ kind: "done", level: "ok", text: `Mounted in ${mountedMs} ms` });
    return;
  }
  if (data.level === "error") status.value = "error";
  push({ kind: data.kind, level: data.level, text: data.text, code: data.code, fix: data.fix, tag: data.tag });
});

effect(() => {
  code.value;
  if (!auto.value || !primed) { primed = true; return; }
  clearTimeout(pending);
  pending = setTimeout(run, 650);
});

function go(hash) { if (location.hash !== hash) location.hash = hash; }

function openProject(id, { replace = false } = {}) {
  const p = loadProject(id);
  if (!p) { toast("That project isn't in this browser", { tone: "danger", description: "It may have been deleted, or made in another browser." }); go("#/"); return; }
  persist(true);
  project.value = p;
  code.value = p.files.find(f => f.name === p.active)?.text ?? p.files[0].text;
  view.value = "editor";
  logs.value = [];
  if (replace) history.replaceState(null, "", `#/p/${id}`); else go(`#/p/${id}`);
  queueMicrotask(run);
}

function createProject({ name, files: list, template }) {
  const p = snapshot(makeProject({ name, files: list, template }), "Started");
  saveProject(p);
  openProject(p.id);
  return p;
}

const fromTemplate = t => createProject({ name: t.label, files: [{ name: "app.js", text: t.code }], template: t.value });

function selectFile(name) {
  const p = project.peek();
  if (!p || p.active === name) return;
  update(q => ({ ...q, active: name }));
  code.value = p.files.find(f => f.name === name).text;
}

function saveVersion(label = "Saved by you", quiet = false) {
  const p = project.peek();
  if (!p) return;
  const next = snapshot(p, label);
  if (next === p) { if (!quiet) toast("No changes since the last version", { icon: "clock" }); return; }
  project.value = next;
  persist(true);
  if (!quiet) toast(`Version ${next.versions.length} saved`, { tone: "success", icon: "clock" });
}

function restoreVersion(v) {
  const p = project.peek();
  const before = p.files;
  saveVersion("Before restoring", true);
  update(q => ({ ...q, files: v.files.map(f => ({ ...f })), active: v.files.some(f => f.name === q.active) ? q.active : v.files[0].name }), { now: true });
  code.value = project.peek().files.find(f => f.name === project.peek().active).text;
  run();
  historyOpen.value = false;
  toast("Version restored", { tone: "success", icon: "clock", action: { label: "Undo", onClick: () => { update(q => ({ ...q, files: before, active: before.some(f => f.name === q.active) ? q.active : before[0].name }), { now: true }); code.value = project.peek().files.find(f => f.name === project.peek().active).text; run(); } } });
}

const LEVEL_ICON = { log: "chevron-right", info: "info", warn: "alert-circle", error: "alert-circle", ok: "check-circle", run: "zap" };

function Console() {
  const counts = computed(() => {
    const all = logs.value;
    return { warn: all.filter(e => e.level === "warn").length, error: all.filter(e => e.level === "error").length };
  });
  let list;
  effect(() => {
    logs.value;
    queueMicrotask(() => list && (list.scrollTop = list.scrollHeight));
  });
  const time = at => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return h("section", { class: "b-panel b-console", aria: { label: "Console" } },
    h("header", { class: "b-panel-head" },
      h("span", { class: "b-console-title" }, Icon({ name: "command", size: 13 }), "Console"),
      h("span", { class: "b-count", "data-level": "error", hidden: () => !counts.value.error }, () => `${counts.value.error} error${counts.value.error === 1 ? "" : "s"}`),
      h("span", { class: "b-count", "data-level": "warn", hidden: () => !counts.value.warn }, () => `${counts.value.warn} warning${counts.value.warn === 1 ? "" : "s"}`),
      h("span", { class: "lucid-spacer" }),
      Tooltip({ label: "Clear console" }, Button({ variant: "ghost", size: "xs", icon: "trash", class: "b-ghost", aria: { label: "Clear console" }, onClick: () => { logs.value = []; } }))),
    h("ol", { class: "b-log", ref: el => { list = el; }, aria: { live: "polite" } },
      Show({ when: () => logs.value.length === 0 },
        h("li", { class: "b-log-empty" }, h("span", { class: "b-prompt" }, "›"), "Logs, errors and Lucid diagnostics land here.", h("span", { class: "b-caret" }))),
      For({ each: logs, key: entry => entry.id }, entry => h("li", { class: "b-log-row", "data-level": entry.level, "data-kind": entry.kind },
        h("span", { class: "b-log-icon" }, Icon({ name: LEVEL_ICON[entry.level] ?? "chevron-right", size: 13 })),
        h("div", { class: "b-log-body" },
          entry.code ? h("div", { class: "b-log-head" },
            h("code", { class: "b-log-code" }, entry.code),
            entry.tag ? h("span", { class: "b-log-tag" }, `<${entry.tag}>`) : null) : null,
          h("div", { class: "b-log-text" }, entry.text),
          entry.fix ? h("div", { class: "b-log-fix" }, Icon({ name: "sparkles", size: 12 }), entry.fix) : null),
        h("time", { class: "b-log-time" }, time(entry.at))))));
}

function Preview() {
  return h("section", { class: "b-panel b-preview", aria: { label: "Preview" } },
    h("header", { class: "b-panel-head" },
      h("span", { class: "b-lights", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
      h("span", { class: "b-url" }, Icon({ name: "lock", size: 11 }), "preview.local"),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "b-status", "data-status": status }, h("span", { class: "b-status-dot" }), () => ({ idle: "Ready", running: "Running", ok: "Live", error: "Error" })[status.value]),
      Tooltip({ label: "Reload preview" }, Button({ variant: "ghost", size: "xs", icon: "zap", class: "b-ghost", aria: { label: "Reload preview" }, onClick: run })),
      Tooltip({ label: "Full screen", kbd: ["mod", "shift", "F"] }, Button({ variant: "ghost", size: "xs", icon: "maximize", class: "b-ghost", aria: { label: "Full screen preview" }, onClick: () => { fullOpen.value = true; } }))),
    h("div", { class: "b-stage" },
      h("iframe", { class: "b-frame", title: "Preview", ref: el => { frame = el; } })));
}

const PROMPT = "Build this with Lucid UI from lucidui.dev, the npm package @lucidui-dev/core. Read https://lucidui.dev/llms-full.txt in full first. Import from \"@lucidui-dev/core\", \"@lucidui-dev/core/ui\" and \"@lucidui-dev/core/viz\". Output a single app.js that calls mount(App, \"#app\").";
const ADD_CLAUDE = "claude mcp add --scope user lucid -- npx -y @lucidui-dev/bridge";
const ADD_JSON = `{
  "mcpServers": {
    "lucid": { "command": "npx", "args": ["-y", "@lucidui-dev/bridge"] }
  }
}`;

const bridge = signal(null);
const bridgeState = signal("off");
let source = null;

const bridgeUrl = (path, b = bridge.peek()) => `http://127.0.0.1:${b.port}${path}${path.includes("?") ? "&" : "?"}token=${b.token}`;
const answer = payload => fetch(bridgeUrl("/reply"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});

function readPairing(text) {
  const match = /bridge=(\d{2,5})\.([a-f0-9]{16,64})/i.exec(text ?? "");
  return match ? { port: Number(match[1]), token: match[2] } : null;
}

function settle(run) {
  return new Promise(resolve => {
    const begin = performance.now();
    const check = () => {
      if (runs.peek() !== run) return resolve();
      if (status.peek() !== "running" || performance.now() - begin > 8000) return setTimeout(resolve, 350);
      setTimeout(check, 60);
    };
    check();
  });
}

let lostTimer = 0;

function connectBridge(next, { quiet = false } = {}) {
  source?.close();
  clearTimeout(lostTimer);
  bridge.value = next;
  if (!next) { bridgeState.value = "off"; return; }
  try { sessionStorage.setItem("lucid-builder:bridge", `${next.port}.${next.token}`); } catch {}
  bridgeState.value = "connecting";
  let opened = false;
  source = new EventSource(bridgeUrl("/events", next));
  source.addEventListener("hello", () => {
    opened = true;
    bridgeState.value = "on";
    agentOpen.value = false;
    toast("Agent connected", { tone: "success", description: "Your agent can now render here. Ask it for what you want." });
  });
  source.addEventListener("render", event => agentRender(JSON.parse(event.data)));
  source.addEventListener("get-code", event => answer({ id: JSON.parse(event.data).id, code: entryText() }));
  source.onerror = () => {
    if (!opened) {
      source.close();
      if (quiet) { disconnectBridge(); return; }
      bridgeState.value = "failed";
      return;
    }
    if (bridgeState.peek() === "lost") return;
    bridgeState.value = "lost";
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => {
      if (bridgeState.peek() !== "lost") return;
      source?.close();
      bridgeState.value = "ended";
      toast("Agent disconnected", { icon: "link", description: "Ask your agent to connect again for a new link." });
    }, 8000);
  };
  source.onopen = () => { if (opened) { clearTimeout(lostTimer); bridgeState.value = "on"; } };
}

function disconnectBridge() {
  clearTimeout(lostTimer);
  source?.close();
  source = null;
  bridge.value = null;
  bridgeState.value = "off";
  try { sessionStorage.removeItem("lucid-builder:bridge"); } catch {}
}

const BRIDGE_LABEL = { off: "Connect an agent", connecting: "Connecting…", on: "Agent connected", lost: "Agent reconnecting", failed: "Connect an agent", ended: "Agent disconnected" };

function AgentDialog() {
  const copy = (text, what) => navigator.clipboard?.writeText(text).then(() => toast(`${what} copied`, { tone: "success" }), () => toast("Copy failed", { tone: "danger" }));
  const client = signal("claude");
  const pasted = signal("");
  const step = (n, title, text, action) => h("li", { class: "b-step" },
    h("span", { class: "b-step-num" }, n),
    h("div", { class: "b-step-body" }, h("b", title), h("p", text), action ?? null));
  const tryPaste = () => {
    const found = readPairing(pasted.peek());
    if (!found) { toast("That doesn't look like a pairing link", { tone: "danger", description: "It ends in #bridge= followed by numbers and letters." }); return; }
    connectBridge(found);
  };
  return Dialog({
    open: agentOpen,
    title: "Connect an agent",
    description: "Your coding agent renders straight into this Builder, and gets every error and Lucid diagnostic back with its fix. It all runs on your computer.",
    size: "md"
  },
  () => bridgeState.value === "on" || bridgeState.value === "lost"
    ? h("div", { class: "b-paired" },
        h("span", { class: "b-paired-dot", "data-state": bridgeState }),
        h("div", h("b", () => (bridgeState.value === "on" ? "Your agent is connected" : "Reconnecting to your agent")), h("p", "Ask it for anything, like “make a settings page”. Each render shows up here, and the diagnostics go back to the agent.")),
        Button({ size: "sm", onClick: disconnectBridge }, "Disconnect"))
    : h("ol", { class: "b-steps" },
        step(1, "Add the Lucid bridge to your agent", "Once per machine. It's a tiny MCP server with no dependencies.",
          h("div", { class: "b-client" },
            Segmented({ value: client, size: "sm", aria: { label: "Agent" }, options: [{ value: "claude", label: "Claude Code" }, { value: "json", label: "Cursor and others" }] }),
            () => client.value === "claude"
              ? h("div", { class: "b-copy" }, h("code", ADD_CLAUDE), Button({ size: "xs", icon: "copy", onClick: () => copy(ADD_CLAUDE, "Command") }, "Copy"))
              : h("div", { class: "b-copy b-copy-prompt" }, h("pre", { class: "b-json" }, ADD_JSON), Button({ size: "xs", icon: "copy", onClick: () => copy(ADD_JSON, "Config") }, "Copy")))),
        step(2, "Ask it to connect", "Say “connect to Lucid Builder”. Your agent replies with a pairing link."),
        step(3, "Open the link", "It pairs this tab. If your browser asks to allow access to apps on this device, allow it. Or paste the link here:",
          h("form", { class: "b-pair", onSubmit: event => { event.preventDefault(); tryPaste(); } },
            h("input", { class: "b-pair-input", placeholder: "https://build.lucidui.dev/#bridge=…", value: pasted, onInput: event => { pasted.value = event.target.value; }, aria: { label: "Pairing link" } }),
            Button({ size: "sm", variant: "primary", type: "submit" }, "Pair"))),
        () => bridgeState.value === "failed"
          ? h("p", { class: "b-pair-error" }, Icon({ name: "alert-circle", size: 14 }), "Couldn't reach the bridge. Check your agent is still running, then ask it for a fresh link. Safari can block this; use Chrome, Edge or Firefox.")
          : null),
  h("details", { class: "b-manual" },
    h("summary", "No MCP? Use a prompt instead"),
    h("div", { class: "b-copy b-copy-prompt" }, h("p", PROMPT), Button({ size: "xs", icon: "copy", onClick: () => copy(PROMPT, "Prompt") }, "Copy")),
    h("p", { class: "b-manual-note" }, "Paste what your agent writes into the editor. The console shows each diagnostic and its fix to hand back.")));
}

function GuideDialog() {
  const close = () => { guideOpen.value = false; store.set("guide", "seen"); };
  const way = (n, icon, title, text, action) => h("li", { class: "b-way" },
    h("span", { class: "b-way-icon" }, Icon({ name: icon, size: 17 })),
    h("div", h("span", { class: "b-way-n" }, n), h("b", title), h("p", text), action ?? null));
  const tip = (keys, text) => h("li", h("span", { class: "b-tip-keys" }, keys), h("span", text));
  return Dialog({
    open: guideOpen,
    onClose: close,
    title: "Welcome to Builder",
    description: "A workbench for Lucid UI that runs entirely in your browser. Write an app and watch it render as you type, or let your AI agent build here with you.",
    size: "lg",
    footer: [
      h("span", { class: "b-guide-note" }, Icon({ name: "lock", size: 13 }), "Nothing you write leaves this browser."),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "ghost", href: "https://docs.lucidui.dev" }, "Read the docs"),
      Button({ variant: "primary", iconRight: "arrow-right", onClick: close }, "Start building")
    ]
  },
  h("ol", { class: "b-ways" },
    way("01", "layers", "Start a project", "Seven starters on the projects page: a dashboard, a settings page, a task list, a sign-up form, dialogs, a counter and a diagnostics tour. Each becomes a project you can keep, split into files and share."),
    way("02", "copy", "Paste code from anywhere", "Drop in what an AI chat, a doc or a teammate wrote. If something is off, the console names the problem and gives you the fix."),
    way("03", "link", "Connect your coding agent", "Claude Code, Cursor and other agents can render straight into this tab, read the diagnostics and fix their own mistakes until the page is clean.",
      h("div", { class: "b-way-actions" },
        Button({ size: "sm", icon: "link", onClick: () => { close(); agentOpen.value = true; } }, "Connect an agent"),
        Button({ size: "sm", variant: "ghost", icon: "monitor", href: "https://lucidui.dev/#watch", target: "_blank" }, "Watch it (47s)")))),
  h("div", { class: "b-tips" },
    h("p", { class: "b-tips-title" }, "Good to know"),
    h("ul",
      tip([Kbd("mod", "enter")], "Run the code now. Turn Auto-run off to run only when you ask."),
      tip([h("code", "@lucidui-dev/core")], "Imports work as they would in your project, including /ui and /viz."),
      tip([Icon({ name: "command", size: 13 })], "The console shows logs, errors and every Lucid diagnostic with its fix."),
      tip([Icon({ name: "moon", size: 13 })], "The preview follows the theme switch, so check light and dark."),
      tip([Icon({ name: "download", size: 13 })], "Export opens your build full-screen, or downloads it as a page that runs anywhere."),
      tip([Icon({ name: "clock", size: 13 })], "Projects and their history live in this browser. Share a link or download a zip to take one anywhere."))));
}

function LeaveBuilder() {
  const state = signal("idle");
  let timer = 0;
  const press = () => {
    if (state.peek() === "idle") {
      state.value = "confirm";
      clearTimeout(timer);
      timer = setTimeout(() => { state.value = "idle"; }, 4000);
      return;
    }
    clearTimeout(timer);
    state.value = "leaving";
    setTimeout(() => { location.href = "https://lucidui.dev"; }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320);
  };
  return Tooltip({ label: () => (state.value === "idle" ? "Leave Builder" : "Your draft is saved. Press again to leave") }, h("button", {
    type: "button", class: "b-leave", "data-state": state,
    aria: { label: () => (state.value === "idle" ? "Leave Builder" : "Confirm: leave Builder. Your draft is saved") },
    onClick: press,
    onBlur: () => { if (state.peek() === "confirm") { clearTimeout(timer); state.value = "idle"; } }
  },
  h("span", { class: "b-leave-idle" }, "Leave", Icon({ name: "arrow-right", size: 14 })),
  h("span", { class: "b-leave-confirm" }, () => (state.value === "leaving" ? "Bye" : "Sure?"))));
}

function FileTabs() {
  const list = computed(() => project.value?.files ?? []);
  const active = computed(() => project.value?.active);
  return h("div", { class: "b-tabs", role: "tablist", aria: { label: "Files" } },
    () => list.value.map(f => {
      const isEntry = f === entryOf(list.value);
      const tab = h("button", { type: "button", role: "tab", class: "b-tab", "aria-selected": () => String(active.value === f.name), onClick: () => selectFile(f.name) },
        h("span", { class: "b-tab-ico", "data-kind": fileKind(f.name) }, fileKind(f.name) === "css" ? "#" : "JS"), f.name, isEntry ? h("span", { class: "b-tab-entry", title: "Runs first" }, "main") : null);
      const menu = Menu({
        placement: "bottom-start",
        trigger: Button({ variant: "ghost", size: "xs", icon: "more", class: "b-tab-more", aria: { label: `${f.name} options` } }),
        items: [
          { label: "Rename", icon: "pen", onSelect: () => { naming.value = { kind: "file", current: f.name }; } },
          { label: "Delete", icon: "trash", danger: true, disabled: list.value.length < 2 || isEntry, onSelect: () => removeFile(f.name) }
        ]
      });
      return h("div", { class: "b-tab-wrap", "data-active": () => String(active.value === f.name) }, tab, menu);
    }),
    Tooltip({ label: "New file" }, Button({ variant: "ghost", size: "xs", icon: "plus", class: "b-ghost b-tab-add", aria: { label: "New file" }, onClick: () => { naming.value = { kind: "new-file" }; } })));
}

function removeFile(name) {
  const p = project.peek();
  const gone = p.files.find(f => f.name === name);
  const index = p.files.indexOf(gone);
  update(q => { const rest = q.files.filter(f => f.name !== name); return { ...q, files: rest, active: q.active === name ? rest[0].name : q.active }; }, { now: true });
  code.value = project.peek().files.find(f => f.name === project.peek().active).text;
  run();
  toast(`${name} deleted`, { tone: "danger", icon: "trash", action: { label: "Undo", onClick: () => { update(q => { const next = [...q.files]; next.splice(index, 0, gone); return { ...q, files: next }; }, { now: true }); run(); } } });
}

function Editor() {
  let area;
  let escaped = false;
  const lines = computed(() => code.value.split("\n").length);
  const kind = computed(() => fileKind(project.value?.active ?? "app.js"));
  const keydown = event => {
    if (event.key === "Escape") { escaped = true; return; }
    if (event.key !== "Tab" || escaped) return;
    event.preventDefault();
    const { selectionStart: start, selectionEnd: end, value } = area;
    if (event.shiftKey) {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      if (value.startsWith("  ", lineStart)) {
        area.setRangeText("", lineStart, lineStart + 2, "preserve");
        area.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
      }
    } else area.setRangeText("  ", start, end, "end");
    code.value = area.value;
  };
  return h("section", { class: "b-panel b-editor", aria: { label: "Editor" } },
    h("header", { class: "b-panel-head b-editor-head" },
      FileTabs(),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "b-meta b-hide-sm" }, () => `${lines.value} lines`),
      Tooltip({ label: "Copy this file" }, Button({ variant: "ghost", size: "xs", icon: "copy", class: "b-ghost", aria: { label: "Copy this file" }, onClick: exportActions.copy }))),
    h("div", { class: "b-code" },
      h("div", { class: "b-code-inner" },
        h("pre", { class: "b-code-view", "aria-hidden": "true" }, h("code", () => (kind.value === "css" ? h("span", code.value.endsWith("\n") ? `${code.value} ` : code.value) : highlight(code.value.endsWith("\n") ? `${code.value} ` : code.value, "js")))),
        h("textarea", {
          class: "b-code-input",
          spellcheck: false,
          autocapitalize: "off",
          autocomplete: "off",
          wrap: "off",
          aria: { label: () => `Code editor for ${project.value?.active ?? "app.js"}. Press Escape, then Tab, to leave.` },
          ref: el => { area = el; },
          value: () => code.value,
          onInput: event => { code.value = event.target.value; },
          onKeydown: keydown,
          onFocus: () => { escaped = false; }
        }))),
    h("footer", { class: "b-editor-foot" },
      h("span", Kbd("mod", "enter"), " run"),
      h("span", Kbd("mod", "S"), " save version"),
      h("span", Kbd("esc"), " leave editor"),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "b-meta" }, () => (unsaved.value ? "Saved in this browser · changes since last version" : "Saved in this browser"))));
}

async function agentRender({ id, code: next, summary }) {
  if (!project.peek()) createProject({ name: "Agent project", files: [{ name: "app.js", text: next }], template: null });
  const p = project.peek();
  const entry = entryOf(p.files);
  const before = entry.text;
  if (p.active !== entry.name) selectFile(entry.name);
  code.value = next;
  run();
  const current = runs.peek();
  await settle(current);
  const entries = logs.peek().filter(e => e.run === current && e.kind !== "run" && e.kind !== "done").map(({ level, code: diagnostic, text, fix, tag }) => ({ level, code: diagnostic, text, fix, tag }));
  answer({ id, status: status.peek() === "running" ? "pending" : status.peek(), mountedMs, logs: entries });
  const problems = entries.filter(e => e.level === "error" || e.level === "warn").length;
  saveVersion(`Agent: ${(summary || "updated the code").slice(0, 80)}`, true);
  toast(summary || "Your agent updated the code", {
    tone: problems ? "info" : "success",
    description: problems ? `${problems} issue${problems === 1 ? "" : "s"} sent back to your agent` : "Rendered cleanly and saved as a version",
    action: { label: "Undo", onClick: () => { if (project.peek()?.active !== entry.name) selectFile(entry.name); code.value = before; run(); } }
  });
}

function FullPreview() {
  let full;
  effect(() => {
    if (!fullOpen.value) return;
    queueMicrotask(() => {
      if (!full) return;
      full.onload = () => {
        const doc = full.contentDocument?.documentElement;
        if (doc) doc.dataset.theme = resolvedTheme();
      };
      full.srcdoc = standalone(files(), { local: true });
    });
  });
  return Dialog({ open: fullOpen, class: "b-full", width: "95vw", aria: { label: "Full screen preview" } },
    h("div", { class: "b-full-bar" },
      h("span", { class: "b-lights", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
      h("span", { class: "b-url" }, Icon({ name: "lock", size: 11 }), () => (fullOpen.value ? project.value?.name ?? "" : "")),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "ghost", size: "sm", icon: "external", onClick: exportActions.open }, h("span", { class: "b-hide-sm" }, "Open in a new tab")),
      Tooltip({ label: "Exit full screen", kbd: "esc" }, Button({ variant: "ghost", size: "sm", icon: "minimize", aria: { label: "Exit full screen" }, onClick: () => { fullOpen.value = false; } }))),
    h("iframe", { class: "b-full-frame", title: "Full screen preview", ref: el => { full = el; } }));
}

function NameDialog() {
  const value = signal("");
  const error = signal(null);
  const open = computed(() => Boolean(naming.value));
  const flag = signal(false);
  effect(() => {
    const n = naming.value;
    flag.value = Boolean(n);
    if (!n) return;
    error.value = null;
    value.value = n.kind === "file" ? n.current : n.kind === "project" ? (loadProject(n.id)?.name ?? "") : n.kind === "new-file" ? "" : "";
  });
  const copy = computed(() => ({ "new-file": ["New file", "A .js module you can import with ./name.js, or a .css file that applies to the preview.", "Create file", "utils.js"], file: ["Rename file", "Imports that use the old name need updating too.", "Rename", ""], project: ["Rename project", "Shown on the projects page and in downloads.", "Rename", ""] })[naming.value?.kind ?? "new-file"]);
  const submit = () => {
    const n = naming.peek();
    const v = value.peek().trim();
    if (n.kind === "project") {
      if (!v) { error.value = "Give the project a name"; return; }
      const p = n.id === project.peek()?.id ? project.peek() : loadProject(n.id);
      const next = { ...p, name: v.slice(0, 80), updated: Date.now() };
      if (project.peek()?.id === n.id) project.value = next;
      saveProject(next);
      toast("Project renamed", { tone: "success" });
    } else {
      const p = project.peek();
      const problem = validName(v, p.files, n.kind === "file" ? n.current : null);
      if (problem) { error.value = problem; return; }
      if (n.kind === "new-file") {
        const text = fileKind(v) === "css" ? "" : `export const hello = "from ${v}";\n`;
        update(q => ({ ...q, files: [...q.files, { name: v, text }], active: v }), { now: true });
        code.value = text;
        toast(`${v} created`, { tone: "success", description: fileKind(v) === "js" ? `Import it from app.js with: import { hello } from "./${v}";` : "Its styles apply to the preview right away." });
      } else {
        update(q => ({ ...q, files: q.files.map(f => (f.name === n.current ? { ...f, name: v } : f)), active: q.active === n.current ? v : q.active }), { now: true });
        toast(`Renamed to ${v}`, { tone: "success" });
        run();
      }
    }
    naming.value = null;
  };
  return Dialog({
    open: flag, size: "sm", title: () => copy.value[0], description: () => copy.value[1],
    onClose: () => { naming.value = null; },
    footer: [h("span", { class: "lucid-spacer" }), Button({ variant: "ghost", onClick: () => { naming.value = null; } }, "Cancel"), Button({ variant: "primary", onClick: submit }, () => copy.value[2])]
  },
  Field({ label: () => (naming.value?.kind === "project" ? "Name" : "File name"), error },
    Input({ bind: value, placeholder: () => copy.value[3], autofocus: true, onKeydown: e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }, onInput: () => { error.value = null; } })));
}

function HistoryDialog() {
  return Dialog({ open: historyOpen, size: "md", title: "Version history", description: "Saved automatically after each agent render, and whenever you press Save version. The latest 40 are kept in this browser.",
    footer: [h("span", { class: "lucid-spacer" }), Button({ variant: "ghost", onClick: () => { historyOpen.value = false; } }, "Close"), Button({ variant: "primary", icon: "clock", onClick: () => saveVersion() }, "Save version")] },
  () => {
    const list = project.value?.versions ?? [];
    if (!list.length) return EmptyState({ icon: "clock", title: "No versions yet", description: "Save one now, or let your agent render and it saves one for you." });
    return h("ol", { class: "b-versions" }, list.map((v, i) => h("li",
      h("span", { class: "b-version-n" }, `v${list.length - i}`),
      h("div", { class: "b-version-main" }, h("b", v.label), h("small", `${since(v.at)} · ${v.files.length} file${v.files.length === 1 ? "" : "s"} · ${v.files.reduce((s, f) => s + f.text.split("\n").length, 0)} lines`)),
      i === 0 && !unsaved.value ? h("span", { class: "b-version-current" }, "Current") : Button({ size: "xs", onClick: () => restoreVersion(v) }, "Restore"))));
  });
}

function ShareDialog() {
  const link = signal("");
  const busy = signal(false);
  effect(() => {
    if (!shareOpen.value || !project.peek()) return;
    busy.value = true;
    encodeShare(project.peek()).then(text => { link.value = `${location.origin}/#share=${text}`; busy.value = false; }, () => { link.value = ""; busy.value = false; });
  });
  const copy = () => navigator.clipboard?.writeText(link.peek()).then(() => toast("Share link copied", { tone: "success", description: "Anyone who opens it gets their own copy to edit." }), () => toast("Copy failed", { tone: "danger" }));
  return Dialog({ open: shareOpen, size: "md", title: "Share this project", description: "The whole project travels inside the link, compressed. Nothing is uploaded, and whoever opens it gets their own copy.",
    footer: [h("span", { class: "lucid-spacer" }), Button({ variant: "ghost", onClick: () => { shareOpen.value = false; } }, "Close"), Button({ variant: "primary", icon: "copy", disabled: () => busy.value || !link.value, onClick: copy }, "Copy link")] },
  h("div", { class: "b-share" },
    h("code", { class: "b-share-link" }, () => (busy.value ? "Packing…" : link.value ? `${link.value.slice(0, 120)}${link.value.length > 120 ? "…" : ""}` : "Couldn't pack this project in this browser.")),
    h("small", { class: "b-meta" }, () => (link.value ? `${(link.value.length / 1024).toFixed(1)} KB link${link.value.length > 60000 ? ". Long links can break in some chat apps; send a zip instead." : ""}` : ""))));
}

function Thumb(meta) {
  const host = h("div", { class: "b-thumb", "aria-hidden": "true" });
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const p = loadProject(meta.id);
    if (!p) return;
    const f = h("iframe", { class: "b-thumb-frame", tabindex: -1, title: "", loading: "lazy" });
    f.srcdoc = documentFor(p.files, -1);
    host.append(f);
  }, { rootMargin: "200px" });
  io.observe(host);
  return host;
}

function Home() {
  const list = projects;
  const duplicate = meta => { const p = loadProject(meta.id); if (!p) return; const copy = { ...makeProject({ name: `${p.name} copy`, files: p.files, template: p.template }), versions: [] }; saveProject(snapshot(copy, "Duplicated")); toast(`${copy.name} created`, { tone: "success" }); };
  const remove = meta => { const gone = removeProject(meta.id); toast(`${meta.name} deleted`, { tone: "danger", icon: "trash", action: { label: "Undo", onClick: () => gone && saveProject(gone) } }); };
  const share = meta => { const p = loadProject(meta.id); project.value = p; shareOpen.value = true; };
  return h("main", { class: "b-home" },
    h("section", { class: "b-home-hero" },
      h("div", h("h1", "Your projects"), h("p", "Saved in this browser, with their history. Nothing is uploaded.")),
      h("div", { class: "b-home-actions" },
        Button({ icon: "link", onClick: () => { agentOpen.value = true; } }, "Connect an agent"),
        Button({ variant: "primary", icon: "plus", onClick: () => fromTemplate(byKey.counter ?? TEMPLATES[0]) }, "New project"))),
    h("section", { class: "b-home-start" },
      h("h2", "Start from"),
      h("div", { class: "b-starters" }, TEMPLATES.map(t => h("button", { type: "button", class: "b-starter", onClick: () => fromTemplate(t) },
        h("span", { class: "b-starter-ico" }, Icon({ name: t.icon ?? "layers", size: 16 })), h("b", t.label), h("small", t.note ?? ""))))),
    h("section", { class: "b-home-list" },
      h("h2", () => `Recent${list.value.length ? ` · ${list.value.length}` : ""}`),
      () => (list.value.length ? h("div", { class: "b-projects" }, list.value.map(meta => h("article", { class: "b-project" },
        h("a", { href: `#/p/${meta.id}`, class: "b-project-hit", aria: { label: `Open ${meta.name}` } }, Thumb(meta)),
        h("div", { class: "b-project-meta" },
          h("div", h("b", meta.name), h("small", `${meta.files} file${meta.files === 1 ? "" : "s"} · ${since(meta.updated)}`)),
          Menu({ placement: "bottom-end", trigger: Button({ variant: "ghost", size: "xs", icon: "more", aria: { label: `${meta.name} options` } }), items: [
            { label: "Open", icon: "arrow-right", onSelect: () => openProject(meta.id) },
            { label: "Rename", icon: "pen", onSelect: () => { naming.value = { kind: "project", id: meta.id }; } },
            { label: "Duplicate", icon: "copy", onSelect: () => duplicate(meta) },
            { label: "Share link", icon: "link", onSelect: () => share(meta) },
            { label: "Download (.zip)", icon: "download", onSelect: () => { const p = loadProject(meta.id); if (p) downloadZip(p); } },
            { separator: true },
            { label: "Delete", icon: "trash", danger: true, onSelect: () => remove(meta) }
          ] }))))) : h("div", { class: "b-home-empty" }, EmptyState({ icon: "layers", title: "Start your first project", description: "Pick a starter above, or connect your agent and ask it to build something. Every project keeps its own files and history.", action: Button({ variant: "primary", icon: "plus", onClick: () => fromTemplate(TEMPLATES[0]) }, "New project") })))));
}

function Bar() {
  const inEditor = computed(() => view.value === "editor");
  return h("header", { class: "b-bar", "data-view": view },
    h("a", { class: "b-brand", href: "https://lucidui.dev", aria: { label: "Lucid UI home" } },
      h("img", { src: "/media/logo/lucidui-icon.svg", alt: "", width: 30, height: 30 })),
    h("a", { class: "b-name", href: "#/", aria: { label: "Builder, your projects" } }, "Builder", h("span", { class: "b-pill" }, "Preview")),
    () => (inEditor.value ? [
      h("span", { class: "b-slash", "aria-hidden": "true" }, "/"),
      h("button", { type: "button", class: "b-project-name", onClick: () => { naming.value = { kind: "project", id: project.peek().id }; }, aria: { label: () => `Rename ${project.value?.name}` } }, h("span", { class: "b-project-label" }, () => project.value?.name ?? ""), Icon({ name: "pen", size: 12 })),
      Tooltip({ label: "Version history", kbd: ["mod", "S"] }, Button({ variant: "ghost", size: "sm", icon: "clock", class: "b-ghost b-history-btn", aria: { label: "Version history" }, onClick: () => { historyOpen.value = true; } }, h("span", { class: "b-hide-sm" }, () => `v${project.value?.versions.length ?? 0}`)))
    ] : null),
    h("span", { class: "lucid-spacer" }),
    Tooltip({ label: "What is Builder?" }, Button({ variant: "ghost", size: "sm", icon: "info", class: "b-ghost", aria: { label: "What is Builder?" }, onClick: () => { guideOpen.value = true; } })),
    h("button", { type: "button", class: "b-agent", "data-state": bridgeState, aria: { label: () => BRIDGE_LABEL[bridgeState.value] }, onClick: () => { agentOpen.value = true; } },
      h("span", { class: "b-agent-dot", "aria-hidden": "true" }),
      h("span", { class: "b-hide-sm" }, () => BRIDGE_LABEL[bridgeState.value]),
      h("span", { class: "b-show-sm", "aria-hidden": "true" }, "Agent")),
    () => (inEditor.value ? [
      h("label", { class: "lucid-check b-auto" },
        h("input", { type: "checkbox", role: "switch", checked: auto, onChange: event => { auto.value = event.target.checked; } }),
        h("span", { class: "lucid-switch-track", "aria-hidden": "true" }),
        h("span", { class: "b-hide-sm" }, "Auto-run")),
      Tooltip({ label: "Share link" }, Button({ size: "sm", icon: "link", class: "b-share-btn", aria: { label: "Share link" }, onClick: () => { shareOpen.value = true; } }, h("span", { class: "b-hide-md" }, "Share"))),
      ExportMenu(),
      Button({ variant: "primary", size: "sm", icon: "zap", class: "b-run", kbd: ["mod", "enter"], onClick: run }, "Run")
    ] : null),
    Segmented({
      value: theme,
      size: "sm",
      iconOnly: true,
      class: "b-theme",
      aria: { label: "Theme" },
      options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
    }),
    LeaveBuilder());
}

async function importShare(text) {
  try {
    const data = await decodeShare(text);
    history.replaceState(null, "", location.pathname);
    const p = snapshot(makeProject({ name: data.name, files: data.files, template: null }), "Opened from a share link");
    saveProject(p);
    openProject(p.id, { replace: true });
    toast("Shared project opened", { tone: "success", description: "This is your own copy. Edit away." });
  } catch {
    history.replaceState(null, "", location.pathname);
    toast("That share link is broken", { tone: "danger", description: "It may have been cut short when it was copied." });
    view.value = "home";
  }
}

function route() {
  const hash = location.hash;
  const pairing = readPairing(hash);
  if (pairing) { history.replaceState(null, "", location.pathname + (project.peek() ? `#/p/${project.peek().id}` : "")); connectBridge(pairing); return; }
  const share = /^#share=([A-Za-z0-9_-]+)/.exec(hash);
  if (share) { importShare(share[1]); return; }
  const open = /^#\/p\/([a-z0-9]+)/.exec(hash);
  if (open) { if (project.peek()?.id !== open[1] || view.peek() !== "editor") openProject(open[1], { replace: true }); return; }
  persist(true);
  view.value = "home";
}

function App() {
  hotkey("mod+enter", run, { inputs: true });
  hotkey("mod+s", () => { if (view.peek() === "editor") saveVersion(); }, { inputs: true });
  hotkey("mod+shift+o", () => { if (view.peek() === "editor") exportActions.open(); }, { inputs: true });
  hotkey("mod+shift+f", () => { if (view.peek() === "editor") fullOpen.value = !fullOpen.peek(); }, { inputs: true });
  queueMicrotask(() => {
    let saved = null;
    try { saved = readPairing(`bridge=${sessionStorage.getItem("lucid-builder:bridge")}`); } catch {}
    if (saved && !readPairing(location.hash)) connectBridge(saved, { quiet: true });
    route();
  });
  window.addEventListener("hashchange", route);
  addEventListener("pagehide", () => persist(true));
  return h("div", { class: "b-app", "data-view": view },
    Bar(),
    () => (view.value === "editor"
      ? untrack(() => h("main", { class: "b-main" }, Editor(), h("div", { class: "b-right" }, Preview(), Console())))
      : untrack(() => Home())),
    h("footer", { class: "b-foot" },
      h("span", `Lucid UI v${version}`),
      h("span", { class: "b-foot-dot", "aria-hidden": "true" }),
      h("span", "Runs entirely in your browser. Nothing is uploaded."),
      h("span", { class: "lucid-spacer" }),
      h("a", { href: "https://docs.lucidui.dev" }, "Docs"),
      h("a", { href: "https://sandbox.lucidui.dev" }, "Sandbox"),
      h("a", { href: "https://lucidui.dev" }, "lucidui.dev")),
    AgentDialog(),
    GuideDialog(),
    FullPreview(),
    NameDialog(),
    HistoryDialog(),
    ShareDialog());
}

mount(App, "#app");
