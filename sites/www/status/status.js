import { signal, computed, effect, h, onCleanup, version } from "/lucid/index.js";
import { Button, Icon, hotkey, toast } from "/lucid/ui/index.js";
import { DotColumns } from "/lucid/viz/index.js";
import { mountPage, jump } from "/shared/chrome.js";

const ROUND = 15000;
const STAGGER = 600;
const TIMEOUT = 8000;
const SLOW = 1200;
const KEEP = 40;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SERVICES = [
  { id: "www", name: "Website", host: "lucidui.dev", group: "Our sites", url: "https://lucidui.dev/robots.txt" },
  { id: "docs", name: "Docs", host: "docs.lucidui.dev", group: "Our sites", url: "https://docs.lucidui.dev/llms.txt", cors: true },
  { id: "build", name: "Builder", host: "build.lucidui.dev", group: "Our sites", url: "https://build.lucidui.dev/" },
  { id: "sandbox", name: "Sandbox", host: "sandbox.lucidui.dev", group: "Our sites", url: "https://sandbox.lucidui.dev/" },
  { id: "changelog", name: "Changelog", host: "changelog.lucidui.dev", group: "Our sites", url: "https://changelog.lucidui.dev/" },
  { id: "media", name: "Media", host: "media.lucidui.dev", group: "Our sites", url: "https://media.lucidui.dev/icons/favicon.svg", cors: true },
  { id: "npm", name: "npm registry", host: "registry.npmjs.org", group: "Where code ships", url: "https://registry.npmjs.org/@lucidui-dev/core/latest", cors: true, json: data => { npmLatest.value = data.version; } },
  { id: "cdn", name: "jsDelivr CDN", host: "cdn.jsdelivr.net", group: "Where code ships", url: "https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/src/index.js", cors: true, text: body => { cdnServes.value = body.match(/version = "([^"]+)"/)?.[1] ?? null; } },
  { id: "github", name: "GitHub", host: "github.com", group: "Where code ships", url: "https://github.com/favicon.ico" },
  { id: "llms", name: "llms-full.txt", host: "lucidui.dev", group: "For agents", url: "https://lucidui.dev/llms-full.txt", head: true },
  { id: "mirror", name: "llms-full.txt mirror", host: "cdn.jsdelivr.net", group: "For agents", url: "https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/llms-full.txt", cors: true, head: true }
];

const npmLatest = signal(null);
const cdnServes = signal(null);
const round = signal(0);
const nextAt = signal(Date.now());
const now = signal(Date.now());
const checks = signal(0);
const paused = signal(false);
const log = signal([]);
const focus = signal(null);

for (const s of SERVICES) {
  s.state = signal("pending");
  s.ms = signal(null);
  s.history = signal([]);
  s.beat = signal(0);
}

const listeners = { start: new Set(), land: new Set() };
const on = (type, fn) => { listeners[type].add(fn); onCleanup(() => listeners[type].delete(fn)); };
const emit = (type, ...args) => listeners[type].forEach(fn => fn(...args));

const median = list => {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const fmtMs = ms => (ms == null ? "–" : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);
const clock = at => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const level = ms => Math.min(1, Math.max(0.12, Math.log10(Math.max(ms, 20) / 20) / Math.log10(30)));
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const COUNT = WORDS[SERVICES.length];
const STATE_LABEL = { pending: "Checking", up: "Operational", slow: "Slow", down: "Unreachable" };

const up = computed(() => SERVICES.filter(s => s.state.value === "up" || s.state.value === "slow").length);
const down = computed(() => SERVICES.filter(s => s.state.value === "down").length);
const overall = computed(() => {
  if (SERVICES.every(s => s.state.value === "pending")) return "pending";
  if (down.value) return "down";
  if (SERVICES.some(s => s.state.value === "slow")) return "slow";
  return "up";
});
const medianNow = computed(() => median(SERVICES.map(s => s.ms.value).filter(ms => ms != null)));

async function probe(s) {
  emit("start", s);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const started = performance.now();
  let ok = false;
  let note = "";
  try {
    const url = `${s.url}${s.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const res = await fetch(url, { method: s.head ? "HEAD" : "GET", mode: s.cors ? "cors" : "no-cors", cache: "no-store", signal: controller.signal, credentials: "omit" });
    if (s.cors && !res.ok) note = `HTTP ${res.status}`;
    else {
      ok = true;
      if (s.json) s.json(await res.json());
      else if (s.text) s.text(await res.text());
      else if (s.cors && !s.head) await res.arrayBuffer();
    }
  } catch (error) {
    note = error.name === "AbortError" ? "No answer in 8 s" : "Could not connect";
  }
  clearTimeout(timer);
  const ms = performance.now() - started;
  const state = ok ? (ms > SLOW ? "slow" : "up") : "down";
  const at = Date.now();
  s.state.value = state;
  s.ms.value = ok ? ms : null;
  s.history.value = [...s.history.peek(), { ms, ok, at, state }].slice(-KEEP);
  s.beat.value++;
  checks.value++;
  log.value = [{ at, s, ms, state, note }, ...log.peek()].slice(0, 60);
  emit("land", s, { ms, ok, state });
}

let roundTimer = 0;
function runRound() {
  clearTimeout(roundTimer);
  round.value++;
  SERVICES.forEach((s, i) => setTimeout(() => probe(s), i * STAGGER));
  nextAt.value = Date.now() + ROUND;
  roundTimer = setTimeout(() => { if (!paused.peek() && !document.hidden) runRound(); else nextAt.value = Infinity; }, ROUND);
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !paused.peek() && nextAt.peek() === Infinity) runRound();
});
setInterval(() => { now.value = Date.now(); }, 250);

function Scope() {
  const canvas = h("canvas", { "aria-hidden": "true" });
  const tip = h("div", { class: "st-scope-tip", "data-show": "false" });
  const wrap = h("div", { class: "st-scope" }, canvas, tip);
  const ctx = canvas.getContext("2d");
  let cols = 0, rows = 0, pitch = 14, ratio = 1, width = 0, height = 0, base = 0;
  let trace, stamp, owner;
  let cursor = 0;
  let last = performance.now();
  let mouse = null;
  const blips = [];
  const SHAPE = [[-2, 0.12], [-1, -0.16], [0, 1], [1, -0.38], [2, 0.16], [3, 0.08]];

  const size = () => {
    const box = wrap.getBoundingClientRect();
    ratio = devicePixelRatio || 1;
    width = box.width;
    height = box.height;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    pitch = width < 640 ? 11 : 14;
    cols = Math.max(20, Math.floor(width / pitch));
    rows = Math.max(8, Math.floor(height / pitch));
    base = Math.round(rows * 0.7);
    trace = new Float32Array(cols).fill(base);
    stamp = new Float64Array(cols).fill(-1e9);
    owner = new Array(cols).fill(null);
    cursor = 0;
    blips.length = 0;
  };

  const write = (col, at) => {
    const c = ((col % cols) + cols) % cols;
    let y = base + Math.sin(at / 900 + col * 0.7) * 0.18;
    let who = null;
    for (const b of blips) {
      for (const [dx, k] of SHAPE) {
        if (col === b.col + dx) {
          y -= b.amp * k;
          if (dx === 0) who = b;
        }
      }
    }
    trace[c] = y;
    stamp[c] = at;
    owner[c] = who;
  };

  on("land", (s, result) => {
    const top = base - 1.5;
    const amp = result.ok ? top * level(result.ms) : -Math.min(rows - base - 1.2, 3.5);
    const col = Math.floor(cursor) + 2;
    blips.push({ col, amp, s, ms: result.ms, ok: result.ok, at: Date.now(), state: result.state });
    while (blips.length > 40) blips.shift();
    if (still) { for (let k = 0; k < 5; k++) write(Math.floor(cursor) + k, performance.now()); cursor += 5; draw(performance.now()); }
  });

  const colors = {
    dim: "rgba(245,242,234,0.07)",
    gold: [232, 214, 168],
    slow: [246, 240, 225],
    down: [255, 118, 118]
  };

  function draw(t) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const sweep = still ? Infinity : ROUND;
    const head = ((Math.floor(cursor) % cols) + cols) % cols;
    const r = Math.max(1.4, pitch * 0.15);
    for (let c = 0; c < cols; c++) {
      const age = (t - stamp[c]) / sweep;
      const fade = Math.max(0, 1 - age);
      const prev = trace[(c - 1 + cols) % cols];
      const lo = Math.min(trace[c], prev) - 0.45;
      const hi = Math.max(trace[c], prev) + 0.45;
      const who = owner[c];
      const tint = who ? (!who.ok ? colors.down : who.state === "slow" ? colors.slow : colors.gold) : colors.gold;
      const x = c * pitch + pitch / 2;
      for (let row = 0; row < rows; row++) {
        const y = row * pitch + pitch / 2;
        let a = 0;
        if (row >= lo && row <= hi) a = fade;
        else {
          const d = Math.min(Math.abs(row - lo), Math.abs(row - hi));
          if (d < 1.1) a = fade * (1 - d / 1.1) * 0.4;
        }
        if (c === head) a = Math.max(a, 0.16);
        if (mouse) {
          const dist = Math.hypot(mouse.x - x, mouse.y - y);
          if (dist < 70) a = Math.max(a, (1 - dist / 70) * 0.28);
        }
        ctx.beginPath();
        ctx.arc(x, y, a > 0.5 ? r * 1.25 : r, 0, Math.PI * 2);
        if (a <= 0.02) ctx.fillStyle = colors.dim;
        else ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${Math.min(1, 0.07 + a)})`;
        ctx.fill();
      }
    }
    if (!still && Number.isFinite(trace[head])) {
      const hx = head * pitch + pitch / 2;
      const hy = trace[head] * pitch + pitch / 2;
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, pitch * 2.4);
      glow.addColorStop(0, "rgba(246,234,208,0.95)");
      glow.addColorStop(1, "rgba(232,214,168,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(hx, hy, pitch * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let frame = 0;
  const loop = t => {
    const dt = Math.max(0, Math.min(100, t - last));
    last = t;
    const before = Math.floor(cursor);
    cursor += (cols / ROUND) * dt;
    for (let col = before + 1; col <= Math.floor(cursor); col++) write(col, t);
    draw(t);
    frame = requestAnimationFrame(loop);
  };

  const hover = event => {
    const box = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - box.left, y: event.clientY - box.top };
    const c = Math.floor(mouse.x / pitch);
    let who = null;
    for (let k = -1; k <= 1 && !who; k++) {
      const o = owner[(c + k + cols) % cols];
      if (o && (performance.now() - stamp[(c + k + cols) % cols]) < ROUND) who = o;
    }
    if (who) {
      tip.replaceChildren(
        h("b", who.s.name),
        h("span", who.s.host),
        h("span", { class: "st-scope-tip-ms", "data-state": who.state }, who.ok ? fmtMs(who.ms) : "unreachable"),
        h("small", clock(who.at)));
      tip.style.left = `${Math.min(width - 190, Math.max(10, c * pitch - 80))}px`;
      tip.style.top = `${Math.max(6, trace[(c + cols) % cols] * pitch - 92)}px`;
      tip.dataset.show = "true";
    } else tip.dataset.show = "false";
    if (still) draw(performance.now());
  };
  const leave = () => { mouse = null; tip.dataset.show = "false"; if (still) draw(performance.now()); };
  wrap.addEventListener("pointermove", hover);
  wrap.addEventListener("pointerleave", leave);

  queueMicrotask(() => {
    size();
    const ro = new ResizeObserver(() => { size(); if (still) draw(performance.now()); });
    ro.observe(wrap);
    if (still) draw(performance.now());
    else frame = requestAnimationFrame(loop);
    onCleanup(() => { ro.disconnect(); cancelAnimationFrame(frame); });
  });
  return wrap;
}

function Countdown() {
  const R = 15;
  const C = 2 * Math.PI * R;
  const left = computed(() => (nextAt.value === Infinity ? 0 : Math.max(0, nextAt.value - now.value)));
  return h("button", {
    type: "button", class: "st-count", onClick: () => runRound(),
    aria: { label: () => `Check again now. Next check in ${Math.ceil(left.value / 1000)} seconds` }
  },
    h("svg", { viewBox: "0 0 36 36", "aria-hidden": "true" },
      h("circle", { cx: 18, cy: 18, r: R, class: "st-count-track" }),
      h("circle", { cx: 18, cy: 18, r: R, class: "st-count-bar", "stroke-dasharray": C, "stroke-dashoffset": () => C * (left.value / ROUND) })),
    h("span", { class: "st-count-n" }, () => (nextAt.value === Infinity ? "II" : Math.ceil(left.value / 1000))));
}

const HEADLINES = {
  pending: ["Taking a pulse", "."],
  up: ["All systems ", "lucid."],
  slow: ["Lucid, if a little ", "slow."],
  down: ["Something is ", "down."]
};

function Hero() {
  return h("section", { class: "st-hero", "data-state": overall },
    h("div", { class: "st-wrap" },
      h("p", { class: "st-kicker" }, h("i", { class: "st-live" }), "Lucid UI status", h("span", { class: "st-kicker-sep" }, "·"), "live"),
      h("h1", { class: "st-title" }, () => {
        const [a, b] = HEADLINES[overall.value];
        return [a, h("span", { class: "st-gold" }, b)];
      }),
      h("p", { class: "st-lede" }, `Checked from your browser, not from our servers. Every 15 seconds this page reaches out to the ${COUNT} places Lucid UI lives and draws what comes back. Hover the trace to see who answered.`)),
    Scope(),
    h("div", { class: "st-wrap st-facts" },
      Fact("Reachable", () => `${up.value}/${SERVICES.length}`, () => (down.value ? "down" : "up")),
      Fact("Median response", () => fmtMs(medianNow.value)),
      Fact("Checks this visit", () => checks.value.toLocaleString()),
      Fact("Latest release", () => (npmLatest.value ? `v${npmLatest.value}` : "–")),
      h("div", { class: "st-fact st-fact-next" },
        Countdown(),
        h("span", { class: "st-fact-label" }, () => (nextAt.value === Infinity ? "Paused" : "Next check")),
        h("span", { class: "st-fact-hint" }, "Press R to check now"))));
}

function Fact(label, value, state) {
  return h("div", { class: "st-fact", "data-state": state },
    h("span", { class: "st-fact-label" }, label),
    h("b", { class: "st-fact-value" }, value));
}

function SignalMap() {
  const portrait = matchMedia("(max-width: 640px)").matches;
  const gapAfter = new Set([5, 8]);
  const steps = SERVICES.length - 1 + gapAfter.size * 0.8;
  const W = portrait ? 360 : 1000;
  const H = portrait ? 120 + steps * 46 : 460;
  const you = portrait ? { x: 52, y: H / 2 } : { x: 120, y: 230 };
  let k = 0;
  const nodes = SERVICES.map((s, i) => {
    const a = (-58 + (116 * k) / steps) * (Math.PI / 180);
    const x = portrait ? 150 + 36 * Math.cos(a * 1.4) : 150 + 680 * Math.cos(a);
    const y = portrait ? 60 + k * 46 : you.y + 205 * Math.sin(a);
    k += 1 + (gapAfter.has(i) ? 0.8 : 0);
    const cx = (you.x + x) / 2;
    const cy = (you.y + y) / 2 - (y - you.y) * 0.25;
    return { s, x, y, d: `M ${you.x} ${you.y} Q ${cx} ${cy} ${x} ${y}` };
  });
  const card = h("div", { class: "st-map-card", "data-show": () => String(Boolean(focus.value)) }, () => {
    const s = SERVICES.find(item => item.id === focus.value);
    if (!s) return null;
    const hist = s.history.value;
    const oks = hist.filter(e => e.ok);
    return [
      h("div", { class: "st-map-card-head" }, h("i", { class: "st-dot", "data-state": s.state.value }), h("b", s.name)),
      h("span", { class: "st-map-card-host" }, s.host),
      h("dl", { class: "st-map-card-grid" },
        h("div", h("dt", "Now"), h("dd", s.ms.value != null ? fmtMs(s.ms.value) : STATE_LABEL[s.state.value])),
        h("div", h("dt", "Median"), h("dd", fmtMs(median(oks.map(e => e.ms))))),
        h("div", h("dt", "Answered"), h("dd", hist.length ? `${oks.length}/${hist.length}` : "–"))),
      h("span", { class: "st-map-card-group" }, s.group)
    ];
  });
  const layer = h("svg:g", { class: "st-packets" });
  const pathEls = new Map();
  const nodeEls = new Map();

  const svg = h("svg", { viewBox: `0 0 ${W} ${H}`, class: "st-map-svg", role: "img", aria: { label: "Map of the services this page checks, with live traffic from your browser" } },
    h("defs",
      h("radialGradient", { id: "st-you" }, h("stop", { offset: "0", "stop-color": "#f6ead0" }), h("stop", { offset: "1", "stop-color": "#b9974a" }))),
    nodes.map(n => {
      const path = h("path", { d: n.d, class: "st-link", "data-state": n.s.state, "data-hot": () => String(focus.value === n.s.id) });
      pathEls.set(n.s.id, path);
      return path;
    }),
    layer,
    h("g", { class: "st-you" },
      h("circle", { cx: you.x, cy: you.y, r: portrait ? 34 : 46, class: "st-you-ring" }),
      h("circle", { cx: you.x, cy: you.y, r: portrait ? 34 : 46, class: "st-you-ring st-you-ring-2" }),
      h("circle", { cx: you.x, cy: you.y, r: 15, fill: "url(#st-you)" }),
      h("text", { x: you.x, y: you.y + 44, class: "st-you-label" }, "You"),
      h("text", { x: you.x, y: you.y + 62, class: "st-you-sub" }, "this browser")),
    nodes.map(n => {
      const g = h("g", {
        class: "st-node", tabindex: 0, role: "button", "data-state": n.s.state,
        "data-hot": () => String(focus.value === n.s.id),
        aria: { label: () => `${n.s.name}, ${STATE_LABEL[n.s.state.value]}${n.s.ms.value != null ? `, ${fmtMs(n.s.ms.value)}` : ""}. Show its card` },
        onPointerenter: () => { focus.value = n.s.id; },
        onPointerleave: () => { if (focus.peek() === n.s.id) focus.value = null; },
        onFocus: () => { focus.value = n.s.id; },
        onBlur: () => { if (focus.peek() === n.s.id) focus.value = null; },
        onClick: () => showCard(n.s.id),
        onKeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showCard(n.s.id); } }
      },
        h("circle", { cx: n.x, cy: n.y, r: 22, class: "st-node-hit" }),
        h("circle", { cx: n.x, cy: n.y, r: 9, class: "st-node-pulse" }),
        h("circle", { cx: n.x, cy: n.y, r: 7, class: "st-node-core" }),
        h("text", { x: n.x + 18, y: n.y - 2, class: "st-node-name" }, n.s.name),
        h("text", { x: n.x + 18, y: n.y + 14, class: "st-node-ms" }, () => (n.s.state.value === "down" ? "unreachable" : n.s.ms.value != null ? fmtMs(n.s.ms.value) : "…")));
      nodeEls.set(n.s.id, g);
      return g;
    }));

  const flights = [];
  const fly = (id, dir, kind) => {
    const path = pathEls.get(id);
    if (!path || still) return;
    const dot = h("circle", { r: dir === "out" ? 3 : 4, class: "st-packet", "data-kind": kind });
    layer.append(dot);
    flights.push({ dot, path, len: path.getTotalLength(), dir, t0: performance.now(), dur: dir === "out" ? 520 : 640, kind, id });
  };
  const pulse = id => {
    const g = nodeEls.get(id);
    if (!g) return;
    g.classList.remove("st-hit");
    void g.getBoundingClientRect();
    g.classList.add("st-hit");
  };
  on("start", s => fly(s.id, "out", "out"));
  on("land", (s, r) => {
    if (r.ok) fly(s.id, "in", r.state);
    else { pulse(s.id); fly(s.id, "fizzle", "down"); }
    if (still) pulse(s.id);
  });

  let frame = 0;
  const loop = t => {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      const p = Math.min(1, (t - f.t0) / f.dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const along = f.dir === "out" ? e : f.dir === "in" ? 1 - e : e * 0.55;
      const pt = f.path.getPointAtLength(f.len * along);
      f.dot.setAttribute("cx", pt.x);
      f.dot.setAttribute("cy", pt.y);
      if (f.dir === "fizzle") f.dot.setAttribute("opacity", String(1 - p));
      if (p >= 1) {
        f.dot.remove();
        flights.splice(i, 1);
        if (f.dir === "out") pulse(f.id);
      }
    }
    frame = requestAnimationFrame(loop);
  };
  if (!still) frame = requestAnimationFrame(loop);
  onCleanup(() => cancelAnimationFrame(frame));

  return h("section", { class: "st-map", id: "map" },
    h("div", { class: "st-wrap" },
      Head("Signal map", `${COUNT[0].toUpperCase()}${COUNT.slice(1)} doors, one browser.`, "Every dot that leaves you is a real request. Gold comes back fast, white comes back slow, red never comes back. Hover a service to read it, select it to jump to its card."),
      h("div", { class: "st-map-frame" }, svg, card)));
}

