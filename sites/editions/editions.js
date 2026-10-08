import { signal, h, onCleanup } from "/lucid/index.js";
import { Button, Icon } from "/lucid/ui/index.js";
import { mountPage, jump } from "/shared/chrome.js";

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLS = 44;
const ROWS = 28;

const LAYOUTS = {
  console: [
    { x: 0, y: 0, w: 9, h: 28, a: 0.16 },
    { x: 1, y: 2, w: 5, h: 1, a: 0.6 },
    { x: 1, y: 6, w: 7, h: 1, a: 0.4 },
    { x: 1, y: 8, w: 7, h: 1, a: 1, gold: true },
    { x: 1, y: 10, w: 6, h: 1, a: 0.4 },
    { x: 1, y: 12, w: 7, h: 1, a: 0.4 },
    { x: 1, y: 14, w: 5, h: 1, a: 0.4 },
    { x: 11, y: 1, w: 14, h: 2, a: 0.75 },
    { x: 11, y: 5, w: 10, h: 5, a: 0.14 },
    { x: 12, y: 7, w: 5, h: 1, a: 0.9 },
    { x: 22, y: 5, w: 10, h: 5, a: 0.14 },
    { x: 23, y: 7, w: 4, h: 1, a: 0.9 },
    { x: 33, y: 5, w: 11, h: 5, a: 0.14 },
    { x: 34, y: 7, w: 6, h: 1, a: 1, gold: true },
    { x: 11, y: 12, w: 21, h: 10, kind: "bars", seed: [3, 5, 4, 7, 6, 8, 5, 9, 7, 10] },
    { x: 33, y: 12, w: 11, h: 10, kind: "lines", gap: 2, a: 0.35 },
    { x: 11, y: 24, w: 33, h: 4, kind: "lines", gap: 2, a: 0.25 }
  ],
  shop: [
    { x: 0, y: 0, w: 44, h: 2, a: 0.16 },
    { x: 1, y: 0, w: 6, h: 1, a: 0.8 },
    { x: 36, y: 0, w: 7, h: 1, a: 1, gold: true },
    { x: 2, y: 4, w: 19, h: 12, a: 0.22 },
    { x: 23, y: 5, w: 14, h: 2, a: 0.85 },
    { x: 23, y: 9, w: 19, h: 4, kind: "lines", gap: 2, a: 0.35 },
    { x: 23, y: 14, w: 8, h: 2, a: 1, gold: true },
    { x: 2, y: 19, w: 9, h: 8, a: 0.16 },
    { x: 13, y: 19, w: 9, h: 8, a: 0.16 },
    { x: 24, y: 19, w: 9, h: 8, a: 0.16 },
    { x: 35, y: 19, w: 8, h: 8, a: 0.16 }
  ],
  planner: [
    { x: 0, y: 0, w: 44, h: 2, a: 0.16 },
    { x: 1, y: 0, w: 9, h: 1, a: 0.8 },
    { x: 2, y: 4, w: 28, h: 23, kind: "grid", a: 0.2 },
    { x: 7, y: 9, w: 7, h: 1, a: 1, gold: true },
    { x: 15, y: 14, w: 10, h: 1, a: 0.7 },
    { x: 3, y: 19, w: 5, h: 1, a: 0.7 },
    { x: 32, y: 4, w: 11, h: 23, a: 0.12 },
    { x: 33, y: 5, w: 8, h: 1, a: 0.8 },
    { x: 33, y: 8, w: 9, h: 12, kind: "lines", gap: 3, a: 0.4 }
  ],
  ledger: [
    { x: 0, y: 0, w: 44, h: 2, a: 0.16 },
    { x: 2, y: 4, w: 20, h: 3, a: 0.85 },
    { x: 2, y: 9, w: 40, h: 8, kind: "bars", seed: [4, 6, 5, 8, 7, 6, 9, 8, 10, 9, 11, 10, 12, 11] },
    { x: 2, y: 19, w: 40, h: 8, kind: "lines", gap: 2, a: 0.3 },
    { x: 34, y: 4, w: 8, h: 2, a: 1, gold: true }
  ]
};

