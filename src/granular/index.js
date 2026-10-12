const PANEL = { color: "ink", fill: 0.016, hover: 0.024, edge: 2, edgeFill: 0.3, cursor: 0.95, reach: 150 };

const MATERIALS = [
  { match: '.lucid-btn[data-variant="primary"]', color: "primary", fill: 0.84, hover: 0.96, cursor: 0.2, reach: 80 },
  { match: '.lucid-btn[data-variant="accent"]', color: "accent", fill: 0.84, hover: 0.96, cursor: 0.2, reach: 80 },
  { match: '.lucid-btn[data-variant="danger"]', color: "danger", fill: 0.1, hover: 0.24, edge: 1, edgeFill: 0.85, cursor: 0.5 },
  { match: '.lucid-btn[data-variant="ghost"]', color: "ink", fill: 0, hover: 0.12, cursor: 0.22, reach: 60 },
  { match: ".lucid-btn", color: "ink", fill: 0.05, hover: 0.15, edge: 1, edgeFill: 0.42, cursor: 0.6 },
  { match: ".lucid-switch-track", color: "ink", fill: 0.24, cursor: 0.3, checked: { color: "accent", fill: 0.86 } },
  { match: ".lucid-check-box", color: "ink", fill: 0.03, edge: 1, edgeFill: 0.42, cursor: 0.4, checked: { color: "accent", fill: 0.86, edge: 0 } },
  { match: ".lucid-input", color: "ink", fill: 0.02, hover: 0.035, edge: 1, edgeFill: 0.36, cursor: 0.5, focus: true },
  { match: ".lucid-seg", color: "ink", fill: 0.04, edge: 1, edgeFill: 0.32, cursor: 0.4 },
  { match: ".lucid-seg-thumb", color: "ink", fill: 0.14, edge: 1, edgeFill: 0.42, cursor: 0.3 },
  { match: ".lucid-badge, .lucid-kbd", color: "ink", fill: 0.12, edge: 1, edgeFill: 0.55, cursor: 0.3, reach: 60 },
  { match: ".lucid-card, .lucid-section-body", ...PANEL },
  { match: ".lucid-pop, .lucid-dialog, .lucid-toast", ...PANEL, fill: 0.018, edgeFill: 0.55, cursor: 0.5, assemble: true },
  { match: '[data-granular="panel"]', ...PANEL },
  { match: '[data-granular="fill"]', color: "ink", fill: 0.5, hover: 0.62, cursor: 0.3 },
  { match: '[data-granular="accent"]', color: "accent", fill: 0.6, hover: 0.72, cursor: 0.3 }
];

