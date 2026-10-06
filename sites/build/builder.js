import { signal, computed, effect, h, mount, For, Show, version } from "/lucid/index.js";
import { Button, Select, Segmented, Dialog, Tooltip, Kbd, Icon, hotkey, toast } from "/lucid/ui/index.js";
import { theme } from "/shared/chrome.js";
import { highlight } from "/shared/code.js";
import { TEMPLATES } from "/templates.js";

const store = {
  get(key, fallback) { try { return localStorage.getItem(`lucid-builder:${key}`) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`lucid-builder:${key}`, value); } catch {} },
  drop(key) { try { localStorage.removeItem(`lucid-builder:${key}`); } catch {} }
};

const byKey = Object.fromEntries(TEMPLATES.map(t => [t.value, t]));
const template = signal(byKey[store.get("template")] ? store.get("template") : TEMPLATES[0].value);
const code = signal(store.get(`draft:${template.peek()}`, byKey[template.peek()].code));
const auto = signal(store.get("auto", "on") === "on");
const logs = signal([]);
const runs = signal(0);
const status = signal("idle");
const agentOpen = signal(false);
const dirty = computed(() => code.value !== byKey[template.value].code);

let frame;
let seq = 0;
let started = 0;

effect(() => store.set("template", template.value));
effect(() => store.set("auto", auto.value ? "on" : "off"));
effect(() => {
  const value = code.value;
  if (value === byKey[template.peek()].code) store.drop(`draft:${template.peek()}`);
  else store.set(`draft:${template.peek()}`, value);
});

const resolvedTheme = () => (theme.value === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme.value);

effect(() => {
  const mode = resolvedTheme();
  const doc = frame?.contentDocument?.documentElement;
  if (doc) doc.dataset.theme = mode;
});

const push = entry => { logs.value = [...logs.peek().slice(-199), { id: ++seq, at: Date.now(), ...entry }]; };

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
import { onDiagnostic } from "lucidui";
onDiagnostic(d => parent.postMessage({ lucidBuilder: __RUN__, kind: "diagnostic", level: d.level, code: d.code, text: d.message, fix: d.fix, tag: d.element?.tagName?.toLowerCase() }, "*"));
`;

function documentFor(source, run) {
  const origin = location.origin;
  const map = JSON.stringify({ imports: { lucidui: `${origin}/lucid/index.js`, "lucidui/ui": `${origin}/lucid/ui/index.js`, "lucidui/viz": `${origin}/lucid/viz/index.js` } });
  const safe = text => text.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html>
<html lang="en" data-theme="${resolvedTheme()}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${origin}/">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap">
<link rel="stylesheet" href="${origin}/lucid/ui/lucid.css">
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

let pending = 0;
let primed = false;

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
    status.value = "ok";
    push({ kind: "done", level: "ok", text: `Mounted in ${Math.max(1, Math.round(performance.now() - started))} ms` });
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
      Tooltip({ label: "Reload preview" }, Button({ variant: "ghost", size: "xs", icon: "zap", class: "b-ghost", aria: { label: "Reload preview" }, onClick: run }))),
    h("div", { class: "b-stage" },
      h("iframe", { class: "b-frame", title: "Preview", ref: el => { frame = el; } })));
}

const PROMPT = "You are writing UI with Lucid UI, a dependency-free runtime. Read https://lucidui.dev/llms.txt first. Import from \"lucidui\", \"lucidui/ui\" and \"lucidui/viz\". Components run once; use signals for state. Output a single app.js that calls mount(App, \"#app\").";

function AgentDialog() {
  const copy = (text, what) => navigator.clipboard?.writeText(text).then(() => toast(`${what} copied`, { tone: "success" }), () => toast("Copy failed", { tone: "danger" }));
  const step = (n, title, text, action) => h("li", { class: "b-step" },
    h("span", { class: "b-step-num" }, n),
    h("div", { class: "b-step-body" }, h("b", title), h("p", text), action ?? null));
  return Dialog({
    open: agentOpen,
    title: "Connect an agent",
    description: "Builder will run code straight from your coding agent or terminal. The bridge is in preview; for now, hand your agent the context and paste what it writes.",
    size: "md"
  },
  h("ol", { class: "b-steps" },
    step(1, "Give it the context", "llms.txt describes the whole API in one file, written for models.",
      h("div", { class: "b-copy" }, h("code", "https://lucidui.dev/llms.txt"), Button({ size: "xs", icon: "copy", onClick: () => copy("https://lucidui.dev/llms.txt", "Link") }, "Copy"))),
    step(2, "Use a starter prompt", "Works with Claude Code, Cursor, Codex or any chat.",
      h("div", { class: "b-copy b-copy-prompt" }, h("p", PROMPT), Button({ size: "xs", icon: "copy", onClick: () => copy(PROMPT, "Prompt") }, "Copy"))),
    step(3, "Paste and run", "Drop the result into the editor. Lucid diagnostics tell you, and your agent, exactly what to fix.")),
  h("div", { class: "b-soon" },
    h("span", { class: "b-soon-icon" }, Icon({ name: "link", size: 15 })),
    h("div", h("b", "Live bridge, coming soon"), h("p", "Pair a session with one command, and your agent writes here while you watch it render."))),
  h("pre", { class: "b-term" }, h("span", { class: "b-prompt" }, "$ "), "npx lucidui connect ", h("span", { class: "b-term-dim" }, "# soon")));
}

function Bar() {
  return h("header", { class: "b-bar" },
    h("a", { class: "b-brand", href: "https://lucidui.dev", aria: { label: "Lucid UI home" } },
      h("img", { src: "/media/logo/lucid-mark.svg", alt: "", width: 24, height: 24 }),
      h("span", { class: "b-brand-word" }, "Lucid UI")),
    h("span", { class: "b-slash", "aria-hidden": "true" }, "/"),
    h("span", { class: "b-name" }, "Builder", h("span", { class: "b-pill" }, "Preview")),
    Select({
      value: template,
      size: "sm",
      class: "b-template",
      aria: { label: "Template" },
      options: TEMPLATES.map(({ value, label, icon, note }) => ({ value, label, icon, keywords: note })),
      onChange: next => {
        code.value = store.get(`draft:${next}`, byKey[next].code);
        queueMicrotask(run);
      }
    }),
    h("span", { class: "lucid-spacer" }),
    Button({ variant: "ghost", size: "sm", icon: "link", class: "b-agent", onClick: () => { agentOpen.value = true; } }, h("span", { class: "b-hide-sm" }, "Connect an agent")),
    h("label", { class: "lucid-check b-auto" },
      h("input", { type: "checkbox", role: "switch", checked: auto, onChange: event => { auto.value = event.target.checked; } }),
      h("span", { class: "lucid-switch-track", "aria-hidden": "true" }),
      h("span", { class: "b-hide-sm" }, "Auto-run")),
    Button({ variant: "primary", size: "sm", icon: "zap", class: "b-run", kbd: ["mod", "enter"], onClick: run }, "Run"),
    Segmented({
      value: theme,
      size: "sm",
      iconOnly: true,
      class: "b-theme",
      aria: { label: "Theme" },
      options: [{ value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }, { value: "system", label: "System", icon: "monitor" }]
    }));
}

function App() {
  hotkey("mod+enter", run, { inputs: true });
  queueMicrotask(run);
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
    AgentDialog());
}

mount(App, "#app");