function showCard(id) {
  const el = document.getElementById(`svc-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  el.classList.remove("st-called");
  void el.offsetWidth;
  el.classList.add("st-called");
  el.focus({ preventScroll: true });
}

function Head(eyebrow, title, lead) {
  return h("header", { class: "st-head" },
    h("p", { class: "st-kicker" }, h("i"), eyebrow),
    h("h2", { class: "st-h2" }, title),
    lead ? h("p", { class: "st-lead" }, lead) : null);
}

function Strip(s, readout) {
  const W = 280, H = 46, slot = W / KEEP;
  const g = h("svg:g");
  const svg = h("svg", { viewBox: `0 0 ${W} ${H}`, class: "st-strip", preserveAspectRatio: "xMidYMid meet", "aria-hidden": "true" }, g);
  effect(() => {
    const hist = s.history.value;
    const offset = KEEP - hist.length;
    const parts = [];
    for (let i = 0; i < KEEP; i++) {
      const e = hist[i - offset];
      const x = i * slot + slot / 2;
      if (!e) { parts.push(h("circle", { cx: x, cy: H - 4, r: 1.4, class: "st-strip-empty" })); continue; }
      const y = e.ok ? H - 6 - level(e.ms) * (H - 14) : H - 4;
      parts.push(h("g", {
        class: "st-strip-slot", "data-state": e.state, "data-last": String(i === KEEP - 1),
        onPointerenter: () => { readout.value = `${clock(e.at)} · ${e.ok ? fmtMs(e.ms) : "unreachable"}`; },
        onPointerleave: () => { readout.value = null; }
      },
        h("rect", { x: i * slot, y: 0, width: slot, height: H, class: "st-strip-hit" }),
        e.ok ? h("line", { x1: x, x2: x, y1: H - 4, y2: y, class: "st-strip-stem" }) : null,
        h("circle", { cx: x, cy: y, r: e.ok ? 2.6 : 3, class: "st-strip-dot" })));
    }
    g.replaceChildren(...parts);
  });
  return svg;
}

function ServiceCard(s) {
  const readout = signal(null);
  const card = h("article", {
    class: "st-card", id: `svc-${s.id}`, tabindex: -1, "data-state": s.state,
    "data-hot": () => String(focus.value === s.id),
    onPointerenter: () => { focus.value = s.id; },
    onPointerleave: () => { if (focus.peek() === s.id) focus.value = null; }
  },
    h("div", { class: "st-card-top" },
      h("i", { class: "st-dot", "data-state": s.state }),
      h("div", { class: "st-card-name" }, h("b", s.name), h("span", s.host)),
      h("span", { class: "st-card-ms", "data-state": s.state }, () => (s.state.value === "down" ? "down" : fmtMs(s.ms.value)))),
    Strip(s, readout),
    h("div", { class: "st-card-foot" }, () => {
      if (readout.value) return h("span", { class: "st-card-readout" }, readout.value);
      const hist = s.history.value;
      if (!hist.length) return h("span", "Waiting for the first answer…");
      const oks = hist.filter(e => e.ok);
      return [
        h("span", { class: "st-card-state", "data-state": s.state.value }, STATE_LABEL[s.state.value]),
        h("span", `${Math.round((oks.length / hist.length) * 100)}% of ${hist.length} checks`),
        h("span", `median ${fmtMs(median(oks.map(e => e.ms)))}`)
      ];
    }));
  effect(() => {
    if (!s.beat.value || still) return;
    card.classList.remove("st-beat");
    void card.offsetWidth;
    card.classList.add("st-beat");
  });
  return card;
}

function Board() {
  const groups = [...new Set(SERVICES.map(s => s.group))];
  return h("section", { class: "st-board", id: "services" },
    h("div", { class: "st-wrap" },
      h("div", { class: "st-board-head" },
        Head("Services", "Every heartbeat, as it lands.", "The last 40 checks for each service. Taller means slower. Hover any beat to read it."),
        h("div", { class: "st-board-actions" },
          Button({ variant: "primary", icon: "zap", onClick: () => { runRound(); toast({ title: `Checking all ${COUNT} now` }); } }, "Check now"),
          Button({ variant: "ghost", icon: "clock", onClick: () => { paused.value = !paused.peek(); if (!paused.peek()) runRound(); else { clearTimeout(roundTimer); nextAt.value = Infinity; } } }, () => (paused.value ? "Resume" : "Pause")))),
      groups.map(group => h("div", { class: "st-group" },
        h("h3", { class: "st-group-title" }, group, h("span", () => {
          const list = SERVICES.filter(s => s.group === group);
          const ok = list.filter(s => s.state.value === "up" || s.state.value === "slow").length;
          return `${ok}/${list.length}`;
        })),
        h("div", { class: "st-cards" }, SERVICES.filter(s => s.group === group).map(ServiceCard)))),
      Log()));
}

function Log() {
  const open = signal(false);
  return h("div", { class: "st-log", "data-open": open },
    h("button", { type: "button", class: "st-log-toggle", "aria-expanded": open, onClick: () => { open.value = !open.peek(); } },
      Icon({ name: "chevron-right", size: 14 }),
      h("span", "Raw log"),
      h("small", () => `${log.value.length} lines, newest first`)),
    h("div", { class: "st-log-body", role: "log", aria: { live: "off" } },
      () => log.value.map(line => h("div", { class: "st-log-line", "data-state": line.state },
        h("time", clock(line.at)),
        h("span", { class: "st-log-verb" }, "GET"),
        h("span", { class: "st-log-host" }, line.s.host),
        h("span", { class: "st-log-ms" }, line.state === "down" ? line.note : fmtMs(line.ms)),
        h("span", { class: "st-log-state" }, line.state === "down" ? "down" : line.state)))));
}

const releases = signal([]);
const repo = signal(null);
const hits = signal(null);

async function loadOnce() {
  fetch("https://registry.npmjs.org/@lucidui-dev/core", { cache: "no-store" }).then(r => r.json()).then(doc => {
    releases.value = Object.entries(doc.time ?? {})
      .filter(([v]) => /^\d+\.\d+\.\d+$/.test(v))
      .map(([v, at]) => ({ v, at: Date.parse(at) }))
      .sort((a, b) => a.at - b.at);
  }).catch(() => { releases.value = null; });
  fetch("https://api.github.com/repos/lucidui-dev/lucidui").then(r => (r.ok ? r.json() : null)).then(d => { repo.value = d; }).catch(() => {});
  fetch("https://data.jsdelivr.com/v1/stats/packages/npm/@lucidui-dev/core?period=month").then(r => r.json()).then(d => {
    const dates = Object.entries(d?.hits?.dates ?? {});
    hits.value = { total: d?.hits?.total ?? 0, days: dates.slice(-14).map(([day, value]) => ({ label: new Date(`${day}T12:00:00`).toLocaleDateString([], { day: "numeric", month: "short" }), value })) };
  }).catch(() => { hits.value = { total: 0, days: [] }; });
}

const ago = ms => {
  const m = Math.round(ms / 60000);
  if (m < 1) return "moments";
  if (m < 60) return `${m} min`;
  const hrs = Math.floor(m / 60);
  if (hrs < 48) return `${hrs} h${m % 60 ? ` ${m % 60} min` : ""}`;
  return `${Math.round(hrs / 24)} days`;
};

function Train() {
  const pick = signal(null);
  return h("section", { class: "st-train", id: "releases" },
    h("div", { class: "st-wrap" },
      Head("Releases", "The release line.", "Every version on npm, in order. The gaps between stops are real time. Hover a stop for when it shipped."),
      h("div", { class: "st-line", ref: el => effect(() => { if (releases.value?.length) requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; }); }) }, () => {
        const list = releases.value;
        if (list === null) return h("p", { class: "st-quiet" }, "npm didn't answer, so the release line can't be drawn right now.");
        if (!list.length) return h("p", { class: "st-quiet" }, "Asking npm…");
        return h("ol", { class: "st-stops", style: { "--n": list.length } },
          list.map((r, i) => h("li", {
            class: "st-stop", "data-latest": String(i === list.length - 1), tabindex: 0,
            onPointerenter: () => { pick.value = i; }, onPointerleave: () => { pick.value = null; },
            onFocus: () => { pick.value = i; }, onBlur: () => { pick.value = null; }
          },
            i ? h("span", { class: "st-gap" }, `+${ago(r.at - list[i - 1].at)}`) : null,
            h("i", { class: "st-stop-dot" }),
            h("b", { class: "st-stop-v" }, `v${r.v}`),
            h("span", { class: "st-stop-when", "data-show": () => String(pick.value === i) },
              new Date(r.at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })))));
      }),
      Alignment()));
}

function Alignment() {
  const aligned = computed(() => npmLatest.value && cdnServes.value && npmLatest.value === version && cdnServes.value === version);
  const known = computed(() => npmLatest.value && cdnServes.value);
  const Tile = (label, value, note) => h("div", { class: "st-align-tile", "data-match": () => String(!known.value || value() === version) },
    h("span", { class: "st-align-label" }, label),
    h("b", () => (value() ? `v${value()}` : "…")),
    h("small", note));
  return h("div", { class: "st-align", "data-state": () => (!known.value ? "pending" : aligned.value ? "aligned" : "drift") },
    Tile("npm latest", () => npmLatest.value, "what npm i installs"),
    h("i", { class: "st-align-wire", "aria-hidden": "true" }),
    Tile("jsDelivr @0.3", () => cdnServes.value, "what CDN imports get"),
    h("i", { class: "st-align-wire", "aria-hidden": "true" }),
    Tile("This page", () => version, "the runtime drawing this"),
    h("p", { class: "st-align-say" }, () => {
      if (!known.value) return "Comparing versions…";
      if (aligned.value) return `Every door opens to v${version}.`;
      return `Not every door shows v${version} yet. jsDelivr catches up within minutes of a release, and the docs agents read pin the exact version, so nothing breaks while it does.`;
    }));
}

const agentLines = signal([]);
const agentDone = signal(false);

async function digest(text) {
  const normal = text.replace(/@lucidui-dev\/core@[\d.]+\//g, "@lucidui-dev/core@0.3/");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normal));
  return [...new Uint8Array(buf)].slice(0, 4).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkAgents() {
  agentLines.value = [];
  agentDone.value = false;
  const add = line => new Promise(resolve => setTimeout(() => { agentLines.value = [...agentLines.peek(), line]; resolve(); }, still ? 0 : 260));
  const get = url => fetch(url, { cache: "no-store" }).then(r => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))));
  const [primary, mirror, index] = await Promise.allSettled([get("/llms-full.txt"), get("https://cdn.jsdelivr.net/npm/@lucidui-dev/core@0.3/llms-full.txt"), get("https://docs.lucidui.dev/llms.txt")]);
  const kb = t => `${Math.round(new Blob([t]).size / 1024)} KB`;
  const tokens = t => `about ${(Math.round(t.length / 4 / 100) * 100).toLocaleString()} tokens`;
  if (primary.status === "fulfilled") await add({ level: "ok", code: "docs-primary", text: `lucidui.dev/llms-full.txt answers: ${kb(primary.value)}, ${tokens(primary.value)}.` });
  else await add({ level: "error", code: "docs-primary", text: "lucidui.dev/llms-full.txt didn't answer.", fix: "Agents fall back to the jsDelivr mirror below." });
  if (mirror.status === "fulfilled") await add({ level: "ok", code: "docs-mirror", text: `The jsDelivr mirror answers: ${kb(mirror.value)}.` });
  else await add({ level: "error", code: "docs-mirror", text: "The jsDelivr mirror didn't answer.", fix: "Agents can still read the primary copy." });
  if (primary.status === "fulfilled" && mirror.status === "fulfilled") {
    const [a, b] = await Promise.all([digest(primary.value), digest(mirror.value)]);
    await add(a === b
      ? { level: "ok", code: "mirrors-match", text: `Both copies say the same thing (fingerprint ${a}).` }
      : { level: "note", code: "mirrors-differ", text: "The two copies differ slightly. The site's copy follows the docs as they change; the mirror holds what shipped with the last npm release. Both teach the same version." });
  }
  if (primary.status === "fulfilled") {
    const t = primary.value;
    await add(t.includes(`@lucidui-dev/core@${version}/`)
      ? { level: "ok", code: "version-pinned", text: `Import paths point to exactly v${version}, so agents can't get an older build.` }
      : { level: "warn", code: "version-unpinned", text: "Import paths use a version range.", fix: "A range can briefly resolve to the previous release on the CDN." });
    await add(/AppNexus/.test(t)
      ? { level: "ok", code: "name-guard", text: "Warns agents away from AppNexus's unrelated lucid-ui, so they don't learn the wrong API." }
      : { level: "warn", code: "name-guard", text: "No warning about the unrelated lucid-ui.", fix: "Agents that web-search may pick up the wrong library." });
  }
  await add(index.status === "fulfilled"
    ? { level: "ok", code: "docs-index", text: "docs.lucidui.dev/llms.txt answers, for agents that start from the short index." }
    : { level: "error", code: "docs-index", text: "docs.lucidui.dev/llms.txt didn't answer." });
  agentDone.value = true;
}