function field(layout) {
  const cells = new Float32Array(COLS * ROWS);
  const gold = new Uint8Array(COLS * ROWS);
  const bars = [];
  const set = (c, r, a, g) => {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    const i = r * COLS + c;
    if (a >= cells[i]) { cells[i] = a; gold[i] = g ? 1 : 0; }
  };
  for (const shape of LAYOUTS[layout]) {
    const { x, y, w, h: ht, a = 0.3, kind = "fill" } = shape;
    if (kind === "bars") {
      const n = shape.seed.length;
      const step = w / n;
      const top = Math.max(...shape.seed);
      shape.seed.forEach((v, k) => {
        const col = Math.round(x + k * step + step / 2 - 0.5);
        bars.push({ col, base: y + ht - 1, height: Math.max(1, Math.round((v / top) * (ht - 1))), last: k === n - 1 });
      });
      for (let c = x; c < x + w; c++) set(c, y + ht - 1, 0.18);
      continue;
    }
    for (let r = y; r < y + ht; r++) {
      for (let c = x; c < x + w; c++) {
        if (kind === "lines" && (r - y) % (shape.gap ?? 2)) continue;
        if (kind === "lines" && c > x + w - 1 - ((r * 7) % 5)) continue;
        if (kind === "grid" && (r - y) % 5 && (c - x) % 4) continue;
        const edge = kind === "fill" && a < 0.3 && ht > 2 && (r === y || r === y + ht - 1 || c === x || c === x + w - 1);
        set(c, r, edge ? a + 0.2 : a, shape.gold);
      }
    }
  }
  return { cells, gold, bars };
}

function Plate({ layout, dim = false, label }) {
  const canvas = h("canvas", { "aria-hidden": "true" });
  const box = h("div", { class: "ed-plate-canvas", "data-dim": String(dim), role: "img", aria: { label } }, canvas);
  const ctx = canvas.getContext("2d");
  const { cells, gold, bars } = field(layout);
  let width = 0, height = 0, pitch = 0, ratio = 1, born = performance.now(), frame = 0, mouse = null, visible = true;

  const size = () => {
    const rect = box.getBoundingClientRect();
    ratio = devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    pitch = width / COLS;
  };

  const draw = t => {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const r = Math.max(1, pitch * 0.17);
    const age = still ? 1e9 : t - born;
    const live = new Float32Array(COLS * ROWS);
    for (const b of bars) {
      const breathe = still || dim ? 0 : Math.round(Math.sin(t / 900 + b.col * 0.6) * 0.6);
      const height2 = Math.max(1, b.height + breathe);
      for (let k = 0; k < height2; k++) live[(b.base - k) * COLS + b.col] = b.last ? 2 : 0.85;
    }
    for (let row = 0; row < ROWS; row++) {
      for (let c = 0; c < COLS; c++) {
        const i = row * COLS + c;
        const reveal = Math.min(1, Math.max(0, (age - (c + row) * 22) / 500));
        let a = Math.max(cells[i], live[i] > 1 ? 1 : live[i]);
        let g = gold[i] || live[i] > 1;
        const x = c * pitch + pitch / 2;
        const y = row * pitch + pitch / 2;
        if (mouse && !dim) {
          const d = Math.hypot(mouse.x - x, mouse.y - y);
          if (d < 64) a = Math.max(a, 0.12) + (1 - d / 64) * 0.4;
        }
        const base = 0.06;
        const alpha = dim ? base + a * 0.22 : base + a * 0.9 * reveal;
        ctx.beginPath();
        ctx.arc(x, y, a > 0.7 && !dim ? r * 1.2 : r, 0, Math.PI * 2);
        ctx.fillStyle = g && !dim ? `rgba(232,214,168,${Math.min(1, alpha)})` : `rgba(245,242,234,${Math.min(1, alpha)})`;
        ctx.fill();
      }
    }
  };

  const loop = t => {
    if (visible) draw(t);
    frame = requestAnimationFrame(loop);
  };

  box.addEventListener("pointermove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (still) draw(performance.now());
  });
  box.addEventListener("pointerleave", () => { mouse = null; if (still) draw(performance.now()); });

  queueMicrotask(() => {
    size();
    const ro = new ResizeObserver(() => { size(); draw(performance.now()); });
    ro.observe(box);
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was && !still && !dim) born = Math.min(born, performance.now());
    });
    io.observe(box);
    if (still || dim) draw(performance.now());
    else frame = requestAnimationFrame(loop);
    onCleanup(() => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(frame); });
  });
  return box;
}

