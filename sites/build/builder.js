import { signal, computed, effect, h, mount, For, Show, version } from "/lucid/index.js";
import { Button, Select, Segmented, Dialog, Tooltip, Kbd, Icon, Menu, hotkey, toast } from "/lucid/ui/index.js";
import { theme, dark } from "/shared/chrome.js";
import { highlight } from "/shared/code.js";
import { TEMPLATES } from "/templates.js";

const store = {
  get(key, fallback) { try { return localStorage.getItem(`lucid-builder:${key}`) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`lucid-builder:${key}`, value); } catch {} },
  drop(key) { try { localStorage.removeItem(`lucid-builder:${key}`); } catch {} }
};

const byKey = Object.fromEntries(TEMPLATES.map(t => [t.value, t]));
const template = signal(byKey[store.get("template")] ? store.get("template") : TEMPLATES[0].value);
const code = signal(store.get(`draft2:${template.peek()}`, byKey[template.peek()].code));
const auto = signal(store.get("auto", "on") === "on");
const logs = signal([]);
const runs = signal(0);
const status = signal("idle");
const agentOpen = signal(false);
const guideOpen = signal(store.get("guide") !== "seen");
const fullOpen = signal(false);
try { Object.keys(localStorage).filter(key => key.startsWith("lucid-builder:draft:")).forEach(key => localStorage.removeItem(key)); } catch {}
const dirty = computed(() => code.value !== byKey[template.value].code);

let frame;
let seq = 0;
let started = 0;

