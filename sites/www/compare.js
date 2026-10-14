import { h, signal, computed, effect, onCleanup, untrack, mount, For, onDiagnostic } from "/lucid/index.js";
import { Button, Icon } from "/lucid/ui/index.js";
import { SectionHead } from "/shared/chrome.js";

const REACT_LINES = [[42,36,48,46,151,45,0,31,45,41,39,42,31,41,77,22,21,29,95,16,19,4,10,44,52,100,51,78,25,26,53,83,27,93,26,90,49,27,26,17,12,81,49,25,76,99,15,11,11,11,4,1],[58,37,33,0,89,107,101,0,59,10,28,196,30,34,400,18,7,18,125,19,48,32,32,29,4,1,0,151,161,158,165,0,121],[44,47,33,0,27,345,3,15,16,84,95,61,8,91,6,60,3,2,0,74,41,109,1,0,34],[33,0,47,10,10,17,23,20,325,17,8,16,6,4,1,0,17],[22,25,0,7,29,33,30,41,28,40,39,29,28,27,1,0,15,40,40,34,56,32,54,52,32,30,28,1,0,13,45,48,1],[28,41,0,31,31,1],[35,46,21,28,0,85],[36,41,44,29,0,29,36,71,3]];
const LUCID_LINES = [[34,68,85,45,0,28,25,24,27,30,45,87,3,19,33,109,18,21,2,0,33,17,111,96,76,72,95,86,149,63]];

const STACKS = {
  react: { name: "React + Tailwind + shadcn/ui", tools: "React 19.3 · Tailwind 4.3 · shadcn/ui · Vite 8", runtime: 33, js: 90.5, css: 3.9, lines: 181, files: 8, code: REACT_LINES },
  lucid: { name: "Lucid UI", tools: "Lucid UI 0.3.8 · Vite 8", runtime: 1, js: 10.3, css: 8.2, lines: 30, files: 1, code: LUCID_LINES }
};
const total = s => Math.round((s.js + s.css) * 10) / 10;

const ROUNDS = [
  { id: "install", label: "Install", unit: s => (s.runtime === 1 ? "package" : "packages"), value: s => s.runtime, digits: 0,
    caption: "What your app runs on once it's built. shadcn/ui pulls in React, Radix, Tailwind's helpers and their dependencies. Lucid UI is one package with nothing under it." },
  { id: "ship", label: "Ship", unit: () => "KB", value: total, digits: 1,
    caption: "Everything sent to the browser, gzipped, one dot per kilobyte on the same scale. Solid dots are JavaScript, open dots are CSS. Tailwind wins on CSS, because it keeps only the classes you use." },
  { id: "code", label: "Your code", unit: () => "lines", value: s => s.lines, digits: 0,
    caption: "The source you own and maintain, drawn from the real files, line by line. shadcn/ui copies its components into your project; Lucid UI keeps them in the library." },
  { id: "race", label: "Race", unit: () => "ms", value: () => null, digits: 1,
    caption: "React and Lucid UI, core against core, render, update and reorder 1,000 real rows on this page, in your browser. Whatever it shows is the result. React loads from esm.sh only when you press Run." },
  { id: "mistake", label: "Mistakes", unit: s => (s === STACKS.lucid ? "warning" : "warnings"), value: () => null, digits: 0,
    caption: "Both ship an icon button with no label, so screen readers announce it as just “button”. React can catch this too if you add the jsx-a11y lint plugin. Lucid UI catches it as it runs, with no setup." }
];

