import { signal, computed, h, onCleanup, untrack } from "/lucid/index.js";
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
  ops: [
    { x: 0, y: 0, w: 7, h: 28, a: 0.16 },
    { x: 2, y: 3, w: 3, h: 1, a: 1, gold: true },
    { x: 2, y: 6, w: 3, h: 1, a: 0.5 },
    { x: 2, y: 9, w: 3, h: 1, a: 0.5 },
    { x: 2, y: 12, w: 3, h: 1, a: 0.5 },
    { x: 9, y: 1, w: 8, h: 4, a: 0.18 },
    { x: 10, y: 2, w: 5, h: 2, a: 1, gold: true },
    { x: 18, y: 1, w: 8, h: 4, a: 0.18 },
    { x: 27, y: 1, w: 8, h: 4, a: 0.18 },
    { x: 36, y: 1, w: 8, h: 4, a: 0.18 },
    { x: 9, y: 7, w: 22, h: 20, kind: "lines", gap: 2, a: 0.32 },
    { x: 32, y: 7, w: 12, h: 2, a: 0.7 },
    { x: 33, y: 11, w: 5, h: 1, a: 1, gold: true },
    { x: 35, y: 14, w: 8, h: 1, a: 0.6 },
    { x: 33, y: 17, w: 3, h: 1, a: 0.6 },
    { x: 36, y: 20, w: 7, h: 1, a: 1, gold: true },
    { x: 32, y: 7, w: 12, h: 20, a: 0.1 }
  ],
  flow: [
    { x: 0, y: 0, w: 44, h: 2, a: 0.16 },
    { x: 1, y: 0, w: 6, h: 1, a: 0.8 },
    { x: 1, y: 11, w: 7, h: 5, a: 0.2 },
    { x: 2, y: 13, w: 4, h: 1, a: 1, gold: true },
    { x: 8, y: 13, w: 3, h: 1, a: 0.4 },
    { x: 11, y: 11, w: 7, h: 5, a: 0.2 },
    { x: 12, y: 13, w: 4, h: 1, a: 0.85 },
    { x: 18, y: 13, w: 2, h: 1, a: 0.4 },
    { x: 20, y: 7, w: 1, h: 13, a: 0.4 },
    { x: 21, y: 7, w: 2, h: 1, a: 0.4 },
    { x: 21, y: 19, w: 2, h: 1, a: 0.4 },
    { x: 23, y: 5, w: 8, h: 5, a: 0.2 },
    { x: 24, y: 7, w: 5, h: 1, a: 0.85 },
    { x: 23, y: 17, w: 8, h: 5, a: 0.2 },
    { x: 24, y: 19, w: 4, h: 1, a: 0.85 },
    { x: 14, y: 4, w: 1, h: 7, a: 0.5, gold: true },
    { x: 14, y: 4, w: 13, h: 1, a: 0.5, gold: true },
    { x: 26, y: 4, w: 1, h: 1, a: 0.5, gold: true },
    { x: 31, y: 7, w: 2, h: 1, a: 0.4 },
    { x: 31, y: 19, w: 2, h: 1, a: 0.4 },
    { x: 33, y: 7, w: 1, h: 13, a: 0.4 },
    { x: 34, y: 13, w: 2, h: 1, a: 0.4 },
    { x: 36, y: 11, w: 7, h: 5, a: 0.2 },
    { x: 37, y: 13, w: 4, h: 1, a: 1, gold: true },
    { x: 34, y: 23, w: 9, h: 4, a: 0.14 },
    { x: 13, y: 25, w: 18, h: 2, a: 0.18 },
    { x: 14, y: 25, w: 3, h: 1, a: 0.7 }
  ],
  desk: [
    { x: 0, y: 0, w: 44, h: 2, a: 0.16 },
    { x: 1, y: 0, w: 5, h: 1, a: 0.8 },
    { x: 8, y: 0, w: 12, h: 1, a: 1, gold: true },
    { x: 0, y: 3, w: 44, h: 1, kind: "lines", gap: 1, a: 0.3 },
    { x: 1, y: 5, w: 24, h: 13, a: 0.14 },
    { x: 2, y: 7, w: 22, h: 10, kind: "bars", seed: [5, 6, 4, 7, 8, 6, 9, 7, 10, 8, 11, 9] },
    { x: 26, y: 5, w: 17, h: 5, a: 0.14 },
    { x: 27, y: 7, w: 8, h: 1, a: 1, gold: true },
    { x: 26, y: 11, w: 8, h: 16, a: 0.12 },
    { x: 27, y: 12, w: 6, h: 14, kind: "lines", gap: 2, a: 0.45 },
    { x: 35, y: 11, w: 8, h: 16, a: 0.12 },
    { x: 36, y: 12, w: 6, h: 14, kind: "lines", gap: 1, a: 0.3 },
    { x: 1, y: 19, w: 12, h: 8, a: 0.14 },
    { x: 2, y: 20, w: 10, h: 6, kind: "lines", gap: 2, a: 0.4 },
    { x: 14, y: 19, w: 11, h: 8, a: 0.14 },
    { x: 15, y: 25, w: 9, h: 1, a: 1, gold: true }
  ],
  feed: [
    { x: 0, y: 0, w: 6, h: 28, a: 0.14 },
    { x: 2, y: 2, w: 2, h: 1, a: 1, gold: true },
    { x: 2, y: 5, w: 2, h: 1, a: 0.5 },
    { x: 2, y: 8, w: 2, h: 1, a: 0.5 },
    { x: 2, y: 11, w: 2, h: 1, a: 0.5 },
    { x: 1, y: 22, w: 4, h: 2, a: 1, gold: true },
    { x: 8, y: 1, w: 22, h: 3, a: 0.14 },
    { x: 9, y: 2, w: 9, h: 1, a: 0.6 },
    { x: 8, y: 6, w: 2, h: 2, a: 0.7 },
    { x: 11, y: 6, w: 6, h: 1, a: 0.85 },
    { x: 11, y: 8, w: 17, h: 1, a: 0.4 },
    { x: 8, y: 11, w: 2, h: 2, a: 0.7 },
    { x: 11, y: 11, w: 5, h: 1, a: 0.85 },
    { x: 11, y: 13, w: 18, h: 5, a: 0.16 },
    { x: 20, y: 14, w: 3, h: 2, a: 1, gold: true },
    { x: 8, y: 21, w: 2, h: 2, a: 0.7 },
    { x: 11, y: 21, w: 7, h: 1, a: 0.85 },
    { x: 11, y: 23, w: 15, h: 1, a: 0.4 },
    { x: 11, y: 25, w: 12, h: 1, a: 0.4 },
    { x: 32, y: 1, w: 12, h: 12, a: 0.12 },
    { x: 33, y: 3, w: 9, h: 9, kind: "lines", gap: 2, a: 0.45 },
    { x: 32, y: 15, w: 12, h: 12, a: 0.12 },
    { x: 33, y: 17, w: 10, h: 8, kind: "lines", gap: 3, a: 0.35 },
    { x: 33, y: 17, w: 2, h: 1, a: 1, gold: true }
  ],
  folio: [
    { x: 0, y: 0, w: 44, h: 1, a: 0.14 },
    { x: 1, y: 0, w: 4, h: 1, a: 0.8 },
    { x: 2, y: 5, w: 22, h: 3, a: 0.95 },
    { x: 2, y: 9, w: 17, h: 3, a: 0.95 },
    { x: 20, y: 9, w: 8, h: 3, a: 1, gold: true },
    { x: 2, y: 14, w: 12, h: 1, a: 0.4 },
    { x: 31, y: 3, w: 11, h: 12, a: 0.22 },
    { x: 33, y: 6, w: 6, h: 6, a: 0.5 },
    { x: 26, y: 16, w: 8, h: 7, a: 0.18 },
    { x: 36, y: 18, w: 7, h: 5, a: 1, gold: true },
    { x: 2, y: 18, w: 20, h: 9, kind: "lines", gap: 3, a: 0.3 },
    { x: 0, y: 26, w: 44, h: 2, a: 0.12 }
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
      const breathe = still ? 0 : Math.round(Math.sin(t / (dim ? 1400 : 900) + b.col * 0.6) * 0.6);
      const height2 = Math.max(1, b.height + breathe);
      for (let k = 0; k < height2; k++) live[(b.base - k) * COLS + b.col] = b.last ? 2 : 0.85;
    }
    for (let row = 0; row < ROWS; row++) {
      for (let c = 0; c < COLS; c++) {
        const i = row * COLS + c;
        const reveal = Math.min(1, Math.max(0, (age - (c + row) * 22) / 500));
        let a = Math.max(cells[i], live[i] > 1 ? 1 : live[i]);
        let g = gold[i] || live[i] > 1;
        if (!still) {
          if (g) a *= 0.72 + 0.28 * Math.sin(t / 520 + i * 1.7);
          else if (cells[i] > 0.1) a *= 0.82 + 0.18 * Math.sin(t / 760 + i * 2.3);
        }
        const x = c * pitch + pitch / 2;
        const y = row * pitch + pitch / 2;
        if (mouse && !dim) {
          const d = Math.hypot(mouse.x - x, mouse.y - y);
          if (d < 64) a = Math.max(a, 0.12) + (1 - d / 64) * 0.4;
        }
        const base = 0.06;
        const alpha = dim ? base + a * 0.3 : base + a * 0.9 * reveal;
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
    if (still) draw(performance.now());
    else frame = requestAnimationFrame(loop);
    onCleanup(() => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(frame); });
  });
  return box;
}

