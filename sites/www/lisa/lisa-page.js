import { h, mount, signal, onCleanup } from "/lucid/index.js";
import { Button } from "/lucid/ui/index.js";
import { lisa } from "/lucid/lisa/index.js";

const LINES = [
  "1-bit Lisa",
  "Every Lucid UI component",
  "in pure black and white.",
  "Greys made of dither.",
  "Pinstripes. Hard shadows.",
  "Hello from 1983."
];
const BANDS = [5, 36, 47, 58, 69, 80, 94];
const TEXT_Y = [30, 41.5, 52.5, 63.5, 74.5, 85];

const BODY = new Path2D("M50,28 C44,22 30,20 22,28 C12,38 12,58 20,72 C27,85 36,93 44,92 C47,91.5 49,90 50,90 C51,90 53,91.5 56,92 C64,93 73,85 80,72 C88,58 88,38 78,28 C70,20 56,22 50,28 Z");
const LEAF = new Path2D("M53,21 C54,11 63,5 73,6 C72,15 64,21 53,21 Z");
const STEM = new Path2D("M49,29 C49,22 50,16 53,10 L55.5,11 C53,16 52,22 52,29 Z");

const BAYER = (() => {
  const seed = [[0, 2], [3, 1]];
  let m = seed;
  while (m.length < 8) {
    const n = m.length;
    m = Array.from({ length: n * 2 }, (_, y) => Array.from({ length: n * 2 }, (_, x) => m[y % n][x % n] * 4 + seed[Math.floor(y / n)][Math.floor(x / n)]));
  }
  return m.flat();
})();
const threshold = (x, y) => (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
const still = matchMedia("(prefers-reduced-motion: reduce)");

function Stage() {
  const canvas = h("canvas", { class: "ls-stage", "aria-hidden": "true" });
  const ctx = canvas.getContext("2d");
  const progress = new Array(LINES.length).fill(0);
  let cells = [];
  let grid = new Int8Array(0);
  let text = [];
  let cols = 0;
  let cell = 4;
  let hover = -1;
  let raf = 0;
  let last = 0;
  let start = 0;
  let ready = false;

  function build() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth;
    const H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.max(3, Math.round(Math.min(W, H) / 170));
    const top = 28;
    const bottom = W < 560 ? 104 : 86;
    const S = Math.min(W * 0.9, (H - top - bottom) * 1.04);
    const ox = W / 2 - S / 2;
    const oy = top + (H - top - bottom) / 2 - S * 0.49;
    cols = Math.ceil(W / cell);
    const rows = Math.ceil(H / cell);
    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const g = off.getContext("2d", { willReadFrequently: true });
    const unit = S / 100 / cell;
    const read = paths => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, cols, rows);
      g.setTransform(unit, 0, 0, unit, ox / cell, oy / cell);
      for (const p of paths) g.fill(p);
      return g.getImageData(0, 0, cols, rows).data;
    };
    const body = read([BODY]);
    const leaf = read([LEAF, STEM]);
    const inside = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && (body[(y * cols + x) * 4 + 3] > 127 || leaf[(y * cols + x) * 4 + 3] > 127);
    grid = new Int8Array(cols * rows).fill(-1);
    cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!inside(x, y)) continue;
        const ux = ((x + 0.5) * cell - ox) / S * 100;
        const uy = ((y + 0.5) * cell - oy) / S * 100;
        const isLeaf = leaf[(y * cols + x) * 4 + 3] > 127 && body[(y * cols + x) * 4 + 3] <= 127;
        let band = BANDS.findIndex((b, i) => i < BANDS.length - 1 && uy >= b && uy < BANDS[i + 1]);
        if (band < 0) band = uy < BANDS[0] ? 0 : LINES.length - 1;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const d = Math.hypot(ux - 33, uy - 40) / 60;
        const shade = isLeaf ? 0.62 : Math.min(0.94, Math.max(0.08, 0.06 + d * d * 1.25));
        grid[y * cols + x] = band;
        cells.push({ x, y, band, edge, shade, ux, uy });
      }
    }
    for (const c of cells) {
      const above = c.y > 0 ? grid[(c.y - 1) * cols + c.x] : -1;
      const below = grid[(c.y + 1) * cols + c.x] ?? -1;
      c.slot = above !== c.band || below !== c.band;
    }
    const spans = TEXT_Y.map(ty => {
      const row = Math.round((oy + (ty / 100) * S) / cell);
      let n = 0;
      for (let x = 0; x < cols; x++) if (grid[row * cols + x] >= 0) n++;
      return n * cell;
    });
    const half = document.createElement("canvas");
    half.width = Math.ceil(W / 2);
    half.height = Math.ceil(H / 2);
    const t = half.getContext("2d", { willReadFrequently: true });
    t.textAlign = "center";
    t.textBaseline = "middle";
    t.fillStyle = "#000";
    t.font = "10px ChicagoFLF, Chicago, monospace";
    const fits = LINES.map((line, i) => Math.floor((spans[i] * 0.8) / 2 / (t.measureText(line).width / 10)));
    const shared = Math.max(6, Math.min(Math.round(S * 0.021), ...fits.slice(1)));
    const sizes = fits.map((fit, i) => (i === 0 ? Math.max(6, Math.min(Math.round(S * 0.032), fit)) : shared));
    text = LINES.map((line, i) => {
      t.clearRect(0, 0, half.width, half.height);
      t.font = `${sizes[i]}px ChicagoFLF, Chicago, monospace`;
      t.fillText(line, (ox + S / 2) / 2, (oy + (TEXT_Y[i] / 100) * S) / 2);
      const data = t.getImageData(0, 0, half.width, half.height).data;
      const px = [];
      for (let y = 0; y < half.height; y++) for (let x = 0; x < half.width; x++) if (data[(y * half.width + x) * 4 + 3] > 110) px.push(x, y);
      return px;
    });
    ready = true;
    start = performance.now();
    wake();
  }

  function draw(t) {
    const intro = still.matches ? 1 : Math.min(1, (t - start) / 1500);
    const eased = 1 - Math.pow(1 - intro, 3);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const paper = new Path2D();
    const ink = new Path2D();
    for (const c of cells) {
      const th = threshold(c.x, c.y);
      if (eased < th) continue;
      const px = c.x * cell;
      const py = c.y * cell;
      paper.rect(px, py, cell, cell);
      if (c.edge) { ink.rect(px, py, cell, cell); continue; }
      const open = progress[c.band];
      if (open > 0.15 && c.slot) { ink.rect(px, py, cell, cell); continue; }
      if (open > 0 && th < open * 1.06) continue;
      if (c.shade > th) ink.rect(px, py, cell, cell);
    }
    ctx.fillStyle = "#fff";
    ctx.fill(paper);
    ctx.fillStyle = "#000";
    ctx.fill(ink);
    const words = new Path2D();
    progress.forEach((open, i) => {
      if (open < 0.3) return;
      const q = (open - 0.3) / 0.7;
      const px = text[i];
      for (let k = 0; k < px.length; k += 2) if (threshold(px[k] + 3, px[k + 1] + 5) < q) words.rect(px[k] * 2, px[k + 1] * 2, 2, 2);
    });
    ctx.fill(words);
    return intro < 1;
  }

  function frame(t) {
    raf = 0;
    if (!ready) return;
    const dt = Math.min(48, last ? t - last : 16);
    last = t;
    let moving = false;
    progress.forEach((p, i) => {
      const target = hover === i ? 1 : 0;
      if (still.matches) { progress[i] = target; return; }
      const rate = target ? 0.0026 : 0.0019;
      const next = p + Math.sign(target - p) * Math.min(Math.abs(target - p), rate * dt);
      progress[i] = next;
      if (next !== target) moving = true;
    });
    if (draw(t)) moving = true;
    if (moving) raf = requestAnimationFrame(frame);
    else last = 0;
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const bandAt = (cx, cy) => {
    const gx = Math.floor(cx / cell);
    const gy = Math.floor(cy / cell);
    for (let r = 0; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || y < 0 || x >= cols) continue;
      const band = grid[y * cols + x];
      if (band >= 0) return band;
    }
    return -1;
  };

  const onMove = event => {
    const next = bandAt(event.clientX, event.clientY);
    if (next !== hover) { hover = next; wake(); }
  };
  const onLeave = () => { if (hover !== -1) { hover = -1; wake(); } };
  let resizeTimer = 0;
  const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 120); };

  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerdown", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  addEventListener("resize", onResize);
  onCleanup(() => {
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerdown", onMove);
    document.removeEventListener("pointerleave", onLeave);
    removeEventListener("resize", onResize);
    cancelAnimationFrame(raf);
  });

  document.fonts.load("16px ChicagoFLF").catch(() => {}).then(() => requestAnimationFrame(build));
  return canvas;
}

function Clock() {
  const now = signal(new Date());
  const timer = setInterval(() => { now.value = new Date(); }, 10000);
  onCleanup(() => clearInterval(timer));
  return h("span", { class: "ls-bar-clock" }, () => now.value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
}

function Bar() {
  return h("header", { class: "ls-bar" },
    h("a", { class: "ls-bar-mark", href: "https://lucidui.dev", aria: { label: "Lucid UI" } }, h("img", { src: "/media/logo/lucidui-icon.svg", alt: "" })),
    h("b", "1-bit Lisa"),
    h("span", "File"),
    h("span", "Edit"),
    h("span", { class: "ls-bar-extra" }, "View"),
    h("span", { class: "ls-bar-extra" }, "Special"),
    Clock());
}

function Dock() {
  return h("aside", { class: "ls-dock", "data-lisa": "panel" },
    h("div", h("p", "Move across the apple."), h("small", "lucidui.dev/components")),
    Button({ variant: "primary", href: "https://lucidui.dev/components/?look=lisa" }, "Open the kit"));
}

mount(() => [Bar(), Stage(), Dock()], "#app");
lisa({ root: document.body });