function Agents() {
  const verdict = computed(() => {
    const lines = agentLines.value;
    if (!agentDone.value) return null;
    if (lines.some(l => l.level === "error") && !lines.some(l => l.code === "docs-primary" && l.level === "ok") && !lines.some(l => l.code === "docs-mirror" && l.level === "ok")) return ["No.", "Neither copy of the docs answered."];
    if (lines.some(l => l.level === "warn" || l.level === "error")) return ["Mostly.", "One check needs a look. Each one says why."];
    return ["Yes.", "Everything an agent needs is up, matching and pinned."];
  });
  return h("section", { class: "st-agents", id: "agents" },
    h("div", { class: "st-wrap st-agents-grid" },
      h("div",
        Head("For agents", "Can an agent learn Lucid UI right now?", null),
        h("p", { class: "st-verdict", "data-show": () => String(Boolean(verdict.value)) },
          h("b", () => verdict.value?.[0] ?? ""), h("span", () => verdict.value?.[1] ?? "")),
        h("p", { class: "st-lead" }, "Agents learn Lucid UI from one file, llms-full.txt, kept in two places. This reads both, the way an agent would, and reports back like Lucid's own diagnostics."),
        Button({ icon: "zap", onClick: checkAgents, disabled: () => !agentDone.value }, "Read them again")),
      h("div", { class: "st-console", role: "log" },
        h("div", { class: "st-console-head" }, h("span", { class: "st-console-dots", "aria-hidden": "true" }, h("i"), h("i"), h("i")), h("span", "agent-check"), h("span", { class: "st-console-run", "data-done": () => String(agentDone.value) }, () => (agentDone.value ? "done" : "reading…"))),
        h("div", { class: "st-console-body" },
          () => agentLines.value.map(l => h("div", { class: "st-console-line", "data-level": l.level },
            h("span", { class: "st-console-level" }, l.level),
            h("code", l.code),
            h("p", l.text, l.fix ? h("span", { class: "st-console-fix" }, `Fix: ${l.fix}`) : null))),
          h("span", { class: "st-caret", "data-done": () => String(agentDone.value), "aria-hidden": "true" })))));
}