const LUCID_APP = `import { signal, computed, h, mount, For } from "@lucidui-dev/core";
import { Button, Input, Dialog, Field, Page, Row, Text } from "@lucidui-dev/core/ui";

const FIRST = ["Ada", "Ben", "Cleo", "Dev", "Esme", "Finn", "Gus", "Hana", "Ivo", "Juno"];
const LAST = ["Brook", "Okafor", "Varga", "Anand", "Lund", "Ito", "Hart", "Moss", "Kade", "Pell"];
const people = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, name: FIRST[i % 10] + " " + LAST[Math.floor(i / 10) % 10], role: ["Design", "Engineering", "Support", "Sales", "Finance"][i % 5] })));
const query = signal("");
const name = signal("");
const open = signal(false);
const shown = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? people.value.filter(p => p.name.toLowerCase().includes(q)) : people.value;
});
const add = () => {
  if (!name.value.trim()) return;
  people.value = [{ id: Date.now(), name: name.value.trim(), role: "New" }, ...people.value];
  name.value = "";
  open.value = false;
};

mount(() => Page({ title: "Team", width: "md" },
  Row({ gap: 2 },
    Input({ bind: query, placeholder: "Search people", aria: { label: "Search people" }, style: { flex: 1 } }),
    Button({ variant: "primary", icon: "plus", onClick: () => { open.value = true; } }, "Add")),
  Text({ size: "sm", tone: "muted" }, () => shown.value.length + " people"),
  h("ul", { style: { margin: 0, padding: 0, listStyle: "none" } }, For({ each: shown, key: p => p.id }, p =>
    h("li", { style: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--lucid-line)" } }, h("span", p.name), Text({ tone: "muted", size: "sm" }, p.role)))),
  Dialog({ open, title: "Add a person", description: "They join the top of the list.",
    footer: [Button({ variant: "ghost", onClick: () => { open.value = false; } }, "Cancel"), Button({ variant: "primary", onClick: add }, "Save")] },
    Field({ label: "Name" }, Input({ bind: name })))), "#app");
`;

const still = matchMedia("(prefers-reduced-motion: reduce)");
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function formation(round, side, W, H, pool, extra) {
  const s = STACKS[side];
  const pad = Math.max(18, Math.min(W, H) * 0.08);
  const cx = W / 2;
  const cy = H / 2;
  const out = [];
  const hide = { x: cx, y: cy, w: 0, h: 0, a: 0, fill: 1, glow: 0 };
  if (round === "install") {
    const n = s.runtime;
    if (n === 1) out.push({ x: cx, y: cy, w: 22, h: 22, a: 1, fill: 1, glow: 1 });
    else {
      const spread = Math.min(W - pad * 2, H - pad * 2) / 2 / Math.sqrt(n);
      for (let i = 0; i < n; i++) {
        const r = i === 0 ? 0 : spread * Math.sqrt(i + 0.6);
        const t = i * 2.39996;
        const size = i === 0 ? 14 : Math.max(5, 9 - Math.sqrt(i) * 0.6);
        out.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r, w: size, h: size, a: i === 0 ? 1 : 0.85, fill: 1, glow: 0 });
      }
    }
  } else if (round === "ship") {
    const cols = 12;
    const cell = Math.min((W - pad * 2) / cols, (H - pad * 2) / 9);
    const js = Math.round(s.js);
    const css = Math.round(s.css);
    const left = cx - (cols * cell) / 2;
    const bottom = H - pad;
    for (let i = 0; i < js + css; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const size = cell * 0.56;
      out.push({ x: left + col * cell + cell / 2, y: bottom - row * cell - cell / 2, w: size, h: size, a: 1, fill: i < js ? 1 : 0, glow: 0 });
    }
  } else if (round === "code") {
    const colW = (W - pad * 2 - 7 * 8) / 8;
    const lineH = Math.min(5, (H - pad * 2) / 52);
    const left = side === "lucid" ? cx - colW / 2 : pad;
    s.code.forEach((lines, f) => {
      lines.forEach((len, l) => {
        const w = Math.max(0, Math.min(1, len / 110)) * colW;
        out.push({ x: left + f * (colW + 8) + w / 2, y: pad + l * lineH + lineH / 2, w, h: Math.max(1.5, lineH * 0.62), a: len ? 0.9 : 0, fill: 1, glow: 0 });
      });
    });
  } else if (round === "mistake") {
    const cy = H * 0.3;
    const bw = Math.min(150, W * 0.42);
    const bh = 46;
    const per = 2 * (bw + bh);
    const n = 44;
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per;
      let x, y;
      if (d < bw) { x = cx - bw / 2 + d; y = cy - bh / 2; }
      else if ((d -= bw) < bh) { x = cx + bw / 2; y = cy - bh / 2 + d; }
      else if ((d -= bh) < bw) { x = cx + bw / 2 - d; y = cy + bh / 2; }
      else { d -= bw; x = cx - bw / 2; y = cy + bh / 2 - d; }
      const caught = extra && side === "lucid";
      out.push({ x, y, w: caught ? 6 : 4, h: caught ? 6 : 4, a: caught ? 1 : 0.5, fill: 1, glow: caught ? 1 : 0 });
    }
    for (let i = 0; i < 9; i++) {
      const t = (i - 4) * 3.4;
      const caught = extra && side === "lucid";
      out.push({ x: cx + t, y: cy + t, w: 4, h: 4, a: caught ? 1 : 0.7, fill: 1, glow: caught ? 1 : 0 });
      if (i !== 4) out.push({ x: cx + t, y: cy - t, w: 4, h: 4, a: caught ? 1 : 0.7, fill: 1, glow: caught ? 1 : 0 });
    }
  }
  while (out.length < pool) out.push({ ...hide });
  return out;
}