const EDITIONS = {
  "01": {
    no: "No. 01", name: "Meridian", kind: "Revenue and customer console", href: "/meridian/",
    summary: "A complete back office for a subscription business: revenue, customers, billing, support and the team, in one app.",
    rows: [
      ["Screens", "Overview, Customers, a customer page with six tabs, Plans and billing, Invoices, Inbox, Team with an audit log, and Settings with seven sections."],
      ["Data", "2,385 customers, 11,771 invoices, 1,460 support conversations and 3,240 audit events, across 18 months of history."],
      ["Feel", "A flush sidebar with sub-rails, warm grey and blue. Light, dark and system themes."],
      ["Built with", "Lucid UI only. Plain ES modules, no build step. About 2,500 lines of JavaScript and 650 of CSS."],
      ["Works", "Phone to desktop, keyboard and ⌘K, Undo on every change, previews for each role."],
      ["You get", "The full source, a guide for AI agents, a README, a commercial licence and updates."],
      ["Not included", "A backend, sign-in or real payments. The data is generated in the browser; connect your own API in one file."]
    ]
  },
  "02": {
    no: "No. 02", name: "Nightjar", kind: "AI operations console", href: "/nightjar/",
    summary: "The console behind an AI platform: live traffic, every run and its trace, model routing, prompts, evals, keys and alerts.",
    rows: [
      ["Screens", "Pulse, Runs with a trace inspector, Customers, Models and routing, Prompts with version diffs, Evals, Keys and limits, Alerts and Settings."],
      ["Data", "24,000 runs with step-by-step traces, 140 customers, 202 API keys, 8 models from 4 providers, 90 days of traffic and 14 prompts with history."],
      ["Feel", "A floating dock and a three-panel run explorer, violet night and lilac paper, with an iridescent accent."],
      ["Built with", "Lucid UI only. Plain ES modules, no build step. About 1,500 lines of JavaScript and 600 of CSS."],
      ["Works", "Phone to desktop, keyboard and ⌘K, Undo on every change, live counters and a streaming run feed."],
      ["You get", "The full source, a guide for AI agents, a README, a commercial licence and updates."],
      ["Not included", "Real model calls or a log pipeline. Point it at your gateway's runs and usage, one file to change."]
    ]
  },
  "03": {
    no: "No. 03", name: "Relay", kind: "Multi-agent workflow builder", href: "/relay/",
    summary: "A canvas for wiring agents, tools and people into one flow, then seeing what every handoff costs and where work goes in circles.",
    rows: [
      ["Screens", "Overview, a full canvas editor, Flows, Runs with a path panel, Contracts, a Library of blocks, Insights and Workspace with members and billing."],
      ["Data", "6 flows, 6,001 runs with full paths, cost and traffic on every handoff, 6 contracts with 30 days of replay and 24 building blocks."],
      ["Feel", "A soft rail with nested flows, porcelain grey and deep teal-slate, roomy cards and nodes with real depth."],
      ["Built with", "Lucid UI only. Plain ES modules, no build step. About 1,400 lines of JavaScript and 500 of CSS."],
      ["Works", "Drag, connect, multi-select and nudge; pan, zoom and minimap; Undo on every change; run replay step by step; phone to desktop."],
      ["You get", "The full source, a guide for AI agents, a README, a commercial licence and updates."],
      ["Not included", "An agent runtime or real model calls. Feed it your own flows and run logs; one file to change."]
    ]
  },
  "04": {
    no: "No. 04", name: "Ledgerline", kind: "Market terminal", href: "/ledgerline/",
    summary: "A trading and research terminal where every tool is a panel you drag, resize, link and save into workspaces.",
    rows: [
      ["Screens", "One desk of 14 panels: Chart, Quote, Watchlist, Movers, Heatmap, Macro strip, Order ticket, Order book, Time and sales, Positions, Orders, News, Economic calendar and Alerts."],
      ["Data", "50 instruments ticking live every second, a year of daily history, today's minute bars, 120 headlines, 46 orders, 12 positions and an economic calendar."],
      ["Feel", "A masthead with a command line, a scrolling ticker tape, a panel library on the right, midnight navy and cream paper, dense mono figures."],
      ["Built with", "Lucid UI only. Plain ES modules, no build step. About 1,100 lines of JavaScript and 400 of CSS."],
      ["Works", "Drag, resize, maximise and close panels; colour link groups; saved workspaces on F1 to F9; a command line; Undo for layout and orders; phone to desktop."],
      ["You get", "The full source, a guide for AI agents, a README, a commercial licence and updates."],
      ["Not included", "A market data feed or a broker. Swap the seeded market and the order actions for your own APIs; two files to change."]
    ]
  },
  "05": {
    no: "No. 05", name: "Murmur", kind: "Microblog, rethought", href: "/murmur/",
    summary: "A calmer social app built around the original question, “what are you doing?”: now lines, a feed that ends, lenses instead of an algorithm.",
    rows: [
      ["Screens", "Home with four lenses, a conversation pane, Explore with topics, Notifications, Messages, Profiles with a year of activity, Saved and Settings."],
      ["Data", "50 people and a year of history: about 13,500 murmurs with threads, quotes, polls, pictures and links, 140 notifications and 12 message threads."],
      ["Feel", "A floating icon dock, a full-width feed, a Now column that turns into the conversation, sage paper and moss night with a lime accent."],
      ["Built with", "Lucid UI only. Plain ES modules, no build step. About 1,200 lines of JavaScript and 450 of CSS, plus a custom icon set."],
      ["Works", "Live new murmurs, a caught-up line, quiet numbers, fleeting posts, a composer with polls and pictures, Undo on everything, phone to wide screen."],
      ["You get", "The full source, a guide for AI agents, a README, a commercial licence and updates."],
      ["Not included", "Accounts, a backend or real-time delivery. Point the store at your API; one file to change."]
    ]
  },
  "06": {
    no: "No. 06", name: "Vesper", kind: "Studio portfolio", href: "/vesper/",
    summary: "A cinematic portfolio for a creative studio: oversized type, layered parallax artwork, a pinned reel and twelve case studies that each wear their own colours.",
    rows: [
      ["Pages", "Home, Work with grid and list views, twelve case studies, Studio, Services, a Journal with twelve articles, and Contact."],
      ["Content", "12 projects with briefs, results and credits, 16 people, 24 clients, 14 awards, 12 articles and three offices with live local times."],
      ["Feel", "Blush paper and deep espresso with a signal-blue accent, Bricolage Grotesque headlines and Instrument Serif italics."],
      ["Motion", "Split-type reveals, depth parallax, a pinned horizontal reel, a labelled cursor, magnetic buttons and a circular menu reveal. All of it respects reduced motion."],
      ["Built with", "Lucid UI only. Plain ES modules, no build step. About 800 lines of JavaScript and 500 of CSS, with generated artwork instead of stock photos."],
      ["You get", "The full source, a guide for AI agents, a README, a commercial licence and updates."],
      ["Not included", "A CMS or real photography. Content lives in one data file, and the artwork swaps for your images in one place."]
    ]
  }
};

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
  { key: "01", no: "No. 01", name: "Meridian", layout: "console", state: "Live preview", now: true },
  { key: "02", no: "No. 02", name: "Nightjar", layout: "ops", state: "Live preview", now: true },
  { key: "03", no: "No. 03", name: "Relay", layout: "flow", state: "Live preview", now: true },
  { key: "04", no: "No. 04", name: "Ledgerline", layout: "desk", state: "Live preview", now: true },
  { key: "05", no: "No. 05", name: "Murmur", layout: "feed", state: "Live preview", now: true },
  { key: "06", no: "No. 06", name: "Vesper", layout: "folio", state: "Live preview", now: true }
];