function Reach() {
  return h("section", { class: "st-reach", id: "reach" },
    h("div", { class: "st-wrap" },
      Head("Reach", "Who's pulling it in.", "Straight from jsDelivr and GitHub. jsDelivr publishes its numbers a few days behind, so a young package starts at zero."),
      h("div", { class: "st-reach-grid" },
        h("div", { class: "st-reach-chart" },
          h("div", { class: "st-reach-chart-head" }, h("b", "jsDelivr requests, last 14 days"), h("span", () => (hits.value ? `${hits.value.total.toLocaleString()} this month` : "…"))),
          () => {
            const d = hits.value;
            if (!d) return h("p", { class: "st-quiet" }, "Asking jsDelivr…");
            if (!d.days.length) return h("p", { class: "st-quiet" }, "jsDelivr didn't answer.");
            const chart = DotColumns({ data: d.days, height: 190, color: "#e8d6a8", label: "jsDelivr requests per day, last 14 days" });
            return d.total ? chart : [chart, h("p", { class: "st-reach-empty" }, "Nothing counted yet. The first numbers arrive a few days after a package goes public.")];
          }),
        h("div", { class: "st-reach-stats" },
          Stat("GitHub stars", () => repo.value?.stargazers_count),
          Stat("Forks", () => repo.value?.forks_count),
          Stat("Open issues", () => repo.value?.open_issues_count),
          Stat("Versions on npm", () => releases.value?.length),
          Stat("Last push", () => (repo.value ? `${ago(now.value - Date.parse(repo.value.pushed_at))} ago` : null))))));
}