function Particles({ side, round, extra }) {
  const canvas = h("canvas", { class: "cmp-canvas", "aria-hidden": "true" });
  const ctx = canvas.getContext("2d");
  const pool = side === "react" ? 181 : 30;
  const parts = Array.from({ length: pool }, () => ({ x: 0, y: 0, w: 0, h: 0, a: 0, fill: 1, glow: 0, from: null, to: null }));
  let W = 0, H = 0, start = 0, raf = 0, visible = false, ink = "#000", accent = "#c9a", born = performance.now();

  const colors = () => {
    const css = getComputedStyle(canvas);
    ink = css.color;
    accent = css.borderTopColor;
  };
  const retarget = () => {
    const targets = formation(round.peek(), side, W, H, pool, extra.peek());
    start = performance.now();
    parts.forEach((p, i) => { p.from = { x: p.x, y: p.y, w: p.w, h: p.h, a: p.a, fill: p.fill, glow: p.glow }; p.to = targets[i]; p.delay = (i % 60) * 9; });
    wake();
  };
  const size = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    colors();
    if (!parts[0].to) parts.forEach(p => { p.x = W / 2; p.y = H / 2; });
    retarget();
  };
  const draw = now => {
    ctx.clearRect(0, 0, W, H);
    let moving = false;
    const dur = still.matches ? 0 : 900;
    if (round.peek() === "install" && side === "react") {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      for (let i = 1; i < STACKS.react.runtime; i++) {
        const p = parts[i];
        const q = parts[Math.floor((i - 1) / 4)];
        ctx.globalAlpha = 0.14 * Math.min(p.a, q.a);
        ctx.beginPath();
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
    for (const p of parts) {
      if (p.to) {
        const t = dur ? ease((now - start - p.delay) / dur) : 1;
        if (t < 1) moving = true;
        for (const k of ["x", "y", "w", "h", "a", "fill", "glow"]) p[k] = p.from[k] + (p.to[k] - p.from[k]) * t;
      }
      if (p.a < 0.01 || p.w < 0.2) continue;
      const pulse = p.glow > 0.5 && !still.matches ? 0.75 + 0.25 * Math.sin((now - born) / 380) : 1;
      ctx.globalAlpha = p.a * pulse;
      const color = side === "lucid" || p.glow > 0.5 ? accent : ink;
      const r = Math.min(p.w, p.h) / 2;
      ctx.beginPath();
      ctx.roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, r);
      if (p.fill > 0.5) { ctx.fillStyle = color; ctx.fill(); }
      else { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (p.glow > 0.5 && side === "lucid" && round.peek() === "install") {
        ctx.globalAlpha = 0.18 * pulse;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.w * (1.4 + (still.matches ? 0 : 0.5 * Math.sin((now - born) / 520))), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    return moving || (!still.matches && parts.some(p => p.glow > 0.5));
  };
  const frame = now => {
    raf = 0;
    if (!visible) return;
    if (draw(now)) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };

  const sizer = new ResizeObserver(size);
  const seen = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); });
  queueMicrotask(() => { sizer.observe(canvas); seen.observe(canvas); });
  effect(() => { round.value; extra.value; untrack(() => { if (W) retarget(); }); });
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const recolor = () => { colors(); wake(); };
  scheme.addEventListener("change", recolor);
  const themeWatch = new MutationObserver(recolor);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  onCleanup(() => { sizer.disconnect(); seen.disconnect(); themeWatch.disconnect(); scheme.removeEventListener("change", recolor); cancelAnimationFrame(raf); });
  return canvas;
}