const picked = signal("01");

function Picker() {
  const plate = computed(() => PLATES.find(p => p.key === picked.value));
  const ed = computed(() => EDITIONS[picked.value]);
  const options = [];
  const choose = (key, focus) => {
    picked.value = key;
    if (focus) options.find(o => o.dataset.key === key)?.focus();
  };
  const onKey = e => {
    const i = PLATES.findIndex(p => p.key === picked.peek());
    const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: PLATES.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    choose(PLATES[(next + PLATES.length) % PLATES.length].key, true);
  };
  return h("div", { class: "ed-picker" },
    h("div", { class: "ed-stage" },
      h("a", { class: "ed-screen", href: () => ed.value.href, aria: { label: () => `Open the live preview of ${ed.value.name}` } },
        () => { const p = plate.value; return untrack(() => h("div", { class: "ed-screen-plate", key: p.key }, Plate({ layout: p.layout, label: `A sketch of ${EDITIONS[p.key].name}, drawn in dots` }))); },
        h("div", { class: "ed-screen-top" }, h("span", { class: "ed-no" }, () => `${plate.value.no} · ${plate.value.name}`), h("span", { class: "ed-plate-state" }, h("i"), "Live preview")),
        h("span", { class: "ed-screen-play" }, h("span", { class: "ed-play-icon" }, Icon({ name: "arrow-up-right", size: 18 })), h("span", "Open the live preview"))),
      h("div", { class: "ed-stage-info", "aria-live": "polite" }, () => {
        const e = ed.value;
        return h("div", { class: "ed-info", key: picked.value },
          h("div", { class: "ed-info-head" },
            h("div", h("h3", e.name), h("p", e.kind)),
            Button({ variant: "primary", href: e.href, iconRight: "arrow-up-right" }, "Live preview")),
          h("p", { class: "ed-info-summary" }, e.summary),
          h("dl", { class: "ed-info-rows" }, e.rows.map(([k, v], i) => h("div", { style: { "--i": i } }, h("dt", k), h("dd", v)))));
      })),
    h("div", { class: "ed-list-wrap" },
      h("div", { class: "ed-list-head" }, h("b", "All Editions"), h("span", `${PLATES.length} live`)),
      h("div", { class: "ed-list", role: "listbox", aria: { label: "Editions", orientation: "vertical" }, onKeydown: onKey },
        PLATES.map((p, i) => {
          const e = EDITIONS[p.key];
          const opt = h("div", {
            class: "ed-item", role: "option", tabindex: () => (picked.value === p.key ? 0 : -1), "data-key": p.key,
            "aria-selected": () => String(picked.value === p.key), onClick: () => choose(p.key), style: { "--i": i }
          },
            h("div", { class: "ed-item-thumb", "aria-hidden": "true" }, Plate({ layout: p.layout, label: `${p.name}` }), h("span", { class: "ed-item-n" }, p.no.replace("No. ", ""))),
            h("div", { class: "ed-item-text" }, h("b", p.name), h("span", e.kind), h("small", h("i"), "Live preview")));
          options.push(opt);
          return opt;
        }))));
}

function Collection(L) {
  return h("section", { class: "ed-collection", id: "collection" },
    h("div", { class: "ed-wrap" },
      Head("The collection", "Numbered, and released one at a time.", "Each Edition is designed, built and tested before the next one starts. Pick one to see exactly what you get."),
      Picker()));
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