function Stat(label, value) {
  return h("div", { class: "st-stat" }, h("span", label), h("b", () => { const v = value(); return v == null ? "–" : typeof v === "number" ? v.toLocaleString() : v; }));
}

function Incidents() {
  return h("section", { class: "st-incidents", id: "incidents" },
    h("div", { class: "st-wrap st-incidents-grid" },
      h("div",
        Head("Incidents", "Nothing to report.", null),
        h("p", { class: "st-lead" }, "When something breaks, it gets written here in plain words: what happened, who it touched and what changed so it won't again. For every change, read the ",
          h("a", { href: "https://changelog.lucidui.dev" }, "changelog"), ".")),
      h("ul", { class: "st-how" },
        How("monitor", "Checked from your browser", "Not from a server we run, so this page can't vouch for itself. If it loads and turns gold, it's true where you are."),
        How("lock", "Nothing sent anywhere", "No analytics, no beacons. The only requests are the checks you can read in the raw log."),
        How("eye", "No history to edit", "Close the tab and every beat is gone. There's no uptime record here we could round up.")),
      h("div", { class: "st-cta" },
        Button({ variant: "primary", href: "https://build.lucidui.dev", iconRight: "arrow-right" }, "Open Builder"),
        Button({ href: "https://docs.lucidui.dev", icon: "hash" }, "Read the docs"),
        Button({ variant: "ghost", href: "https://github.com/lucidui-dev/lucidui/issues/new", icon: "external" }, "Report a problem"))));
}

function How(icon, title, text) {
  return h("li", h("span", { class: "st-how-icon" }, Icon({ name: icon, size: 16 })), h("b", title), h("p", text));
}

mountPage({
  site: "status",
  main: () => {
    hotkey("r", () => runRound());
    queueMicrotask(() => { runRound(); loadOnce(); checkAgents(); });
    return [h("div", { class: "st", "data-state": overall }, Hero(), SignalMap(), Board(), Train(), Agents(), Reach(), Incidents())];
  },
  commands: [
    { group: "Status", label: "Check everything now", icon: "zap", run: () => runRound() },
    { group: "Status", label: "Signal map", icon: "target", run: jump("map") },
    { group: "Status", label: "Services", icon: "list", run: jump("services") },
    { group: "Status", label: "Releases", icon: "tag", run: jump("releases") },
    { group: "Status", label: "Agent check", icon: "sparkles", run: jump("agents") },
    { group: "Status", label: "Incidents", icon: "info", run: jump("incidents") }
  ]
});