function Count({ value, digits }) {
  const shown = signal(value.peek() ?? 0);
  let raf = 0;
  effect(() => {
    const to = value.value;
    if (to == null) return;
    const from = untrack(() => shown.value);
    if (still.matches) { shown.value = to; return; }
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const t = ease((now - t0) / 900);
      shown.value = from + (to - from) * t;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
  onCleanup(() => cancelAnimationFrame(raf));
  return h("span", { class: "cmp-num" }, () => shown.value.toLocaleString("en-US", { minimumFractionDigits: digits.value, maximumFractionDigits: digits.value }));
}

const ROWS = n => Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `Row ${i + 1}` }));
const median = list => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

async function loadReact() {
  const [React, Client, Dom] = await Promise.all([
    import("https://esm.sh/react@19.3.0"),
    import("https://esm.sh/react-dom@19.3.0/client?deps=react@19.3.0"),
    import("https://esm.sh/react-dom@19.3.0?deps=react@19.3.0")
  ]);
  return { createElement: React.createElement, createRoot: Client.createRoot, flushSync: Dom.flushSync };
}

function racers(lucidBox, reactBox, R) {
  const rows = signal([]);
  const stop = mount(() => h("ul", { class: "cmp-rows" }, For({ each: rows, key: r => r.id }, (r, i, live) => h("li", () => live.value.label))), lucidBox);
  const root = R.createRoot(reactBox);
  const List = ({ items }) => R.createElement("ul", { className: "cmp-rows" }, items.map(r => R.createElement("li", { key: r.id }, r.label)));
  let reactItems = [];
  const time = (fn, box) => { const t0 = performance.now(); fn(); box.offsetHeight; return performance.now() - t0; };
  const lucid = next => time(() => { rows.value = next; }, lucidBox);
  const react = next => time(() => { reactItems = next; R.flushSync(() => root.render(R.createElement(List, { items: next }))); }, reactBox);
  return { lucid, react, current: { lucid: () => rows.peek(), react: () => reactItems }, dispose: () => { stop(); root.unmount(); } };
}

const OPS = [
  { name: "Create 1,000", next: () => ROWS(1000) },
  { name: "Update all", next: rows => rows.map(r => ({ ...r, label: `${r.label} ✓` })) },
  { name: "Swap two", next: rows => { const c = [...rows]; [c[1], c[998]] = [c[998], c[1]]; return c; } },
  { name: "Clear all", next: () => [] }
];