effect(() => store.set("template", template.value));
effect(() => store.set("auto", auto.value ? "on" : "off"));
effect(() => {
  const value = code.value;
  if (value === byKey[template.peek()].code) store.drop(`draft2:${template.peek()}`);
  else store.set(`draft2:${template.peek()}`, value);
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

function documentFor(source, run) {
  const origin = location.origin;
  const v = `?v=${version}`;
  const core = `${origin}/lucid/index.js${v}`;
  const ui = `${origin}/lucid/ui/index.js${v}`;
  const viz = `${origin}/lucid/viz/index.js${v}`;
  const bundle = `data:text/javascript,${encodeURIComponent(`export * from "${core}"; export * from "${ui}"; export * from "${viz}";`)}`;
  const map = JSON.stringify({ imports: { "@lucidui-dev/core": core, "@lucidui-dev/core/ui": ui, "@lucidui-dev/core/viz": viz, "@lucidui-dev/core/bundle": bundle } });
  const safe = text => text.replace(/<\/script/gi, "<\\/script");
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
<script type="importmap">${map}</script>
<script>${safe(BOOT.replaceAll("__RUN__", run))}</script>
<script type="module">${safe(HOOK.replaceAll("__RUN__", run))}</script>
</head>
<body class="lucid-app">
<div id="app"></div>
<script type="module">${safe(source)}
window.__lucidReady?.();</script>
</body>
</html>`;
}

function standalone(source, { local = false } = {}) {
  const base = local ? `${location.origin}/lucid` : `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@${version}/src`;
  const v = local ? `?v=${version}` : "";
  const core = `${base}/index.js${v}`;
  const ui = `${base}/ui/index.js${v}`;
  const viz = `${base}/viz/index.js${v}`;
  const bundle = local
    ? `data:text/javascript,${encodeURIComponent(`export * from "${core}"; export * from "${ui}"; export * from "${viz}";`)}`
    : `https://cdn.jsdelivr.net/npm/@lucidui-dev/core@${version}/bundle/lucid.js`;
  const map = JSON.stringify({ imports: { "@lucidui-dev/core": core, "@lucidui-dev/core/ui": ui, "@lucidui-dev/core/viz": viz, "@lucidui-dev/core/bundle": bundle } }, null, 2);
  const title = (/h\(\s*["']h1["'][^"']*["']([^"']{2,60})["']/.exec(source) ?? /Heading\([^)]*\)?,?\s*["']([^"']{2,60})["']/.exec(source) ?? [])[1] ?? "Lucid UI app";
  const safe = text => text.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<>&]/g, "")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap">
<link rel="stylesheet" href="${base}/ui/lucid.css${v}">
<style>
  html, body { margin: 0; min-height: 100%; }
  body { padding: 28px; background: var(--lucid-surface); color: var(--lucid-ink); font-family: Geist, system-ui, sans-serif; }
  .demo-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .demo-card { max-width: 380px; padding: 24px; border-radius: 16px; background: var(--lucid-surface-raised); box-shadow: 0 0 0 1px var(--lucid-line), var(--lucid-shadow-sm); }
</style>
<script type="importmap">
${map}
</script>
</head>
<body class="lucid-app">
<div id="app"></div>
<script type="module">
${safe(source.trim())}
</script>
</body>
</html>
`;
}

function save(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  h("a", { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const exportActions = {
  open() {
    const url = URL.createObjectURL(new Blob([standalone(code.peek(), { local: true })], { type: "text/html" }));
    const tab = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (!tab) toast("Your browser blocked the new tab", { tone: "danger", description: "Allow pop-ups for build.lucidui.dev, or download index.html instead." });
  },
  html() {
    save("index.html", standalone(code.peek()), "text/html");
    toast("index.html downloaded", { tone: "success", description: `Opens anywhere. Lucid UI ${version} loads from the CDN.` });
  },
  js() {
    save("app.js", code.peek(), "text/javascript");
    toast("app.js downloaded", { tone: "success", description: "Import it from a page that maps @lucidui-dev/core, or use it in your project." });
  },
  copy() {
    navigator.clipboard?.writeText(code.peek()).then(() => toast("Code copied", { tone: "success" }), () => toast("Copy failed", { tone: "danger" }));
  }
};

function ExportMenu() {
  return Menu({
    placement: "bottom-end",
    width: "260px",
    trigger: Button({ size: "sm", icon: "download", class: "b-export", aria: { label: "Export" } }, h("span", { class: "b-hide-sm" }, "Export")),
    items: [
      { group: "View" },
      { label: "Full screen", icon: "maximize", hint: "⇧⌘F", onSelect: () => { fullOpen.value = true; } },
      { label: "Open in a new tab", icon: "external", hint: "⇧⌘O", onSelect: exportActions.open },
      { separator: true },
      { group: "Take it with you" },
      { label: "Download index.html", icon: "download", hint: "Runs anywhere", onSelect: exportActions.html },
      { label: "Download app.js", icon: "download", hint: "Just the code", onSelect: exportActions.js },
      { label: "Copy code", icon: "copy", onSelect: exportActions.copy }
    ]
  });
}

let pending = 0;
let primed = false;
let mountedMs = 0;

function run() {
  clearTimeout(pending);
  if (!frame) return;
  runs.value++;
  status.value = "running";
  started = performance.now();
  push({ kind: "run", level: "run", text: `Run ${runs.peek()} · ${byKey[template.peek()].label}` });
  frame.srcdoc = documentFor(code.peek(), runs.peek());
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

function Editor() {
  let area;
  let escaped = false;
  const lines = computed(() => code.value.split("\n").length);
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
    h("header", { class: "b-panel-head" },
      h("span", { class: "b-tab" }, h("span", { class: "b-tab-dot", "data-dirty": dirty }), "app.js"),
      h("span", { class: "b-meta" }, () => `${lines.value} lines`),
      h("span", { class: "lucid-spacer" }),
      Tooltip({ label: "Copy code" }, Button({ variant: "ghost", size: "xs", icon: "copy", class: "b-ghost", aria: { label: "Copy code" }, onClick: () => {
        navigator.clipboard?.writeText(code.peek()).then(() => toast("Copied to clipboard", { tone: "success" }), () => toast("Copy failed", { tone: "danger" }));
      } })),
      Tooltip({ label: "Reset to template" }, Button({ variant: "ghost", size: "xs", icon: "corner-down-left", class: "b-ghost", aria: { label: "Reset to template" }, disabled: () => !dirty.value, onClick: () => {
        code.value = byKey[template.peek()].code;
        run();
        toast("Template restored", { description: byKey[template.peek()].label });
      } }))),
    h("div", { class: "b-code" },
      h("div", { class: "b-code-inner" },
        h("pre", { class: "b-code-view", "aria-hidden": "true" }, h("code", () => highlight(code.value.endsWith("\n") ? `${code.value} ` : code.value, "js"))),
        h("textarea", {
          class: "b-code-input",
          spellcheck: false,
          autocapitalize: "off",
          autocomplete: "off",
          wrap: "off",
          aria: { label: "Code editor. Press Escape, then Tab, to leave." },
          ref: el => { area = el; },
          value: () => code.value,
          onInput: event => { code.value = event.target.value; },
          onKeydown: keydown,
          onFocus: () => { escaped = false; }
        }))),
    h("footer", { class: "b-editor-foot" },
      h("span", Kbd("mod", "enter"), " run"),
      h("span", Kbd("tab"), " indent"),
      h("span", Kbd("esc"), " leave editor"),
      h("span", { class: "lucid-spacer" }),
      h("span", { class: "b-meta" }, "Saved in this browser")));
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

async function agentRender({ id, code: next, summary }) {
  const before = code.peek();
  code.value = next;
  run();
  const current = runs.peek();
  await settle(current);
  const entries = logs.peek().filter(e => e.run === current && e.kind !== "run" && e.kind !== "done").map(({ level, code: diagnostic, text, fix, tag }) => ({ level, code: diagnostic, text, fix, tag }));
  answer({ id, status: status.peek() === "running" ? "pending" : status.peek(), mountedMs, logs: entries });
  const problems = entries.filter(e => e.level === "error" || e.level === "warn").length;
  toast(summary || "Your agent updated the code", {
    tone: problems ? "info" : "success",
    description: problems ? `${problems} issue${problems === 1 ? "" : "s"} sent back to your agent` : "Rendered cleanly",
    action: { label: "Undo", onClick: () => { code.value = before; run(); } }
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
  source.addEventListener("get-code", event => answer({ id: JSON.parse(event.data).id, code: code.peek() }));
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

function FullPreview() {
  let full;
  const titleOf = source => (/<title>([^<]*)<\/title>/.exec(standalone(source)) ?? [])[1] ?? "Lucid UI app";
  effect(() => {
    if (!fullOpen.value) return;
    queueMicrotask(() => {
      if (!full) return;
      full.onload = () => {
        const doc = full.contentDocument?.documentElement;
        if (doc) doc.dataset.theme = resolvedTheme();
      };
      full.srcdoc = standalone(code.peek(), { local: true });
    });
  });
  return Dialog({ open: fullOpen, class: "b-full", width: "95vw", aria: { label: "Full screen preview" } },
    h("div", { class: "b-full-bar" },
      h("span", { class: "b-lights", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
      h("span", { class: "b-url" }, Icon({ name: "lock", size: 11 }), () => (fullOpen.value ? titleOf(code.value) : "")),
      h("span", { class: "lucid-spacer" }),
      Button({ variant: "ghost", size: "sm", icon: "external", onClick: exportActions.open }, h("span", { class: "b-hide-sm" }, "Open in a new tab")),
      Tooltip({ label: "Exit full screen", kbd: "esc" }, Button({ variant: "ghost", size: "sm", icon: "minimize", aria: { label: "Exit full screen" }, onClick: () => { fullOpen.value = false; } }))),
    h("iframe", { class: "b-full-frame", title: "Full screen preview", ref: el => { full = el; } }));
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
    way("01", "layers", "Start from a template", "Seven starters in the menu at the top: a dashboard, a settings page, a task list, a sign-up form, dialogs, a counter and a diagnostics tour. Edit the code on the left, and the preview reruns as you type."),
    way("02", "copy", "Paste code from anywhere", "Drop in what an AI chat, a doc or a teammate wrote. If something is off, the console names the problem and gives you the fix."),
    way("03", "link", "Connect your coding agent", "Claude Code, Cursor and other agents can render straight into this tab, read the diagnostics and fix their own mistakes until the page is clean.",
      h("div", { class: "b-way-actions" },
        Button({ size: "sm", icon: "link", onClick: () => { close(); agentOpen.value = true; } }, "Connect an agent"),
        Button({ size: "sm", variant: "ghost", icon: "monitor", href: "https://lucidui.dev/#watch", target: "_blank" }, "Watch it (70s)")))),
  h("div", { class: "b-tips" },
    h("p", { class: "b-tips-title" }, "Good to know"),
    h("ul",
      tip([Kbd("mod", "enter")], "Run the code now. Turn Auto-run off to run only when you ask."),
      tip([h("code", "@lucidui-dev/core")], "Imports work as they would in your project, including /ui and /viz."),
      tip([Icon({ name: "command", size: 13 })], "The console shows logs, errors and every Lucid diagnostic with its fix."),
      tip([Icon({ name: "moon", size: 13 })], "The preview follows the theme switch, so check light and dark."),
      tip([Icon({ name: "download", size: 13 })], "Export opens your build full-screen, or downloads it as a page that runs anywhere."),
      tip([Icon({ name: "clock", size: 13 })], "Each template keeps your draft in this browser until you reset it."))));
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
  h("span", { class: "b-leave-idle" }, h("span", { class: "b-hide-sm" }, "Leave"), Icon({ name: "arrow-right", size: 14 })),
  h("span", { class: "b-leave-confirm" }, () => (state.value === "leaving" ? "Bye" : "Sure?"))));
}

function Bar() {
  return h("header", { class: "b-bar" },
    h("a", { class: "b-brand", href: "https://lucidui.dev", aria: { label: "Lucid UI home" } },
      h("img", { src: () => (dark() ? "/media/logo/lucidui-wordmark-on-dark.svg" : "/media/logo/lucidui-wordmark-on-light.svg"), alt: "Lucid UI", height: 22, width: 111 })),
    h("span", { class: "b-slash", "aria-hidden": "true" }, "/"),
    h("span", { class: "b-name" }, "Builder", h("span", { class: "b-pill" }, "Preview")),
    Select({
      value: template,
      size: "sm",
      class: "b-template",
      aria: { label: "Template" },
      options: TEMPLATES.map(({ value, label, icon, note }) => ({ value, label, icon, keywords: note })),
      onChange: next => {
        code.value = store.get(`draft2:${next}`, byKey[next].code);
        queueMicrotask(run);
      }
    }),
    h("span", { class: "lucid-spacer" }),
    Tooltip({ label: "What is Builder?" }, Button({ variant: "ghost", size: "sm", icon: "info", class: "b-ghost", aria: { label: "What is Builder?" }, onClick: () => { guideOpen.value = true; } })),
    h("button", { type: "button", class: "b-agent", "data-state": bridgeState, onClick: () => { agentOpen.value = true; } },
      h("span", { class: "b-agent-dot", "aria-hidden": "true" }),
      h("span", { class: "b-hide-sm" }, () => BRIDGE_LABEL[bridgeState.value])),
    h("label", { class: "lucid-check b-auto" },
      h("input", { type: "checkbox", role: "switch", checked: auto, onChange: event => { auto.value = event.target.checked; } }),
      h("span", { class: "lucid-switch-track", "aria-hidden": "true" }),
      h("span", { class: "b-hide-sm" }, "Auto-run")),
    ExportMenu(),
    Button({ variant: "primary", size: "sm", icon: "zap", class: "b-run", kbd: ["mod", "enter"], onClick: run }, "Run"),
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

function App() {
  hotkey("mod+enter", run, { inputs: true });
  hotkey("mod+shift+o", exportActions.open, { inputs: true });
  hotkey("mod+shift+f", () => { fullOpen.value = !fullOpen.peek(); }, { inputs: true });
  queueMicrotask(run);
  queueMicrotask(() => {
    const fromHash = readPairing(location.hash);
    let saved = null;
    try { saved = readPairing(`bridge=${sessionStorage.getItem("lucid-builder:bridge")}`); } catch {}
    if (fromHash) history.replaceState(null, "", location.pathname + location.search);
    if (fromHash) connectBridge(fromHash);
    else if (saved) connectBridge(saved, { quiet: true });
  });
  window.addEventListener("hashchange", () => {
    const next = readPairing(location.hash);
    if (!next) return;
    history.replaceState(null, "", location.pathname + location.search);
    connectBridge(next);
  });
  return h("div", { class: "b-app" },
    Bar(),
    h("main", { class: "b-main" },
      Editor(),
      h("div", { class: "b-right" }, Preview(), Console())),
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
    FullPreview());
}

mount(App, "#app");