function Hero(L) {
  return h("section", { class: "ed-hero" },
    h("div", { class: "ed-wrap ed-hero-grid" },
      h("div", { class: "ed-hero-copy" },
        h("p", { class: "ed-kicker" }, h("i"), "Lucid Editions"),
        h("h1", { class: "ed-title" }, "Finished apps,", h("br"), h("em", "made to be yours.")),
        h("p", { class: "ed-lede" }, "Complete apps built only from Lucid UI. Every screen and every state designed, light and dark, phone to desktop. You get the source, a licence to ship it, and docs your agent can read, so it can extend the app from day one."),
        h("div", { class: "ed-actions" },
          Button({ variant: "primary", size: "lg", href: "/meridian/", iconRight: "arrow-up-right" }, "Preview No. 01, Meridian"),
          Button({ size: "lg", iconRight: "arrow-down", onClick: jump("collection") }, "See the collection"))),
      h("a", { class: "ed-plate ed-plate-hero ed-plate-link", href: "/meridian/", aria: { label: "Open the live preview of Meridian, Edition No. 01" } },
        h("div", { class: "ed-plate-head" },
          h("span", { class: "ed-no" }, "No. 01 · Meridian"),
          h("span", { class: "ed-plate-state" }, h("i"), "Live preview")),
        Plate({ layout: "console", label: "A sketch of Meridian, a revenue console, drawn in dots" }),
        h("div", { class: "ed-plate-foot" },
          h("span", "Revenue console"),
          h("span", "2,385 customers"),
          h("span", "Open it")))));
}

const INSIDE = [
  { icon: "layers", title: "The whole app", text: "Not a landing page with a dashboard screenshot. Every screen, plus the empty, loading and error states most templates skip." },
  { icon: "copy", title: "Source you own", text: "Plain JavaScript modules with no build step. Get it as a private GitHub repo you can pull updates from, or as a zip." },
  { icon: "sparkles", title: "Ready for your agent", text: "Each Edition ships a guide written for AI agents: how it's laid out, where the data lives and how to add a screen. Point Claude or Cursor at it and keep building." },
  { icon: "check-circle", title: "Clean by design", text: "Zero Lucid diagnostics, keyboard and screen reader tested, no browser dialogs or grey native pickers. The same bar as Lucid UI itself." },
  { icon: "lock", title: "A licence to ship it", text: "Use it in your own products and in client work. One purchase, yours to keep." },
  { icon: "zap", title: "Updates included", text: "Fixes and new screens land in the repo. Pull them when you're ready, or don't." }
];

function Inside() {
  return h("section", { class: "ed-inside", id: "inside" },
    h("div", { class: "ed-wrap" },
      Head("What's in an Edition", "More than a template.", "Templates are usually a good-looking first screen. An Edition is a finished product with the rough edges already sanded off."),
      h("div", { class: "ed-inside-grid" },
        INSIDE.map(item => h("article", { class: "ed-feature" },
          h("span", { class: "ed-feature-icon" }, Icon({ name: item.icon, size: 18 })),
          h("h3", item.title),
          h("p", item.text))))));
}

const STEPS = [
  { title: "Try it live", text: "Every Edition has a full working preview. Click through every screen before you buy." },
  { title: "Buy it once", text: "Checkout is handled by Polar, who take care of sales tax and VAT and send your receipt." },
  { title: "Make it yours", text: "Accept the invite to the private repo or download the zip, then rename it, restyle it and ship it." }
];

function How() {
  return h("section", { class: "ed-how" },
    h("div", { class: "ed-wrap" },
      Head("How it works", "From preview to yours in three steps.", null),
      h("ol", { class: "ed-steps" },
        STEPS.map((step, i) => h("li", { class: "ed-step" },
          h("span", { class: "ed-step-n" }, String(i + 1)),
          h("h3", step.title),
          h("p", step.text))))));
}

const PLATES = [
  { no: "No. 01", name: "Meridian", layout: "console", state: "Live preview", now: true },
  { no: "No. 02", layout: "shop", state: "Unannounced" },
  { no: "No. 03", layout: "planner", state: "Unannounced" },
  { no: "No. 04", layout: "ledger", state: "Unannounced" }
];