const SELECTOR = MATERIALS.map(m => m.match).join(", ");
const TOKENS = { ink: "--lucid-ink", primary: "--lucid-primary", accent: "--lucid-accent", danger: "--lucid-danger" };
const TAU = Math.PI * 2;

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const roundedBox = (px, py, hw, hh, r) => {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export function granular({ root = document.querySelector(".lucid-app") ?? document.body, cell = 4, materials = [] } = {}) {
  const all = [...materials, ...MATERIALS];
  const selector = [...materials.map(m => m.match), SELECTOR].join(", ");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const states = new Map();
  const colors = {};
  let pointer = null;
  let raf = 0;
  let stopped = false;

  root.classList.add("lucid-granular", "lucid-granular-live");

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  root.append(probe);
  const readColors = () => {
    for (const [key, token] of Object.entries(TOKENS)) {
      probe.style.color = `var(${token})`;
      colors[key] = getComputedStyle(probe).color;
    }
    for (const s of states.values()) s.dirty = true;
    wake();
  };

  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const s = states.get(entry.target);
      if (!s) continue;
      s.visible = entry.isIntersecting;
      s.dirty = true;
      if (!s.visible) { s.canvas.width = 0; s.canvas.height = 0; }
    }
    wake();
  }, { rootMargin: "120px" });

  const sizing = new ResizeObserver(entries => {
    for (const entry of entries) { const s = states.get(entry.target); if (s) s.dirty = true; }
    wake();
  });

  const attach = el => {
    if (states.has(el) || el.tagName === "TEXTAREA" || el.tagName === "INPUT" || !el.isConnected) return;
    const material = all.find(m => el.matches(m.match));
    if (!material) return;
    const canvas = document.createElement("canvas");
    canvas.className = "lucid-grain-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.setAttribute("data-grain", "");
    el.prepend(canvas);
    const s = { el, material, canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, visible: false, dirty: true, drawn: -1e9, openAt: performance.now(), wasOpen: false, pressAt: 0 };
    states.set(el, s);
    visibility.observe(el);
    sizing.observe(el);
  };

  const detach = s => {
    visibility.unobserve(s.el);
    sizing.unobserve(s.el);
    s.canvas.remove();
    s.el.removeAttribute("data-grain");
    states.delete(s.el);
  };

  const scan = node => {
    if (node.nodeType !== 1) return;
    if (node.matches(selector)) attach(node);
    for (const el of node.querySelectorAll(selector)) attach(el);
  };

  const mutations = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) scan(node);
    wake();
  });

  const theme = new MutationObserver(readColors);

  const onMove = event => { pointer = { x: event.clientX, y: event.clientY }; wake(); };
  const onLeave = () => { pointer = null; wake(); };
  const onDown = event => {
    const target = event.target.closest?.("[data-grain]");
    const s = target && states.get(target);
    if (s) { s.pressAt = performance.now(); s.dirty = true; wake(); }
  };
  const onUp = () => { for (const s of states.values()) if (s.pressAt) { s.pressAt = 0; s.dirty = true; } wake(); };
  const onScheme = () => readColors();

  function stateOf(s) {
    const el = s.el;
    const label = el.closest(".lucid-check");
    const input = label?.querySelector("input");
    const checked = Boolean(input?.checked);
    const disabled = el.matches(":disabled, [aria-disabled='true']") || Boolean(input?.disabled);
    const hover = (label ?? el).matches(":hover");
    const focus = el.matches(":focus-within");
    let open = true;
    try { open = el.matches("[open], :popover-open") || !el.matches("dialog, [popover]"); } catch { open = el.matches("[open]") || !el.matches("dialog, [popover]"); }
    const loading = el.hasAttribute("data-loading");
    return { checked, disabled, hover, focus, open, loading };
  }

  function draw(s, t, st, rect) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = rect.width;
    const h = rect.height;
    if (Math.round(w * dpr) !== s.canvas.width || Math.round(h * dpr) !== s.canvas.height) {
      s.canvas.width = Math.round(w * dpr);
      s.canvas.height = Math.round(h * dpr);
    }
    s.w = w; s.h = h;
    const ctx = s.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (w < 2 || h < 2) return;
    const base = s.material;
    const m = st.checked && base.checked ? { ...base, ...base.checked } : base;
    const radius = Math.min(parseFloat(getComputedStyle(s.el).borderTopLeftRadius) || 0, w / 2, h / 2);
    const moving = !still.matches;
    const fill = (st.hover ? m.hover ?? m.fill : m.fill) * (st.disabled ? 0.45 : 1);
    const edgeRings = m.edge ?? 0;
    const edgeFill = (m.edgeFill ?? 0) * (st.hover ? 1.15 : 1) * (st.disabled ? 0.5 : 1);
    const reach = m.reach ?? 100;
    const px = pointer && moving ? pointer.x - rect.left : -1e5;
    const py = pointer && moving ? pointer.y - rect.top : -1e5;
    const press = s.pressAt ? ease((t - s.pressAt) / 160) : 0;
    const appear = m.assemble && moving ? ease((t - s.openAt) / 520) : 1;
    const half = cell / 2;
    const cx = w / 2;
    const cy = h / 2;
    const perimeter = 2 * (w + h);
    ctx.fillStyle = colors[m.color] ?? colors.ink;
    ctx.beginPath();
    for (let y = half; y < h; y += cell) {
      for (let x = half; x < w; x += cell) {
        const d = roundedBox(x - cx, y - cy, cx, cy, radius);
        if (d > 0) continue;
        const n = hash(x, y);
        if (n > appear * 1.02) continue;
        const ring = Math.floor(-d / cell);
        const edge = ring < edgeRings ? 1 - ring / edgeRings : 0;
        let v = fill + edge * edgeFill;
        const dx = x - px;
        const dy = y - py;
        const near = Math.exp(-(dx * dx + dy * dy) / (reach * reach));
        v += near * (m.cursor ?? 0) * (edge ? 1 : fill > 0.3 ? 0.4 : Math.min(0.26, 0.29 - fill));
        if (moving) v *= 1 + 0.16 * Math.sin(t * 0.0022 + n * 40);
        if (st.focus && m.focus && edge) v += 0.45 * (0.5 + 0.5 * Math.sin((Math.atan2(y - cy, x - cx) / TAU) * perimeter / 9 - t * 0.008));
        if (st.loading) v *= 0.5 + 0.5 * Math.sin(x * 0.11 - t * 0.009);
        if (v <= 0.02) continue;
        let r;
        if (v < 0.3) {
          if (hash(y, x) > v / 0.3) continue;
          r = half * (edge ? 0.46 : 0.3);
        } else {
          r = half * Math.min(1.45, Math.sqrt(v) * 1.24);
        }
        const squeeze = 1 - press * 0.07;
        const gx = cx + (x - cx) * squeeze;
        const gy = cy + (y - cy) * squeeze;
        ctx.moveTo(gx + r, gy);
        ctx.arc(gx, gy, r, 0, TAU);
      }
    }
    ctx.fill();
  }

  function frame(t) {
    raf = 0;
    if (stopped) return;
    const moving = !still.matches;
    let busy = false;
    for (const s of states.values()) {
      if (!s.el.isConnected) { detach(s); continue; }
      if (!s.canvas.isConnected) s.el.prepend(s.canvas);
      if (!s.visible) continue;
      const st = stateOf(s);
      if (st.open && !s.wasOpen) { s.openAt = t; s.dirty = true; }
      s.wasOpen = st.open;
      const rect = s.el.getBoundingClientRect();
      const reach = (s.material.reach ?? 100) * 1.6;
      const near = moving && pointer && pointer.x > rect.left - reach && pointer.x < rect.right + reach && pointer.y > rect.top - reach && pointer.y < rect.bottom + reach;
      const key = `${st.checked}${st.disabled}${st.hover}${st.focus}${st.loading}`;
      if (key !== s.key) { s.key = key; s.dirty = true; }
      const animating = moving && (near || s.pressAt || st.focus && s.material.focus || st.loading || t - s.openAt < 560);
      const ambient = moving && t - s.drawn > 110;
      if (s.dirty || animating || ambient || near !== s.near) {
        draw(s, t, st, rect);
        s.drawn = t;
        s.dirty = false;
      }
      s.near = near;
      if (animating) busy = true;
    }
    if ((moving || busy) && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (!raf && !stopped) raf = requestAnimationFrame(frame);
  }

  readColors();
  scan(root);
  mutations.observe(root, { childList: true, subtree: true });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  theme.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onScheme);
  still.addEventListener("change", wake);
  addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointerup", onUp, true);
  addEventListener("pointercancel", onUp, true);
  document.addEventListener("visibilitychange", wake);
  wake();

  return function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    mutations.disconnect();
    theme.disconnect();
    visibility.disconnect();
    sizing.disconnect();
    matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", onScheme);
    still.removeEventListener("change", wake);
    removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    removeEventListener("pointerdown", onDown, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onUp, true);
    document.removeEventListener("visibilitychange", wake);
    for (const s of [...states.values()]) detach(s);
    probe.remove();
    root.classList.remove("lucid-granular-live");
  };
}