const LOGO = new Path2D("M287.5,575 C128.512511,575 0,446.485406 0,287.5 C0,128.509211 128.512511,0 287.5,0 C446.487489,0 575,128.509211 575,287.5 C575,446.485406 446.487489,575 287.5,575 Z M325.873508,495.768352 C325.873508,489.400754 320.708257,484.238856 314.43463,484.238856 L260.56537,484.238856 C254.205656,484.238856 249.126492,489.400754 249.126492,495.768352 C249.126492,502.039064 254.205656,507.206345 260.56537,507.206345 L314.43463,507.206345 C320.708257,507.206345 325.873508,502.039064 325.873508,495.768352 Z M399.661264,419.303353 C399.661264,412.941138 394.496014,407.86536 388.222386,407.86536 L186.777614,407.86536 C180.412518,407.86536 175.338736,412.941138 175.338736,419.303353 C175.338736,425.665568 180.412518,430.741346 186.777614,430.741346 L388.222386,430.741346 C394.496014,430.741346 399.661264,425.665568 399.661264,419.303353 Z M491.898651,342.929858 C491.898651,336.567643 486.7334,331.400361 480.459773,331.400361 L94.5402272,331.400361 C88.1751319,331.400361 83.1013493,336.567643 83.1013493,342.929858 C83.1013493,349.205952 88.1751319,354.367851 94.5402272,354.367851 L480.459773,354.367851 C486.7334,354.367851 491.898651,349.205952 491.898651,342.929858 Z M535.34056,252.357104 C518.273711,130.791427 413.768855,37.2636343 287.5,37.2636343 C161.225764,37.2636343 56.7262885,130.791427 39.6594397,252.357104 C37.0768144,270.98623 51.8354419,287.5 70.6509432,287.5 L504.349057,287.5 C523.07309,287.5 537.923186,270.98623 535.34056,252.357104 Z");