function Collection(L) {
  return h("section", { class: "ed-collection", id: "collection" },
    h("div", { class: "ed-wrap" },
      Head("The collection", "Numbered, and released one at a time.", "Each Edition is designed, built and tested before the next one starts. No. 01, Meridian, is open to try now."),
      h("div", { class: "ed-shelf" },
        PLATES.map(p => h("figure", { class: "ed-plate", "data-now": String(Boolean(p.now)) },
          h("div", { class: "ed-plate-head" },
            h("span", { class: "ed-no" }, p.name ? `${p.no} · ${p.name}` : p.no),
            h("span", { class: "ed-plate-state" }, h("i"), p.state)),
          Plate({ layout: p.layout, dim: !p.now, label: p.now ? "The first Edition, in progress" : "An unannounced Edition" }),
          h("figcaption", { class: "ed-plate-foot" }, p.now ? [h("span", "Revenue and customer console"), h("a", { href: "/meridian/" }, "Open the live preview", Icon({ name: "arrow-up-right", size: 13 }))] : h("span", "Details when it's ready")))))));
}

function Free(L) {
  return h("section", { class: "ed-free" },
    h("div", { class: "ed-wrap ed-free-card" },
      h("div",
        h("p", { class: "ed-kicker" }, h("i"), "Free stays free"),
        h("h2", { class: "ed-h2" }, "Lucid UI itself is never for sale."),
        h("p", { class: "ed-lead" }, "The runtime, the components, the charts, Builder, the docs and the sandbox demos are MIT licensed and always will be. Editions are separate: finished apps you can buy, and they help pay for the free work.")),
      h("div", { class: "ed-free-links" },
        Button({ href: L.manifesto, icon: "sparkles" }, "Read the manifesto"),
        Button({ href: L.docs, icon: "hash" }, "Read the docs"),
        Button({ variant: "ghost", href: L.github, icon: "external" }, "Lucid UI on GitHub"))));
}

const FAQ = [
  ["Do I need to know Lucid UI?", "No. Editions run as they are, and each one includes a guide to how it's built. If you've written JavaScript, you'll find your way around in an afternoon, and your agent will in a minute."],
  ["What do I need to run one?", "A browser and a place to host static files. There's no build step, no framework and no package to install unless you want one."],
  ["Can I use an Edition for a client?", "Yes. The licence covers your own products and client work. You can't resell or give away the Edition itself as a template."],
  ["How does the private repo work?", "When you buy, Polar sends you an invite to a private GitHub repository. Accept it to clone the Edition and pull updates. Prefer a zip? That's included too."],
  ["Who handles payment?", "Polar is the seller of record. They process the payment, handle sales tax and VAT, and send your receipt and invoice."],
  ["Can my agent work on it?", "That's the idea. Every Edition comes with a guide written for agents, and they can preview changes live in Lucid Builder."]
];

function Faq() {
  const open = signal(0);
  return h("section", { class: "ed-faq", id: "faq" },
    h("div", { class: "ed-wrap ed-faq-grid" },
      Head("Questions", "Before you ask.", null),
      h("div", { class: "ed-faq-list" },
        FAQ.map(([q, a], i) => h("div", { class: "ed-qa", "data-open": () => String(open.value === i) },
          h("h3",
            h("button", { type: "button", id: `ed-q-${i}`, "aria-expanded": () => String(open.value === i), "aria-controls": `ed-a-${i}`, onClick: () => { open.value = open.peek() === i ? -1 : i; } },
              h("span", q), Icon({ name: "plus", size: 16 }))),
          h("div", { class: "ed-qa-a", id: `ed-a-${i}`, role: "region", aria: { labelledby: `ed-q-${i}` } }, h("p", a)))))));
}

function Head(eyebrow, title, lead) {
  return h("header", { class: "ed-head" },
    h("p", { class: "ed-kicker" }, h("i"), eyebrow),
    h("h2", { class: "ed-h2" }, title),
    lead ? h("p", { class: "ed-lead" }, lead) : null);
}

mountPage({
  site: "editions",
  main: L => [h("div", { class: "ed" }, Hero(L), Collection(L), Inside(), How(), Free(L), Faq())],
  commands: [
    { group: "Editions", label: "The collection", icon: "star", run: jump("collection") },
    { group: "Editions", label: "What's in an Edition", icon: "layers", run: jump("inside") },
    { group: "Editions", label: "Questions", icon: "info", run: jump("faq") }
  ]
});