function Intro({ stage, done }) {
  const canvas = h("canvas", { class: "cmp-intro", "aria-hidden": "true" });
  const ctx = canvas.getContext("2d");
  const probe = document.createElement("canvas").getContext("2d");
  let dots = [];
  let W = 0, H = 0, raf = 0, burstAt = 0, holdAt = 0, ink = "#000", accent = "#c9a";
  const seeded = n => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };

  const build = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(canvas);
    ink = css.color;
    accent = css.borderTopColor;
    const size = Math.min(W * 0.72, H * 0.82, 420);
    const gap = Math.max(7, size / 34);
    const left = W / 2 - size / 2;
    const top = H / 2 - size / 2;
    const scale = 575 / size;
    dots = [];
    let n = 0;
    for (let y = gap / 2; y < size; y += gap) {
      for (let x = gap / 2; x < size; x += gap) {
        if (!probe.isPointInPath(LOGO, x * scale, y * scale, "evenodd")) continue;
        n++;
        const a = seeded(n) * Math.PI * 2;
        const d = Math.max(W, H) * (0.45 + seeded(n + 7) * 0.5);
        const side = x < size / 2 ? -1 : 1;
        dots.push({
          tx: left + x, ty: top + y,
          sx: W / 2 + Math.cos(a) * d, sy: H / 2 + Math.sin(a) * d * 0.7,
          bx: W / 2 + side * (W * 0.18 + seeded(n + 3) * W * 0.22), by: H * (0.25 + seeded(n + 5) * 0.55),
          lag: seeded(n + 11) * 0.35, r: gap * 0.3
        });
      }
    }
    wake();
  };

  const progress = () => {
    const r = stage.getBoundingClientRect();
    return Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.62)));
  };

  const frame = now => {
    raf = 0;
    ctx.clearRect(0, 0, W, H);
    const p = progress();
    if (!burstAt && p >= 1) { holdAt ||= now; if (now - holdAt > 520) { burstAt = now; done.value = true; } }
    if (p < 1) holdAt = 0;
    const b = burstAt ? Math.min(1, (now - burstAt) / 950) : 0;
    for (const d of dots) {
      const q = ease((p - d.lag) / (1 - d.lag));
      let x = d.sx + (d.tx - d.sx) * q;
      let y = d.sy + (d.ty - d.sy) * q;
      let alpha = 0.15 + q * 0.85;
      if (b) {
        const k = ease(b);
        x += (d.bx - x) * k;
        y += (d.by - y) * k;
        alpha *= 1 - b;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = b > 0.05 ? accent : ink;
      ctx.beginPath();
      ctx.arc(x, y, d.r * (1 + b * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (b < 1) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && W) raf = requestAnimationFrame(frame); };
  const onScroll = () => wake();
  const sizer = new ResizeObserver(build);
  queueMicrotask(() => sizer.observe(canvas));
  addEventListener("scroll", onScroll, { passive: true });
  onCleanup(() => { sizer.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); });
  return canvas;
}

export function Compare({ builderUrl }) {
  const introDone = signal(still.matches);
  const round = signal(still.matches ? "install" : "intro");
  const extra = signal(0);
  const auto = signal(true);
  const inView = signal(false);
  const race = signal({ state: "idle", lucid: null, react: null, ops: [] });
  const caught = signal(null);
  const index = computed(() => Math.max(0, ROUNDS.findIndex(r => r.id === round.value)));
  const def = computed(() => ROUNDS[index.value]);
  let timer = 0;

  effect(() => { if (introDone.value) untrack(() => { if (round.value === "intro") round.value = "install"; }); });

  const go = (id, byHand) => {
    if (byHand) { auto.value = false; introDone.value = true; }
    round.value = id;
    extra.value = id === "race" ? (race.peek().state === "done" ? 1 : 0) : id === "mistake" ? (caught.peek() ? 1 : 0) : 0;
  };
  effect(() => {
    clearTimeout(timer);
    if (!auto.value || !inView.value || !introDone.value || still.matches) return;
    const i = index.value;
    timer = setTimeout(() => go(ROUNDS[(i + 1) % ROUNDS.length].id), i >= 3 ? 9000 : 6500);
  });
  onCleanup(() => clearTimeout(timer));

  const readout = side => {
    const value = computed(() => {
      const r = def.value;
      if (r.id === "race") return race.value[side];
      if (r.id === "mistake") return caught.value ? (side === "lucid" ? 1 : 0) : null;
      return r.value(STACKS[side]);
    });
    const digits = computed(() => def.value.digits);
    return h("div", { class: "cmp-readout", "aria-live": "polite" }, () => {
      const r = def.value;
      if (value.value == null) {
        const wait = r.id === "race"
          ? (race.value.state === "running" ? "Running…" : race.value.state === "error" ? "Couldn't load React here." : "Ready when you are.")
          : "Waiting for a mistake.";
        return h("p", { class: "cmp-wait" }, wait);
      }
      return untrack(() => h("p", { class: "cmp-big" }, Count({ value, digits }), h("span", { class: "cmp-unit" }, () => def.value.unit(STACKS[side]))));
    });
  };

  const lucidBox = h("div", { class: "cmp-viewport", aria: { label: "Lucid UI race rows" } });
  const reactBox = h("div", { class: "cmp-viewport", aria: { label: "React race rows" } });

  let pair = null;
  onCleanup(() => pair?.dispose());
  const runRace = async () => {
    auto.value = false;
    race.value = { state: "running", lucid: null, react: null, ops: [] };
    extra.value = 0;
    let R;
    try { R = await loadReact(); } catch { race.value = { ...race.peek(), state: "error" }; return; }
    pair?.dispose();
    pair = racers(lucidBox, reactBox, R);
    const results = [];
    try {
      for (let pass = 0; pass < 2; pass++) for (const op of OPS) { pair.lucid(op.next(pair.current.lucid())); pair.react(op.next(pair.current.react())); }
      for (let k = 0; k < OPS.length; k++) {
        const op = OPS[k];
        const l = [], r = [];
        for (let run = 0; run < 5; run++) {
          pair.lucid(k === 0 ? [] : ROWS(1000));
          pair.react(k === 0 ? [] : ROWS(1000));
          if (run % 2) { r.push(pair.react(op.next(pair.current.react()))); l.push(pair.lucid(op.next(pair.current.lucid()))); }
          else { l.push(pair.lucid(op.next(pair.current.lucid()))); r.push(pair.react(op.next(pair.current.react()))); }
          await new Promise(res => requestAnimationFrame(() => res()));
        }
        results.push({ name: op.name, lucid: median(l), react: median(r) });
        extra.value = (k + 1) / OPS.length;
        race.value = { ...race.peek(), ops: [...results] };
      }
      pair.lucid(ROWS(1000));
      pair.react(ROWS(1000));
      const sum = side => Math.round(results.reduce((n, o) => n + o[side], 0) * 10) / 10;
      race.value = { state: "done", lucid: sum("lucid"), react: sum("react"), ops: results };
      extra.value = 1;
    } catch {
      race.value = { ...race.peek(), state: "error" };
    }
  };

  const makeMistake = () => {
    auto.value = false;
    let found = null;
    const off = onDiagnostic(d => { found ??= d; });
    Button({ icon: "x" });
    off();
    if (found) caught.value = { code: found.code, message: found.message, fix: found.fix };
    extra.value = 1;
  };

  const results = side => h("ol", { class: "cmp-results" }, OPS.map((op, k) => h("li",
    h("span", op.name),
    h("i", { class: "cmp-result-bar" }, h("b", { style: () => { const o = race.value.ops[k]; return { width: o ? `${Math.max(4, (o[side] / Math.max(o.react, o.lucid)) * 100)}%` : "0%" }; } })),
    h("small", () => { const o = race.value.ops[k]; return o ? `${o[side].toFixed(1)} ms` : "–"; }))));

  const note = side => h("div", { class: "cmp-note", hidden: () => round.value !== "mistake" || !caught.value }, side === "lucid"
    ? () => (caught.value ? h("div", { class: "cmp-diag" }, h("b", caught.value.code), h("p", caught.value.message), h("small", caught.value.fix)) : null)
    : h("p", { class: "cmp-silent" }, "No warning without a lint plugin. The button ships without a name."));

  const Lane = side => h("div", { class: "cmp-lane", "data-side": side },
    h("header", { class: "cmp-lane-head" },
      h("span", { class: "cmp-lane-dot" }),
      h("div",
        h("b", () => (round.value === "race" ? (side === "react" ? "React" : "Lucid UI") : STACKS[side].name)),
        h("small", () => (round.value === "race" ? (side === "react" ? "React 19.3, from esm.sh" : "Lucid UI 0.3.8 core") : STACKS[side].tools)))),
    h("div", { class: "cmp-field" },
      Particles({ side, round, extra }),
      h("div", { class: "cmp-race", hidden: () => round.value !== "race" }, side === "lucid" ? lucidBox : reactBox, results(side)),
      note(side)),
    readout(side));

  const winner = computed(() => {
    const r = race.value;
    if (r.state !== "done") return "";
    const names = { react: "React", lucid: "Lucid UI" };
    const fast = r.lucid <= r.react ? "lucid" : "react";
    const ratio = Math.max(r.lucid, r.react) / Math.max(0.1, Math.min(r.lucid, r.react));
    const gap = Math.abs(r.react - r.lucid).toFixed(1);
    return ratio < 1.25 ? `Within ${gap} ms of each other on this device.` : `${names[fast]} was ${ratio.toFixed(1)}× faster on this device.`;
  });

  const next = i => ROUNDS[(i + 1) % ROUNDS.length];
  const actions = ROUNDS.map((r, i) => h("div", { class: "cmp-cell", "data-on": () => String(round.value === r.id || (round.value === "intro" && i === 0)) },
    r.id === "race"
      ? [Button({ variant: "primary", icon: "zap", disabled: () => race.value.state === "running", onClick: runRace }, () => (race.value.state === "done" ? "Run it again" : "Run the race")),
        h("span", { class: "cmp-winner" }, () => winner.value || "Your device, your numbers.")]
      : r.id === "mistake"
        ? Button({ variant: "primary", icon: "alert-circle", onClick: makeMistake }, () => (caught.value ? "Make it again" : "Make the mistake"))
        : Button({ variant: "secondary", iconRight: "arrow-right", onClick: () => go(next(i).id, true) }, `Next: ${next(i).label}`)));

  const stage = h("div", { class: "cmp-stage", "data-intro": () => String(!introDone.value), role: "tabpanel", aria: { label: () => def.value.label } },
    Lane("react"),
    h("div", { class: "cmp-vs", "aria-hidden": "true" }, h("span", "vs")),
    Lane("lucid"));

  const section = h("section", { class: "section cmp", id: "compare" },
    h("div", { class: "site-wrap cmp-wrap" },
      SectionHead({
        eyebrow: "the weigh-in",
        title: "One app, built twice. Then weighed.",
        lead: "A team directory with search and an Add dialog, built with React, Tailwind and shadcn/ui, and again with Lucid UI. Same tool, same settings, every number measured.",
        align: "center"
      }),
      h("div", { class: "cmp-rounds", role: "tablist", aria: { label: "Rounds" } }, ROUNDS.map((r, i) => h("button", {
        type: "button",
        role: "tab",
        class: "cmp-round",
        "aria-selected": () => String(round.value === r.id),
        "data-auto": () => String(auto.value && inView.value && introDone.value && round.value === r.id && !still.matches),
        style: { "--dur": i >= 3 ? "9s" : "6.5s" },
        onClick: () => go(r.id, true)
      }, h("span", { class: "cmp-round-n" }, String(i + 1).padStart(2, "0")), h("span", r.label), h("i", { class: "cmp-round-bar" })))),
      h("div", { class: "cmp-arena" }, stage, still.matches ? null : Intro({ stage, done: introDone })),
      h("div", { class: "cmp-under" },
        h("div", { class: "cmp-stack cmp-captions", "aria-live": "polite" }, ROUNDS.map((r, i) => h("p", { class: "cmp-cell cmp-caption", "data-on": () => String(round.value === r.id || (round.value === "intro" && i === 0)) }, r.caption))),
        h("div", { class: "cmp-stack cmp-actions" }, actions)),
      h("div", { class: "cmp-score", role: "list", aria: { label: "Scoreboard" } },
        [["Runtime packages", "33", "1"], ["Shipped, gzipped", `${total(STACKS.react)} KB`, `${total(STACKS.lucid)} KB`], ["Code you own", "181 lines", "30 lines"], ["Accessibility warnings", "With a plugin", "Built in"]].map(([label, r, l]) => h("div", { class: "cmp-score-item", role: "listitem" },
          h("small", label), h("div", h("span", { "data-side": "react" }, r), h("i", "vs"), h("b", { "data-side": "lucid" }, l))))),
      h("p", { class: "cmp-foot" },
        h("a", { href: builderUrl(LUCID_APP) }, Icon({ name: "zap", size: 14 }), "Open the Lucid version in Builder"),
        h("a", { href: "https://github.com/lucidui-dev/lucidui/tree/main/bench/compare" }, Icon({ name: "external", size: 14 }), "Rerun the benchmark"),
        h("span", "Measured 13 October 2026. 1 KB is 1,024 bytes."))));

  const seen = new IntersectionObserver(([e]) => {
    const room = Math.min(e.boundingClientRect.height, e.rootBounds?.height ?? innerHeight);
    inView.value = e.isIntersecting && e.intersectionRect.height >= room * 0.5;
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  queueMicrotask(() => seen.observe(section));
  onCleanup(() => seen.disconnect());
  return section;
}
